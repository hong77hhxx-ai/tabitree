'use client'

import { useState, useRef, useEffect } from 'react'
import Map, { Marker, Popup, MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Pin, MemberLocation } from '@/lib/supabase'
import { MapPin, Utensils, Bed, Camera, Droplets, Crosshair, ChevronRight, X, Users } from 'lucide-react'

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
  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }],
} as any

type MapComponentProps = {
  pins: Pin[]
  onAddPin: (lat: number, lng: number) => void
  onOpenSheet: (pin: Pin) => void
  popupPin?: Pin | null
  onClosePopup?: () => void
  centerLocation?: { lat: number, lng: number } | null
  userLocation?: { lat: number, lng: number } | null
  memberLocations?: MemberLocation[]
}

const CATEGORY_LABEL: Record<string, string> = {
  Eat: '食べる', Stay: '泊まる', Sightseeing: '観光', Onsen: '温泉',
}
const STATUS_LABEL: Record<string, string> = {
  Planned: '行きたい', Confirmed: '予約済', Visited: '行った',
}

// メンバーアバターの色（user_idをもとに固定色）
const MEMBER_COLORS = [
  'bg-violet-500', 'bg-pink-500', 'bg-orange-500',
  'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
]
const getMemberColor = (userId: string) => {
  let hash = 0
  for (const c of userId) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length]
}

// 更新時刻から透明度と「鮮度ラベル」を計算
const getLocationFreshness = (updatedAt: string) => {
  const age = Date.now() - new Date(updatedAt).getTime()
  const mins = age / 60000
  if (mins < 1)  return { opacity: 1,   label: 'たった今' }
  if (mins < 3)  return { opacity: 0.75, label: `${Math.floor(mins)}分前` }
  if (mins < 5)  return { opacity: 0.4,  label: `${Math.floor(mins)}分前` }
  return           { opacity: 0.2,  label: `${Math.floor(mins)}分前` }
}

export default function MapComponent({
  pins, onAddPin, onOpenSheet, popupPin, onClosePopup,
  centerLocation, userLocation, memberLocations = [],
}: MapComponentProps) {
  const [viewState, setViewState] = useState({
    longitude: 135.5023, latitude: 34.6937, zoom: 12,
  })
  const mapRef = useRef<MapRef>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (centerLocation) {
      mapRef.current?.flyTo({
        center: [centerLocation.lng, centerLocation.lat],
        zoom: 15, duration: 800,
      })
    }
  }, [centerLocation])

  const handleMyLocation = () => {
    if (userLocation) {
      mapRef.current?.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 15, duration: 1000 })
    } else {
      alert('現在地を取得中です。ブラウザの位置情報設定を確認してください。')
    }
  }

  const handleTouchStart = (e: any) => {
    if (e.originalEvent.touches?.length === 1) {
      const { lng, lat } = e.lngLat
      longPressTimer.current = setTimeout(() => onAddPin(lat, lng), 500)
    }
  }
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }
  const handleContextMenu = (e: MapLayerMouseEvent) => {
    e.preventDefault()
    onAddPin(e.lngLat.lat, e.lngLat.lng)
  }

  const getCategoryIcon = (category: string, size = 20) => {
    switch (category) {
      case 'Eat': return <Utensils size={size} className="text-rose-600" />
      case 'Stay': return <Bed size={size} className="text-emerald-600" />
      case 'Sightseeing': return <Camera size={size} className="text-sky-600" />
      case 'Onsen': return <Droplets size={size} className="text-amber-600" />
      case 'Here': return <Users size={size} className="text-violet-600" />
      default: return <MapPin size={size} className="text-teal-600" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Eat': return 'bg-[var(--color-eat)]'
      case 'Stay': return 'bg-[var(--color-stay)]'
      case 'Sightseeing': return 'bg-[var(--color-sightseeing)]'
      case 'Onsen': return 'bg-[var(--color-onsen)]'
      case 'Here': return 'bg-violet-100'
      default: return 'bg-primary'
    }
  }

  return (
    <div className="w-full h-full flex-1 relative">
      <Map
        {...viewState}
        ref={mapRef}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onContextMenu={handleContextMenu}
        onClick={() => onClosePopup?.()}
        dragPan={true}
        dragRotate={false}
      >
        {/* スポットのピン */}
        {pins.filter(pin => {
          // Hereピンは期限切れなら非表示
          if (pin.category === 'Here' && pin.scheduled_at) {
            return new Date(pin.scheduled_at) > new Date()
          }
          return true
        }).map(pin => (
          <Marker
            key={pin.id}
            longitude={pin.lng}
            latitude={pin.lat}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation()
              onOpenSheet(pin)
            }}
          >
            {pin.category === 'Here' ? (
              // 今ここにいるよピン：パルスアニメーション
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <div className="here-pulse-ring" />
                  <div className="relative z-10 w-10 h-10 rounded-full bg-violet-500 border-2 border-white shadow-lg flex items-center justify-center">
                    <Users size={20} className="text-white" />
                  </div>
                </div>
                <div className="text-xs font-bold text-center mt-1 bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap border border-violet-200">
                  {pin.title || '今ここにいるよ'}
                </div>
              </div>
            ) : pin.status === 'Visited' && pin.photo_url ? (
              // 訪問済み写真ピン：フォトカード形式
              <div className="flex flex-col items-center group cursor-pointer drop-shadow-lg">
                <div className="bg-white p-1 rounded-xl border-2 border-orange-300 shadow-md transform transition-transform group-hover:scale-105 group-hover:-translate-y-0.5">
                  <div className="w-16 h-16 rounded-lg overflow-hidden">
                    <img src={pin.photo_url} alt={pin.title} className="w-full h-full object-cover" />
                  </div>
                  {pin.title && (
                    <div className="text-[10px] font-bold text-center mt-1 text-gray-700 truncate max-w-[72px]">
                      {pin.title}
                    </div>
                  )}
                </div>
                {/* 下向きの三角 */}
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-orange-300" />
              </div>
            ) : (
              // 通常ピン
              <div className="flex flex-col items-center group cursor-pointer">
                <div className={`p-2 rounded-full shadow-md transform transition-transform group-hover:scale-110 flex items-center justify-center border-2
                  ${pin.status === 'Visited' ? 'border-orange-300 bg-orange-50 scale-105' : `border-white ${getCategoryColor(pin.category)}`}`}>
                  {getCategoryIcon(pin.category)}
                </div>
                {pin.title && (
                  <div className="text-xs font-bold text-center mt-1 bg-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm whitespace-nowrap text-gray-800 border border-gray-100">
                    {pin.title}
                  </div>
                )}
              </div>
            )}
          </Marker>
        ))}

        {/* 吹き出し */}
        {popupPin && (
          <Popup
            longitude={popupPin.lng}
            latitude={popupPin.lat}
            anchor="bottom"
            offset={50}
            closeButton={false}
            closeOnClick={false}
            className="pin-popup"
          >
            <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden w-56 border border-gray-100">
              {popupPin.photo_url && (
                <div className="w-full h-28 overflow-hidden">
                  <img src={popupPin.photo_url} alt={popupPin.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1 rounded-full ${getCategoryColor(popupPin.category)}`}>
                    {getCategoryIcon(popupPin.category, 12)}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {CATEGORY_LABEL[popupPin.category] ?? popupPin.category}
                  </span>
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    popupPin.status === 'Visited' ? 'bg-orange-100 text-orange-600' :
                    popupPin.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-600' :
                    'bg-indigo-50 text-indigo-500'
                  }`}>
                    {STATUS_LABEL[popupPin.status] ?? popupPin.status}
                  </span>
                </div>
                <div className="font-bold text-gray-800 text-sm truncate mb-2">{popupPin.title}</div>
                {popupPin.notes && (
                  <div className="text-xs text-gray-500 line-clamp-2 mb-2">{popupPin.notes}</div>
                )}
                <button
                  onClick={() => onOpenSheet(popupPin)}
                  className="w-full flex items-center justify-center gap-1 bg-[var(--color-primary)] text-white text-xs font-bold py-2 rounded-xl hover:opacity-90 transition-all"
                >
                  詳細を編集 <ChevronRight size={14} />
                </button>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onClosePopup?.() }}
                className="absolute top-2 right-2 bg-black/30 text-white rounded-full p-0.5 hover:bg-black/50 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          </Popup>
        )}

        {/* 自分の現在地 */}
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div className="gps-marker" />
          </Marker>
        )}

        {/* 他のメンバーの位置 */}
        {memberLocations.map(member => {
          const { opacity, label } = getLocationFreshness(member.updated_at)
          return (
            <Marker
              key={member.user_id}
              longitude={member.lng}
              latitude={member.lat}
              anchor="bottom"
            >
              <div className="flex flex-col items-center" style={{ opacity }}>
                <div className={`w-9 h-9 rounded-full ${getMemberColor(member.user_id)} flex items-center justify-center text-white text-sm font-bold shadow-md border-2 border-white`}>
                  {member.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded-full shadow-sm mt-0.5 whitespace-nowrap text-gray-700 border border-gray-100 flex flex-col items-center">
                  <span>{member.nickname}</span>
                  <span className="text-gray-400 font-normal">{label}</span>
                </div>
              </div>
            </Marker>
          )
        })}
      </Map>

      <button
        onClick={handleMyLocation}
        className="absolute bottom-6 right-4 bg-white p-3.5 rounded-full shadow-lg active:scale-95 transition-all z-10 border border-gray-100"
      >
        <Crosshair size={24} className="text-indigo-600" />
      </button>
    </div>
  )
}
