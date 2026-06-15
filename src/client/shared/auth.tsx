import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { LogIn, LogOut, ShieldCheck } from 'lucide-react'

const DEFAULT_API_BASE_URL = 'http://localhost:5156'
const AUTH_STORAGE_KEY = 'koala-eats-auth-session'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API_BASE_URL

export type AppRole = 'Customer' | 'Merchant' | 'Rider' | 'Admin'

type AuthenticatedUser = {
  id: string
  email: string
  displayName: string
  role: AppRole
}

type AuthSession = {
  accessToken: string
  expiresAtUtc: string
  user: AuthenticatedUser
}

type AuthApiResponse<T> = {
  code: string
  message: string
  data: T
}

const demoCredentials: Record<AppRole, { email: string; password: string }> = {
  Admin: { email: 'admin@koala.test', password: 'Admin#2026' },
  Customer: { email: 'customer@koala.test', password: 'Customer#2026' },
  Merchant: { email: 'merchant@koala.test', password: 'Merchant#2026' },
  Rider: { email: 'rider@koala.test', password: 'Rider#2026' },
}

const roleLabels: Record<AppRole, string> = {
  Admin: '平台管理员',
  Customer: '用户',
  Merchant: '商家',
  Rider: '骑手',
}

export function getAuthToken(): string {
  return readAuthSession()?.accessToken ?? ''
}

function readAuthSession(): AuthSession | null {
  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!rawSession) {
    return null
  }

  try {
    const session = JSON.parse(rawSession) as AuthSession
    if (new Date(session.expiresAtUtc).getTime() <= Date.now()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }

    return session
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

function writeAuthSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

function clearAuthSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

async function authRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  const payload = (await response.json()) as AuthApiResponse<T>

  if (!response.ok || payload.code !== 'OK') {
    throw new Error(payload.message || `Auth request failed: ${path}`)
  }

  return payload.data
}

async function login(role: AppRole, email: string, password: string): Promise<AuthSession> {
  return authRequest<AuthSession>('/api/auth/login', {
    body: JSON.stringify({ email, password, role }),
    method: 'POST',
  })
}

async function getCurrentUser(token: string): Promise<AuthenticatedUser> {
  return authRequest<AuthenticatedUser>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

type AuthGateProps = {
  children: ReactNode
  productName: string
  role: AppRole
}

export function AuthGate({ children, productName, role }: AuthGateProps) {
  const defaultCredentials = demoCredentials[role]
  const [email, setEmail] = useState(defaultCredentials.email)
  const [errorMessage, setErrorMessage] = useState('')
  const [isChecking, setIsChecking] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [password, setPassword] = useState(defaultCredentials.password)
  const [session, setSession] = useState<AuthSession | null>(null)

  useEffect(() => {
    let isActive = true

    async function verifySession() {
      const storedSession = readAuthSession()
      if (!storedSession) {
        if (isActive) {
          setIsChecking(false)
        }
        return
      }

      try {
        const user = await getCurrentUser(storedSession.accessToken)
        if (!isActive) {
          return
        }

        if (user.role !== role) {
          clearAuthSession()
          setSession(null)
          setErrorMessage('当前账号角色不能进入这个端。')
        } else {
          setSession({ ...storedSession, user })
          setErrorMessage('')
        }
      } catch (error) {
        clearAuthSession()
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : '登录状态已失效')
        }
      } finally {
        if (isActive) {
          setIsChecking(false)
        }
      }
    }

    void verifySession()

    return () => {
      isActive = false
    }
  }, [role])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const nextSession = await login(role, email, password)
      writeAuthSession(nextSession)
      setSession(nextSession)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  function logout() {
    clearAuthSession()
    setSession(null)
  }

  if (isChecking) {
    return <main className="auth-shell">正在校验登录状态...</main>
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <form className="auth-card" onSubmit={(event) => void handleSubmit(event)}>
          <div className="auth-mark">
            <ShieldCheck size={26} strokeWidth={2.4} />
          </div>
          <p className="eyebrow">{roleLabels[role]}</p>
          <h1>{productName}</h1>
          <label>
            邮箱
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {errorMessage && <div className="mock-alert">{errorMessage}</div>}
          <button className="primary-button" disabled={isSubmitting} type="submit">
            <LogIn size={18} strokeWidth={2.4} />
            {isSubmitting ? '登录中' : '登录'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <>
      <div className="auth-bar">
        <span>
          {session.user.displayName} · {roleLabels[session.user.role]}
        </span>
        <button onClick={logout} type="button">
          <LogOut size={16} strokeWidth={2.4} />
          退出
        </button>
      </div>
      {children}
    </>
  )
}
