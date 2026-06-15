import type {
  AccountRecord,
  CreateMockOrderInput,
  DeliveryArea,
  DeliveryTask,
  DeliveryTaskStatus,
  MerchantApplication,
  MerchantMenuItem,
  MerchantOrder,
  MerchantOrderStatus,
  MerchantStoreProfile,
  MockBusinessState,
  PlatformOrder,
} from './types'
import { getAuthToken } from './auth'

const DEFAULT_API_BASE_URL = 'http://localhost:5156'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_API_BASE_URL

type MockApiResponse<T> = {
  code: string
  message: string
  data: T
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  const payload = (await response.json().catch(() => ({
    code: response.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR',
    data: null,
    message: response.status === 401 ? 'Please log in again' : `HTTP ${response.status}`,
  }))) as MockApiResponse<T>

  if (!response.ok || payload.code !== 'OK') {
    throw new Error(payload.message || `Mock API request failed: ${path}`)
  }

  return payload.data
}

async function mutateAndRefresh(path: string, init?: RequestInit): Promise<MockBusinessState> {
  await request<unknown>(path, init)
  return getMockBusinessState()
}

export async function getMockBusinessState(): Promise<MockBusinessState> {
  return request<MockBusinessState>('/api/mock/state')
}

export async function resetMockBusinessState(): Promise<MockBusinessState> {
  return request<MockBusinessState>('/api/mock/reset', { method: 'POST' })
}

export async function createMockOrder(input: CreateMockOrderInput): Promise<MockBusinessState> {
  return mutateAndRefresh('/api/customer/orders', {
    body: JSON.stringify(input),
    method: 'POST',
  })
}

export async function payMockOrder(orderId: string): Promise<MockBusinessState> {
  return mutateAndRefresh(`/api/customer/orders/${orderId}/mock-payment`, {
    method: 'POST',
  })
}

export async function cancelMockOrder(orderId: string): Promise<MockBusinessState> {
  return mutateAndRefresh(`/api/customer/orders/${orderId}/cancel`, {
    method: 'POST',
  })
}

export async function updateMockMerchantOrderStatus(
  orderId: string,
  status: MerchantOrderStatus,
): Promise<MockBusinessState> {
  return mutateAndRefresh(`/api/merchant/orders/${orderId}/status`, {
    body: JSON.stringify({ status }),
    method: 'PATCH',
  })
}

export async function updateMockMenuItem(input: MerchantMenuItem): Promise<MockBusinessState> {
  return mutateAndRefresh(`/api/merchant/menu-items/${input.id}`, {
    body: JSON.stringify(input),
    method: 'PATCH',
  })
}

export async function updateMockMerchantProfile(
  input: MerchantStoreProfile,
): Promise<MockBusinessState> {
  return mutateAndRefresh('/api/merchant/store-profile', {
    body: JSON.stringify(input),
    method: 'PATCH',
  })
}

export async function updateMockDeliveryStatus(
  deliveryId: string,
  status: DeliveryTaskStatus,
): Promise<MockBusinessState> {
  return mutateAndRefresh(`/api/rider/deliveries/${deliveryId}/status`, {
    body: JSON.stringify({ status }),
    method: 'PATCH',
  })
}

export async function reportMockDeliveryIssue(
  deliveryId: string,
  reason: string,
): Promise<MockBusinessState> {
  return mutateAndRefresh(`/api/rider/deliveries/${deliveryId}/issue`, {
    body: JSON.stringify({ reason }),
    method: 'PATCH',
  })
}

export async function updateMockMerchantApplicationStatus(
  applicationId: string,
  status: MerchantApplication['status'],
): Promise<MockBusinessState> {
  return mutateAndRefresh(`/api/admin/merchant-applications/${applicationId}/status`, {
    body: JSON.stringify({ status }),
    method: 'PATCH',
  })
}

export async function assignMockRider(orderId: string, riderName = 'Liam'): Promise<MockBusinessState> {
  return mutateAndRefresh(`/api/admin/orders/${orderId}/assign-rider`, {
    body: JSON.stringify({ riderName }),
    method: 'PATCH',
  })
}

export async function updateMockAccountStatus(
  accountId: string,
  status: AccountRecord['status'],
): Promise<MockBusinessState> {
  return mutateAndRefresh(`/api/admin/accounts/${accountId}/status`, {
    body: JSON.stringify({ status }),
    method: 'PATCH',
  })
}

export async function updateMockDeliveryArea(input: DeliveryArea): Promise<MockBusinessState> {
  return mutateAndRefresh(`/api/admin/delivery-areas/${input.id}`, {
    body: JSON.stringify(input),
    method: 'PATCH',
  })
}

export async function dismissMockPlatformOrder(orderId: string): Promise<MockBusinessState> {
  return mutateAndRefresh(`/api/admin/orders/${orderId}/dismiss`, { method: 'PATCH' })
}

export function useMockStateFallback(error: unknown): string {
  return error instanceof Error ? error.message : 'Mock API unavailable'
}
