import { useEffect, useRef, useState } from 'react'
import { hasGoogleMapsApiKey, loadGoogleMapsMapLibrary } from './googlePlaces'
import type { Coordinates } from './types'

type GoogleDeliveryMapProps = {
  dropoffLocation: Coordinates
  pickupLocation: Coordinates
  riderLocation: Coordinates
}

export function GoogleDeliveryMap({
  dropoffLocation,
  pickupLocation,
  riderLocation,
}: GoogleDeliveryMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null)
  const [isMapReady, setIsMapReady] = useState(false)

  useEffect(() => {
    let isActive = true

    async function renderMap() {
      if (!hasGoogleMapsApiKey() || !mapElementRef.current) {
        return
      }

      const maps = await loadGoogleMapsMapLibrary()
      const center = {
        lat: riderLocation.latitude,
        lng: riderLocation.longitude,
      }

      new maps.Map(mapElementRef.current, {
        center,
        clickableIcons: false,
        disableDefaultUI: true,
        gestureHandling: 'none',
        keyboardShortcuts: false,
        zoom: 15,
      })

      if (isActive) {
        setIsMapReady(true)
      }
    }

    void renderMap().catch(() => {
      if (isActive) {
        setIsMapReady(false)
      }
    })

    return () => {
      isActive = false
    }
  }, [dropoffLocation, pickupLocation, riderLocation])

  return (
    <>
      <div className={isMapReady ? 'google-map-surface ready' : 'google-map-surface'} ref={mapElementRef} />
      <div className="map-road road-main"></div>
      <div className="map-road road-side"></div>
      <div className="route-line"></div>
      <span className="pin store-pin">店</span>
      <span className="pin rider-pin">骑</span>
      <span className="pin home-pin">收</span>
    </>
  )
}
