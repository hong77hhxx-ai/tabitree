'use client'

import { useState, useEffect } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps'
import { Pin, MemberLocation } from '@/lib/supabase'
import { MapPin, Utensils, Bed, Camera, Droplets, Crosshair, ChevronRight, X, Users } from 'lucide-react'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
// AdvancedMarkerにはMap IDが必須。デモ用のDEMO_MAP_IDを利用
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID'

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

const MEMBER_COLORS = [
  'bg-violet-500', 'bg-pink-500', 'bg-orange-500',
  'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
]
const getMemberColor = (userId: string) => {
  let hash = 0
  for (const c of userId) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length]
}

const getLocationFreshness = (updatedAt: string) => {
  const age = Date.now() - new Date(updatedAt).getTime()
  const mins = age / 60000
  if (mins < 1)  return { opacity: 1,   label: 'たった今' }
  if (mins < 3)  return { opacity: 0.75, label: `${Math.floor(mins)}分前` }
  if (mins < 5)  return { opacity: 0.4,  label: `${Math.floor(mins)}分前` }
  return           { opacity: 0.2,  label: `${Math.floor(mins)}分前` }
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

// 地図の中心移動を制御する内部コンポーネント
function MapController({ centerLocation }: { centerLocation?: { lat: number, lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (map && centerLocation) {
      map.panTo({ lat: centerLocation.lat, lng: centerLocation.lng })
      map.setZoom(16)
    }
  }, [map, centerLocation])
  return null
}

export default function MapComponent(props: MapComponentProps) {
  const [addMode, setAddMode] = useState(false)

  const handleAddPin = (lat: number, lng: number) => {
    props.onAddPin(lat, lng)
    setAddMode(false)
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="w-full h-full flex-1 relative">
        <MapInnerWithMode
          {...props}
          addMode={addMode}
          onAddPin={handleAddPin}
          onToggleAddMode={() => setAddMode(!addMode)}
        />
      </div>
    </APIProvider>
  )
}

type PinFilter = 'all' | 'plan' | 'memory'

function MapInnerWithMode({
  pins, onAddPin, onOpenSheet, popupPin, onClosePopup,
  centerLocation, userLocation, memberLocations = [],
  addMode, onToggleAddMode,
}: MapComponentProps & { addMode: boolean, onToggleAddMode: () => void }) {
  const map = useMap()
  const [filter, setFilter] = useState<PinFilter>('all')

  const handleMyLocation = () => {
    if (userLocation && map) {
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng })
      map.setZoom(16)
    } else {
      alert('現在地を取得中です。ブラウザの位置情報設定を確認してください。')
    }
  }

  const handleMapClick = (e: any) => {
    if (addMode) {
      const latLng = e.detail?.latLng
      if (latLng) onAddPin(latLng.lat, latLng.lng)
    } else {
      onClosePopup?.()
    }
  }

  const visiblePins = pins.filter(pin => {
    // 期限切れHereピンは常に非表示
    if (pin.category === 'Here' && pin.scheduled_at) {
      if (new Date(pin.scheduled_at) <= new Date()) return false
    }
    // フィルター適用（Hereピンはフィルター対象外で常に表示）
    if (pin.category === 'Here') return true
    if (filter === 'plan') return pin.status === 'Planned' || pin.status === 'Confirmed'
    if (filter === 'memory') return pin.status === 'Visited'
    return true
  })

  const FILTERS: { id: PinFilter, label: string }[] = [
    { id: 'all', label: 'すべて' },
    { id: 'plan', label: '予定' },
    { id: 'memory', label: '思い出' },
  ]

  return (
    <div className="w-full h-full relative">
      {/* ピンフィルター */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-gray-100 p-1 flex gap-1 w-max"
        style={{ bottom: 'max(env(safe-area-inset-bottom, 0px) + 24px, 24px)' }}
      >
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 text-sm font-bold rounded-full transition-all whitespace-nowrap ${
              filter === f.id
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-gray-500 active:bg-gray-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Map
        mapId={MAP_ID}
        defaultCenter={{ lat: 34.6937, lng: 135.5023 }}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI={true}
        clickableIcons={false}
        style={{ width: '100%', height: '100%', cursor: addMode ? 'crosshair' : 'grab' }}
        onClick={handleMapClick}
      >
        <MapController centerLocation={centerLocation} />

        {visiblePins.map(pin => (
          <AdvancedMarker
            key={pin.id}
            position={{ lat: pin.lat, lng: pin.lng }}
            onClick={() => onOpenSheet(pin)}
          >
            {pin.category === 'Here' ? (
              <div className="flex flex-col items-center cursor-pointer">
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
              <div className="flex flex-col items-center cursor-pointer drop-shadow-lg">
                <div className="bg-white p-1.5 rounded-2xl border-2 border-orange-300 shadow-md">
                  <div className="w-20 h-20 rounded-xl overflow-hidden">
                    <img src={pin.photo_url} alt={pin.title} className="w-full h-full object-cover" />
                  </div>
                  {pin.title && (
                    <div className="text-[11px] font-bold text-center mt-1 text-gray-700 truncate max-w-[88px]">
                      {pin.title}
                    </div>
                  )}
                </div>
                <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-orange-300" />
              </div>
            ) : (
              // 透明な余白(p-2)でタップ判定を広げる
              <div className="flex flex-col items-center cursor-pointer p-2 -m-2">
                <div className={`p-3 rounded-full shadow-md flex items-center justify-center border-2
                  ${pin.status === 'Visited' ? 'border-orange-300 bg-orange-50' : `border-white ${getCategoryColor(pin.category)}`}`}>
                  {getCategoryIcon(pin.category, 24)}
                </div>
                {pin.title && (
                  <div className="text-xs font-bold text-center mt-1 bg-white/90 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap text-gray-800 border border-gray-100">
                    {pin.title}
                  </div>
                )}
              </div>
            )}
          </AdvancedMarker>
        ))}

        {popupPin && (
          <AdvancedMarker position={{ lat: popupPin.lat, lng: popupPin.lng }} zIndex={1000}>
            <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden w-56 border border-gray-100 mb-12">
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
                  {popupPin.category !== 'Here' && (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      popupPin.status === 'Visited' ? 'bg-orange-100 text-orange-600' :
                      popupPin.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-indigo-50 text-indigo-500'
                    }`}>
                      {STATUS_LABEL[popupPin.status] ?? popupPin.status}
                    </span>
                  )}
                </div>
                <div className="font-bold text-gray-800 text-sm truncate mb-2">{popupPin.title}</div>
                {popupPin.notes && (
                  <div className="text-xs text-gray-500 line-clamp-2 mb-2">{popupPin.notes}</div>
                )}
                <button
                  onClick={() => onOpenSheet(popupPin)}
                  className="w-full flex items-center justify-center gap-1 bg-[var(--color-primary)] text-white text-xs font-bold py-2 rounded-xl transition-all"
                >
                  詳細を編集 <ChevronRight size={14} />
                </button>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onClosePopup?.() }}
                className="absolute top-2 right-2 bg-black/30 text-white rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          </AdvancedMarker>
        )}

        {userLocation && (
          <AdvancedMarker position={{ lat: userLocation.lat, lng: userLocation.lng }}>
            <div className="gps-marker" />
          </AdvancedMarker>
        )}

        {memberLocations.map(member => {
          const { opacity, label } = getLocationFreshness(member.updated_at)
          return (
            <AdvancedMarker key={member.user_id} position={{ lat: member.lat, lng: member.lng }}>
              <div className="flex flex-col items-center" style={{ opacity }}>
                <div className={`w-10 h-10 rounded-full ${getMemberColor(member.user_id)} flex items-center justify-center text-white text-sm font-bold shadow-md border-2 border-white overflow-hidden`}>
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.nickname} className="w-full h-full object-cover" />
                  ) : (
                    member.nickname.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded-full shadow-sm mt-0.5 whitespace-nowrap text-gray-700 border border-gray-100 flex flex-col items-center">
                  <span>{member.nickname}</span>
                  <span className="text-gray-400 font-normal">{label}</span>
                </div>
              </div>
            </AdvancedMarker>
          )
        })}
      </Map>

      {/* ピン追加モードのヒント */}
      {addMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-teal-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
          地図をタップしてスポットを追加
        </div>
      )}

      {/* スポット追加ボタン */}
      <button
        onClick={onToggleAddMode}
        className={`absolute bottom-24 right-4 p-3.5 rounded-full shadow-lg active:scale-95 transition-all z-10 border ${
          addMode ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-600 border-gray-100'
        }`}
      >
        {addMode ? <X size={24} /> : <MapPin size={24} />}
      </button>

      {/* 現在地ボタン */}
      <button
        onClick={handleMyLocation}
        className="absolute bottom-6 right-4 bg-white p-3.5 rounded-full shadow-lg active:scale-95 transition-all z-10 border border-gray-100"
      >
        <Crosshair size={24} className="text-indigo-600" />
      </button>
    </div>
  )
}
