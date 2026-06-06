'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { Pin, MemberLocation } from '@/lib/supabase'
import { MapPin, Utensils, Bed, Camera, Droplets, Crosshair, ChevronRight, X, Users, ListFilter, ChevronDown } from 'lucide-react'

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
  userAvatarUrl?: string | null
  memberLocations?: MemberLocation[]
  searchCircle?: { lat: number, lng: number, radiusKm: number } | null
  mapTheme?: 'default' | 'dark'
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

// 2点間の距離(m)を返す（Haversine）
const haversineDistance = (a: { lat: number, lng: number }, b: { lat: number, lng: number }) => {
  const R = 6371000
  const toRad = (deg: number) => deg * Math.PI / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

// 50m以内なら「同じ位置」と見なす
const COLOCATION_THRESHOLD_M = 50

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

// 検索範囲の半透明の円
function SearchCircle({ center, radiusKm }: { center: { lat: number, lng: number }, radiusKm: number }) {
  const map = useMap()
  const mapsLib = useMapsLibrary('maps')
  const circleRef = useRef<google.maps.Circle | null>(null)

  useEffect(() => {
    if (!map || !mapsLib) return
    if (!circleRef.current) {
      circleRef.current = new mapsLib.Circle({
        map,
        center,
        radius: radiusKm * 1000,
        fillColor: '#88D8C0',
        fillOpacity: 0.18,
        strokeColor: '#3bbf9c',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        clickable: false,
      })
    } else {
      circleRef.current.setCenter(center)
      circleRef.current.setRadius(radiusKm * 1000)
    }
    // 円全体が見えるようにズーム調整
    const bounds = circleRef.current.getBounds()
    if (bounds) map.fitBounds(bounds, 40)

    return () => {
      circleRef.current?.setMap(null)
      circleRef.current = null
    }
  }, [map, mapsLib, center.lat, center.lng, radiusKm])

  return null
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
  centerLocation, userLocation, userAvatarUrl, memberLocations = [], searchCircle, mapTheme = 'default',
  addMode, onToggleAddMode,
}: MapComponentProps & { addMode: boolean, onToggleAddMode: () => void }) {
  const map = useMap()
  const [filter, setFilter] = useState<PinFilter>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const didInitialCenter = useRef(false)

  // 現在地を初めて取得したら、一度だけそこを初期位置にする
  useEffect(() => {
    if (map && userLocation && !didInitialCenter.current) {
      didInitialCenter.current = true
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng })
      map.setZoom(14)
    }
  }, [map, userLocation])

  // ダーク⇔ライトの切替時は colorScheme が変わりGoogleマップが再生成され、
  // 初期位置（東京）に戻ってしまう。再生成後に現在地へ寄せ直す。
  const mapRef = useRef(map)
  mapRef.current = map
  const userLocRef = useRef(userLocation)
  userLocRef.current = userLocation
  const wasDark = useRef(mapTheme === 'dark')
  useEffect(() => {
    const isDark = mapTheme === 'dark'
    if (wasDark.current === isDark) return
    wasDark.current = isDark
    // 再生成（新しいインスタンス生成）を待ってから現在地へ移動
    const t = setTimeout(() => {
      const m = mapRef.current
      const loc = userLocRef.current
      if (m && loc) {
        m.setCenter({ lat: loc.lat, lng: loc.lng })
        m.setZoom(14)
      }
    }, 450)
    return () => clearTimeout(t)
  }, [mapTheme])

  const handleMyLocation = () => {
    if (userLocation && map) {
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng })
      map.setZoom(14)
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
      {/* ピンフィルター（右上ドロップダウン） */}
      <div
        className="absolute right-4 z-10 flex flex-col items-end"
        style={{ top: 'max(env(safe-area-inset-top, 0px) + 12px, 16px)' }}
      >
        <button
          onClick={() => setFilterOpen(v => !v)}
          className="bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-gray-100 pl-3 pr-2.5 py-2 flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <ListFilter size={15} className="text-[var(--color-primary)]" />
          <span className="text-sm font-bold text-gray-700 whitespace-nowrap">
            {FILTERS.find(f => f.id === filter)?.label}
          </span>
          <ChevronDown size={15} className={`text-gray-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
        </button>

        {filterOpen && (
          <div className="mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-36">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => { setFilter(f.id); setFilterOpen(false) }}
                className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                  filter === f.id
                    ? 'bg-[var(--color-primary)]/10 text-teal-700'
                    : 'text-gray-600 active:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Map
        mapId={MAP_ID}
        defaultCenter={{ lat: 35.6812, lng: 139.7671 }}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI={true}
        clickableIcons={false}
        colorScheme={mapTheme === 'dark' ? 'DARK' : 'LIGHT'}
        style={{ width: '100%', height: '100%', cursor: addMode ? 'crosshair' : 'grab' }}
        onClick={handleMapClick}
      >
        <MapController centerLocation={centerLocation} />
        {searchCircle && (
          <SearchCircle
            center={{ lat: searchCircle.lat, lng: searchCircle.lng }}
            radiusKm={searchCircle.radiusKm}
          />
        )}

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
              <div className="flex flex-col items-center cursor-pointer drop-shadow-md">
                <div className="bg-white p-1 rounded-xl border-2 border-orange-300 shadow-sm">
                  <div className="w-12 h-12 rounded-lg overflow-hidden">
                    <img src={pin.photo_url} alt={pin.title} className="w-full h-full object-cover" />
                  </div>
                  {pin.title && (
                    <div className="text-[9px] font-bold text-center mt-0.5 text-gray-700 truncate max-w-[56px] leading-tight">
                      {pin.title}
                    </div>
                  )}
                </div>
                <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[7px] border-l-transparent border-r-transparent border-t-orange-300" />
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
            <div className="relative bg-[var(--surface)] rounded-2xl shadow-xl overflow-hidden w-56 border border-[var(--border-soft)] mb-12">
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
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
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
                <div className="font-bold text-[var(--text-strong)] text-sm truncate mb-2">{popupPin.title}</div>
                {popupPin.notes && (
                  <div className="text-xs text-[var(--text-muted)] line-clamp-2 mb-2">{popupPin.notes}</div>
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

        {/* === 自分のマーカー（同じ場所にいるメンバーをミニアイコンで表示） === */}
        {userLocation && (() => {
          // 自分と同じ位置にいるメンバーを抽出
          const nearbyMembers = memberLocations.filter(m =>
            haversineDistance(userLocation, { lat: m.lat, lng: m.lng }) < COLOCATION_THRESHOLD_M
          )
          const MAX_DOTS = 3
          const visibleDots = nearbyMembers.slice(0, MAX_DOTS)
          const overflowCount = nearbyMembers.length - MAX_DOTS

          return (
            <AdvancedMarker position={{ lat: userLocation.lat, lng: userLocation.lng }} zIndex={500}>
              {userAvatarUrl ? (
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="avatar-pulse-ring" />
                  <div className="relative z-10 w-14 h-14 rounded-2xl overflow-hidden border-[3px] border-blue-500 shadow-lg bg-white">
                    <img src={userAvatarUrl} alt="あなた" className="w-full h-full object-cover" />
                  </div>
                  {/* 同じ位置のメンバーをミニドットで右下に重ねる */}
                  {nearbyMembers.length > 0 && (
                    <div className="absolute -bottom-1 -right-1 z-20 flex items-end" style={{ gap: '2px' }}>
                      {visibleDots.map((m, i) => (
                        <div
                          key={m.user_id}
                          className={`w-5 h-5 rounded-full border-2 border-white shadow-md overflow-hidden ${getMemberColor(m.user_id)} flex items-center justify-center`}
                          style={{ zIndex: 20 + i }}
                          title={m.nickname}
                        >
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.nickname} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] font-bold text-white leading-none">{m.nickname.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                      ))}
                      {overflowCount > 0 && (
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white shadow-md bg-gray-500 flex items-center justify-center"
                          style={{ zIndex: 20 + MAX_DOTS }}
                        >
                          <span className="text-[7px] font-bold text-white leading-none">+{overflowCount}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="gps-marker" />
                  {/* アバター未設定でも同じ位置のメンバードットを表示 */}
                  {nearbyMembers.length > 0 && (
                    <div className="absolute -bottom-1 -right-1 z-20 flex items-end" style={{ gap: '2px' }}>
                      {visibleDots.map((m, i) => (
                        <div
                          key={m.user_id}
                          className={`w-5 h-5 rounded-full border-2 border-white shadow-md overflow-hidden ${getMemberColor(m.user_id)} flex items-center justify-center`}
                          style={{ zIndex: 20 + i }}
                          title={m.nickname}
                        >
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.nickname} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] font-bold text-white leading-none">{m.nickname.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                      ))}
                      {overflowCount > 0 && (
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white shadow-md bg-gray-500 flex items-center justify-center"
                          style={{ zIndex: 20 + MAX_DOTS }}
                        >
                          <span className="text-[7px] font-bold text-white leading-none">+{overflowCount}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </AdvancedMarker>
          )
        })()}

        {/* === 他メンバーのマーカー（自分と同じ位置のメンバーはスキップ） === */}
        {memberLocations
          .filter(m => !userLocation || haversineDistance(userLocation, { lat: m.lat, lng: m.lng }) >= COLOCATION_THRESHOLD_M)
          .map(member => {
          const { opacity, label } = getLocationFreshness(member.updated_at)
          return (
            <AdvancedMarker key={member.user_id} position={{ lat: member.lat, lng: member.lng }}>
              <div className="flex flex-col items-center" style={{ opacity }}>
                <div className={`w-14 h-14 rounded-2xl ${getMemberColor(member.user_id)} flex items-center justify-center text-white text-xl font-bold shadow-lg border-[3px] border-white overflow-hidden`}>
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
