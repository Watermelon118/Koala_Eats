import { useEffect, useState } from 'react'
import { getMockBusinessState, useMockStateFallback } from './mockApi'
import type { MockBusinessState } from './types'

const POLL_INTERVAL_MS = 1200

export function useMockBusinessState(initialState: MockBusinessState) {
  const [state, setState] = useState<MockBusinessState>(initialState)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true
    let timeoutId: number | undefined

    async function refresh() {
      try {
        const nextState = await getMockBusinessState()

        if (isActive) {
          setState(nextState)
          setErrorMessage('')
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(useMockStateFallback(error))
        }
      } finally {
        if (isActive) {
          timeoutId = window.setTimeout(refresh, POLL_INTERVAL_MS)
        }
      }
    }

    void refresh()

    return () => {
      isActive = false

      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  return { errorMessage, setState, state }
}
