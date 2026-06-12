import { useEffect, useRef, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import {
  createAutocompleteRequest,
  hasGoogleMapsApiKey,
  loadGooglePlacesLibrary,
  resolveGoogleAddress,
  type GoogleAutocompleteSuggestion,
} from './googlePlaces'
import type { GoogleResolvedAddress } from './types'

type GoogleAddressAutocompleteProps = {
  label: string
  placeholder: string
  initialValue?: string
  onSelect: (address: GoogleResolvedAddress) => void
}

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 260

export function GoogleAddressAutocomplete({
  label,
  placeholder,
  initialValue = '',
  onSelect,
}: GoogleAddressAutocompleteProps) {
  const [query, setQuery] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<GoogleAutocompleteSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const requestIdRef = useRef(0)
  const sessionTokenRef = useRef<unknown>(null)

  useEffect(() => {
    setQuery(initialValue)
  }, [initialValue])

  useEffect(() => {
    if (!hasGoogleMapsApiKey()) {
      setSuggestions([])
      setErrorMessage('请在本端 .env.local 配置 VITE_GOOGLE_MAPS_API_KEY')
      return
    }

    if (query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setErrorMessage('')
      return
    }

    const timeoutId = window.setTimeout(() => {
      void fetchSuggestions(query.trim())
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  async function fetchSuggestions(input: string) {
    const requestId = ++requestIdRef.current
    setIsLoading(true)
    setErrorMessage('')

    try {
      const { AutocompleteSessionToken, AutocompleteSuggestion } = await loadGooglePlacesLibrary()

      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new AutocompleteSessionToken()
      }

      const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions(
        createAutocompleteRequest(input, sessionTokenRef.current),
      )

      if (requestId === requestIdRef.current) {
        setSuggestions(response.suggestions.filter((suggestion) => suggestion.placePrediction))
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setErrorMessage(error instanceof Error ? error.message : 'Google 地址联想服务暂不可用')
        setSuggestions([])
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }

  async function selectSuggestion(suggestion: GoogleAutocompleteSuggestion) {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const address = await resolveGoogleAddress(suggestion)

      if (!address) {
        setErrorMessage('该地址缺少坐标或标准地址信息')
        return
      }

      setQuery(address.formattedAddress)
      setSuggestions([])
      sessionTokenRef.current = null
      onSelect(address)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '无法读取地址详情')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <label className="address-autocomplete">
      <span>{label}</span>
      <div className="address-input-wrap">
        <Search size={17} strokeWidth={2.4} />
        <input
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          type="text"
          value={query}
        />
        {isLoading && <small>查询中</small>}
      </div>

      {suggestions.length > 0 && (
        <div className="address-suggestions">
          {suggestions.map((suggestion) => {
            const prediction = suggestion.placePrediction

            if (!prediction) {
              return null
            }

            return (
              <button
                key={prediction.placeId}
                onClick={() => void selectSuggestion(suggestion)}
                type="button"
              >
                <MapPin size={17} strokeWidth={2.4} />
                <span>
                  <strong>{prediction.mainText?.toString() ?? prediction.text.toString()}</strong>
                  <small>{prediction.secondaryText?.toString() ?? 'New Zealand'}</small>
                </span>
              </button>
            )
          })}
          <p>Powered by Google · 仅显示 New Zealand 相关结果</p>
        </div>
      )}

      {errorMessage && <small className="address-error">{errorMessage}</small>}
    </label>
  )
}
