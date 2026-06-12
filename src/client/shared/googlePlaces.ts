import type { GoogleResolvedAddress } from './types'

type GooglePlacesLibrary = {
  AutocompleteSessionToken: new () => unknown
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: Record<string, unknown>) => Promise<{
      suggestions: GoogleAutocompleteSuggestion[]
    }>
  }
}

type GoogleMapsApi = {
  maps?: {
    importLibrary?: (name: string) => Promise<unknown>
  }
}

export type GoogleAutocompleteSuggestion = {
  placePrediction?: {
    mainText?: { text?: string; toString: () => string }
    secondaryText?: { text?: string; toString: () => string }
    placeId: string
    text: { text?: string; toString: () => string }
    toPlace: () => {
      displayName?: string | { text?: string; toString: () => string }
      formattedAddress?: string
      location?: { lat: () => number; lng: () => number }
      fetchFields: (options: { fields: string[] }) => Promise<void>
    }
  }
}

const GOOGLE_MAPS_SCRIPT_ID = 'koala-google-maps-js'
const NZ_LOCATION_RESTRICTION = {
  east: 179.5,
  north: -34,
  south: -47.5,
  west: 166,
}

let googleMapsPromise: Promise<void> | null = null

function getGoogleMapsApiKey(): string {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''
}

export function hasGoogleMapsApiKey(): boolean {
  return getGoogleMapsApiKey().trim().length > 0
}

export async function loadGooglePlacesLibrary(): Promise<GooglePlacesLibrary> {
  const apiKey = getGoogleMapsApiKey().trim()

  if (!apiKey) {
    throw new Error('VITE_GOOGLE_MAPS_API_KEY is not configured')
  }

  await loadGoogleMapsScript(apiKey)

  const googleApi = (window as unknown as { google?: GoogleMapsApi }).google

  if (!googleApi?.maps?.importLibrary) {
    throw new Error('Google Maps JavaScript API did not expose importLibrary')
  }

  return (await googleApi.maps.importLibrary('places')) as GooglePlacesLibrary
}

export function createAutocompleteRequest(input: string, sessionToken: unknown) {
  return {
    includedRegionCodes: ['nz'],
    input,
    language: 'en-NZ',
    locationRestriction: NZ_LOCATION_RESTRICTION,
    region: 'nz',
    sessionToken,
  }
}

export async function resolveGoogleAddress(
  suggestion: GoogleAutocompleteSuggestion,
): Promise<GoogleResolvedAddress | null> {
  const prediction = suggestion.placePrediction

  if (!prediction) {
    return null
  }

  const place = prediction.toPlace()
  await place.fetchFields({
    fields: ['displayName', 'formattedAddress', 'location'],
  })

  const location = place.location

  if (!location || !place.formattedAddress) {
    return null
  }

  const displayName =
    typeof place.displayName === 'string'
      ? place.displayName
      : place.displayName?.text ?? place.displayName?.toString() ?? prediction.mainText?.toString() ?? ''

  return {
    coordinates: {
      latitude: location.lat(),
      longitude: location.lng(),
    },
    displayName,
    formattedAddress: place.formattedAddress,
    placeId: prediction.placeId,
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  const googleApi = (window as unknown as { google?: GoogleMapsApi }).google

  if (googleApi?.maps?.importLibrary) {
    return Promise.resolve()
  }

  if (googleMapsPromise) {
    return googleMapsPromise
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Google Maps script failed to load')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    const params = new URLSearchParams({
      key: apiKey,
      language: 'en-NZ',
      libraries: 'places',
      loading: 'async',
      region: 'NZ',
      v: 'weekly',
    })

    script.async = true
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Google Maps script failed to load')), {
      once: true,
    })
    document.head.appendChild(script)
  })

  return googleMapsPromise
}
