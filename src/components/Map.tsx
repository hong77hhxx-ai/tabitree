'use client'

import { useState, useRef } from 'react'
import Map, { Marker, MapLayerMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Pin } from '@/lib/supabase'
import { MapPin, Utensils, Bed, Camera, Droplets } from 'lucide-react'

// OpenStreetMapのラスタタイルをMapLibre用に設定
const mapStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
} as any

type MapComponentProps = {
  pins: Pin[]
  onAddPin: (lat: number, lng: number) => void
  onSelectPin: (pin: Pin) => void
}

export default function MapComponent({ pins, onAddPin, onSelectPin }: MapComponentProps) {
  const [viewState, setViewState] = useState({
    longitude: 135.5023,
    latitude: 34.6937,
    zoom: 12
  })
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  
  const handleTouchStart = (e: any) => {
    if (e.originalEvent.touches && e.originalEvent.touches.length === 1) {
      const { lng, lat } = e.lngLat
      longPressTimer.current = setTimeout(() => {
        onAddPin(lat, lng)
      }, 500)
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }

  // PCでの右クリックでもピン追加できるようにする
  const handleContextMenu = (e: MapLayerMouseEvent) => {
    e.preventDefault()
    onAddPin(e.lngLat.lat, e.lngLat.lng)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Eat': return <Utensils size={20} className="text-rose-600" />
      case 'Stay': return <Bed size={20} className="text-emerald-600" />
      case 'Sightseeing': return <Camera size={20} className="text-sky-600" />
      case 'Onsen': return <Droplets size={20} className="text-amber-600" />
      default: return <MapPin size={20} className="text-teal-600" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Eat': return 'bg-[var(--color-eat)]'
      case 'Stay': return 'bg-[var(--color-stay)]'
      case 'Sightseeing': return 'bg-[var(--color-sightseeing)]'
      case 'Onsen': return 'bg-[var(--color-onsen)]'
      default: return 'bg-primary'
    }
  }

  return (
    <div className="w-full h-full flex-1 relative">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onContextMenu={handleContextMenu}
        dragPan={true}
        dragRotate={false}
      >
        {pins.map(pin => (
          <Marker
            key={pin.id}
            longitude={pin.lng}
            latitude={pin.lat}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              onSelectPin(pin);
            }}
          >
            <div className="flex flex-col items-center group cursor-pointer">
              <div 
                className={`p-2 rounded-full shadow-md transform transition-transform group-hover:scale-110 flex items-center justify-center border-2 
                ${pin.status === 'Visited' 
                  ? 'border-orange-300 bg-orange-50 scale-105' 
                  : `border-white ${getCategoryColor(pin.category)}`
                }`}
              >
                {pin.status === 'Visited' && pin.photo_url ? (
                  <div className="w-5 h-5 rounded-full overflow-hidden">
                    <img src={pin.photo_url} alt="memory" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  getCategoryIcon(pin.category)
                )}
              </div>
              {pin.title && (
                <div className="text-xs font-bold text-center mt-1 bg-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm whitespace-nowrap text-gray-800 border border-gray-100">
                  {pin.title}
                </div>
              )}
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  )
}
