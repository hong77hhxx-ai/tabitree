'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase, Pin, MemberLocation, getUserId, addStoredGroup, getStoredGroups, StoredGroup, upsertGroupMember, SavedRoute } from '@/lib/supabase'
import MapFilterPanel, { PinCategory, FILTER_CATEGORIES, StatusFilter } from '@/components/MapFilterPanel'
import BottomSheet from '@/components/BottomSheet'
import Timeline from '@/components/Timeline'
import CountdownWidget from '@/components/CountdownWidget'
import NicknameModal from '@/components/NicknameModal'
import BottomNav from '@/components/BottomNav'
import HereWidget from '@/components/HereWidget'
import Settings, { ThemeColor, MapStyle } from '@/components/Settings'
import AiSearchOverlay from '@/components/AiSearchOverlay'
import GroupsList from '@/components/GroupsList'
import RoutePlanner from '@/components/RoutePlanner'
import PlaceSearch from '@/components/PlaceSearch'
import MemoryView from '@/components/MemoryView'
import { RouteResult, computeRouteForOrder } from '@/lib/route'
import { PlaceResult } from '@/lib/places'
import { Route as RouteIcon, Search } from 'lucide-react'
import { APIProvider, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false })

const LOCATION_TTL_MS = 5 * 60 * 1000 // 5分以上更新がなければ非表示
const SHARE_INTERVAL_MS = 15_000

// 保存済みルートを選んだときに、順番どおり再計算して地図に表示する（APIProvider配下で動作）
function RouteLoader({
  pending, pins, onResult,
}: {
  pending: SavedRoute | null
  pins: Pin[]
  onResult: (res: RouteResult | null, orderedIds: string[]) => void
}) {
  const map = useMap()
  const routesLib = useMapsLibrary('routes')

  useEffect(() => {
    if (!pending || !routesLib) return
    let cancelled = false
    const ordered = pending.pin_ids
      .map(id => pins.find(p => p.id === id))
      .filter(Boolean) as Pin[]
    if (ordered.length < 2) {
      onResult(null, pending.pin_ids)
      return
    }
    computeRouteForOrder(ordered, pending.mode, routesLib)
      .then(res => {
        if (cancelled) return
        onResult(res, pending.pin_ids)
        const bounds = res.directions.routes[0]?.bounds
        if (map && bounds) map.fitBounds(bounds, 60)
      })
      .catch(() => { if (!cancelled) onResult(null, pending.pin_ids) })
    return () => { cancelled = true }
  }, [pending, routesLib, pins, map])

  return null
}

export default function MapPage() {
  const params = useParams()
  const groupId = params.groupId as string

  const [pins, setPins] = useState<Pin[]>([])
  // フィルター（左上）：複数グループ表示 + カテゴリー別表示
  const [storedGroups, setStoredGroups] = useState<StoredGroup[]>([])
  const [crossGroupPins, setCrossGroupPins] = useState<Pin[]>([])
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>(() => groupId ? [groupId] : [])
  const [visibleCategories, setVisibleCategories] = useState<PinCategory[]>(
    () => FILTER_CATEGORIES.map(c => c.id)
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedPin, setSelectedPin] = useState<Partial<Pin> | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number} | null>(null)
  const [centerLocation, setCenterLocation] = useState<{lat: number, lng: number} | null>(null)
  const [popupPin, setPopupPin] = useState<Pin | null>(null)
  const [memoryPin, setMemoryPin] = useState<Pin | null>(null)
  const [confirmVisitPin, setConfirmVisitPin] = useState<Pin | null>(null)
  const [activeTab, setActiveTab] = useState<'map' | 'groups' | 'timeline' | 'settings'>('map')
  const [themeColor, setThemeColor] = useState<ThemeColor>('default')
  const [mapStyle, setMapStyle] = useState<MapStyle>('default')
  const [searchCircle, setSearchCircle] = useState<{lat: number, lng: number, radiusKm: number} | null>(null)
  const [aiSelect, setAiSelect] = useState<{lat: number, lng: number, category: string} | null>(null)

  // ルート最適化
  const [routeDirections, setRouteDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [routeOrderedPinIds, setRouteOrderedPinIds] = useState<string[]>([])
  const [showRoute, setShowRoute] = useState(true)
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false)
  const [pendingRoute, setPendingRoute] = useState<SavedRoute | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [droppingPin, setDroppingPin] = useState<{lat: number, lng: number} | null>(null)
  const dropTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [nickname, setNickname] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [memberLocations, setMemberLocations] = useState<MemberLocation[]>([])

  const userLocationRef = useRef<{lat: number, lng: number} | null>(null)

  // ニックネーム・アバター確認
  useEffect(() => {
    const saved = localStorage.getItem('tabitree_nickname')
    if (saved) {
      setNickname(saved)
      setAvatarUrl(localStorage.getItem('tabitree_avatar_url'))
    } else {
      setShowNicknameModal(true)
    }
    // テーマカラー・マップ色を復元（旧 tabitree_map_theme からの移行に対応）
    const legacy = localStorage.getItem('tabitree_map_theme') as ThemeColor | null
    const savedTheme = (localStorage.getItem('tabitree_theme_color') as ThemeColor | null) ?? legacy
    const savedMapStyle = (localStorage.getItem('tabitree_map_style') as MapStyle | null)
      ?? (legacy === 'dark' ? 'dark' : null)
    if (savedTheme) setThemeColor(savedTheme)
    if (savedMapStyle) setMapStyle(savedMapStyle)
    // このマップを参加一覧に追加（共有リンク経由でも記録）
    if (groupId) {
      supabase.from('groups').select('*').eq('id', groupId).single()
        .then(({ data }) => {
          if (data) addStoredGroup({ id: data.id, name: data.name, color: data.color, photo_url: data.photo_url ?? null })
        })
    }
  }, [])

  const handleChangeThemeColor = (theme: ThemeColor) => {
    setThemeColor(theme)
    localStorage.setItem('tabitree_theme_color', theme)
  }
  const handleChangeMapStyle = (style: MapStyle) => {
    setMapStyle(style)
    localStorage.setItem('tabitree_map_style', style)
  }

  // テーマカラーを html 要素に反映（アプリ全体のアクセント色・背景・文字色を切替）
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeColor)
  }, [themeColor])

  // グループ参加を永続記録（メンバー一覧用。位置共有とは別に保持される）
  useEffect(() => {
    if (!nickname || !groupId) return
    upsertGroupMember(groupId, getUserId(), nickname, avatarUrl)
  }, [nickname, avatarUrl, groupId])

  // GPS監視
  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        userLocationRef.current = loc
      },
      (err) => console.error('GPS Error:', err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // 位置情報の共有
  useEffect(() => {
    if (!nickname || !groupId) return
    const userId = getUserId()

    const share = async () => {
      const loc = userLocationRef.current
      if (!loc) return  // GPS未取得時はupsertしない
      await supabase.from('member_locations').upsert({
        group_id: groupId,
        user_id: userId,
        nickname,
        avatar_url: avatarUrl,
        lat: loc.lat,
        lng: loc.lng,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'group_id,user_id' })
    }

    const deleteLocation = () => {
      // sendBeacon でバックグラウンド/タブ閉じ時も確実に送信
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/member_locations?group_id=eq.${groupId}&user_id=eq.${userId}`
      navigator.sendBeacon?.(url)  // フォールバック用（Supabase側のCronが主）
    }

    share()
    const interval = setInterval(share, SHARE_INTERVAL_MS)

    // iOS Safariも含め最も確実なイベント群を登録
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // バックグラウンド移行時にupdated_atを止める（Cron側が5分後に削除）
        clearInterval(interval)
      } else {
        // 復帰時に再開
        share()
      }
    }

    window.addEventListener('beforeunload', deleteLocation)
    window.addEventListener('pagehide', deleteLocation)  // iOS Safari対応
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', deleteLocation)
      window.removeEventListener('pagehide', deleteLocation)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [nickname, avatarUrl, groupId])

  // メンバー位置のリアルタイム購読
  useEffect(() => {
    if (!groupId) return
    const userId = getUserId()

    const fetchLocations = async () => {
      const cutoff = new Date(Date.now() - LOCATION_TTL_MS).toISOString()
      const { data } = await supabase
        .from('member_locations')
        .select('*')
        .eq('group_id', groupId)
        .gt('updated_at', cutoff)
        .neq('user_id', userId)
      if (data) setMemberLocations(data as MemberLocation[])
    }
    fetchLocations()

    // Realtimeイベント購読
    const channel = supabase
      .channel('member_locations')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'member_locations',
        filter: `group_id=eq.${groupId}`
      }, fetchLocations)
      .subscribe()

    // Realtimeが届かない場合のフォールバック（15秒ポーリング）
    const poll = setInterval(fetchLocations, 15000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [groupId])

  // ピンの購読
  useEffect(() => {
    if (!groupId) return
    const fetchPins = async () => {
      const { data, error } = await supabase.from('pins').select('*').eq('group_id', groupId)
      if (!error && data) setPins(data as Pin[])
    }
    fetchPins()

    const channel = supabase
      .channel('public:pins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pins', filter: `group_id=eq.${groupId}` }, (payload) => {
        if (payload.eventType === 'INSERT') setPins(prev => [...prev, payload.new as Pin])
        else if (payload.eventType === 'UPDATE') setPins(prev => prev.map(p => p.id === payload.new.id ? payload.new as Pin : p))
        else if (payload.eventType === 'DELETE') setPins(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId])

  // 参加グループ一覧を読み込み（フィルター用）。現在のグループは必ず表示対象に含める
  useEffect(() => {
    setStoredGroups(getStoredGroups())
    if (groupId) {
      setVisibleGroupIds(prev => prev.includes(groupId) ? prev : [...prev, groupId])
    }
  }, [groupId])

  // 現在のグループ以外で選択中のグループのピンを取得（読み取り専用表示）
  useEffect(() => {
    const others = visibleGroupIds.filter(id => id !== groupId)
    if (others.length === 0) {
      setCrossGroupPins([])
      return
    }
    let cancelled = false
    supabase.from('pins').select('*').in('group_id', others).then(({ data }) => {
      if (!cancelled && data) setCrossGroupPins(data as Pin[])
    })
    return () => { cancelled = true }
  }, [visibleGroupIds, groupId])

  const toggleGroup = (id: string) => {
    setVisibleGroupIds(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }
  const toggleCategory = (c: PinCategory) => {
    setVisibleCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  // マップに表示するピン：選択グループ + カテゴリー + 表示状態で絞り込み
  const displayPins = useMemo(() => {
    const all = [...pins, ...crossGroupPins]
    return all.filter(p => {
      if (!visibleGroupIds.includes(p.group_id)) return false
      // 「ここにいるよ」ピンは現在のグループのみ・期限切れは除外
      if (p.category === 'Here') {
        if (p.group_id !== groupId) return false
        if (p.scheduled_at && new Date(p.scheduled_at) <= new Date()) return false
        return true
      }
      if (!visibleCategories.includes(p.category as PinCategory)) return false
      // 表示状態フィルター（すべて / 予定 / 思い出）
      if (statusFilter === 'plan') return p.status !== 'Visited'
      if (statusFilter === 'memory') return p.status === 'Visited'
      return true
    })
  }, [pins, crossGroupPins, visibleGroupIds, visibleCategories, statusFilter, groupId])

  // ピンが突き刺さるアニメーションを見せてから、編集シートを開く
  const animateDropThen = (lat: number, lng: number, after: () => void, pan: boolean) => {
    setPopupPin(null)
    setActiveTab('map')
    if (pan) setCenterLocation({ lat, lng })
    setDroppingPin({ lat, lng })
    if (dropTimerRef.current) clearTimeout(dropTimerRef.current)
    dropTimerRef.current = setTimeout(() => {
      setDroppingPin(null)
      after()
    }, 650)
  }

  // 長押しでの追加：その地点は既に画面内なのでパンしない
  const handleAddPin = (lat: number, lng: number) => {
    animateDropThen(lat, lng, () => {
      setTempLocation({ lat, lng })
      setSelectedPin({ lat, lng })
      setIsBottomSheetOpen(true)
    }, false)
  }

  // 検索結果 / 地図POIから「ピンに追加」：名前・カテゴリ・住所を事前入力して編集シートを開く
  const handleAddPlace = (place: PlaceResult) => {
    animateDropThen(place.lat, place.lng, () => {
      setTempLocation({ lat: place.lat, lng: place.lng })
      setSelectedPin({
        title: place.name,
        category: place.category,
        status: 'Planned',
        notes: place.address || null,
        lat: place.lat,
        lng: place.lng,
      })
      setIsBottomSheetOpen(true)
    }, true)
  }

  const handleShowPopup = (pin: Pin) => {
    setActiveTab('map')
    setPopupPin(pin)
    setCenterLocation({ lat: pin.lat, lng: pin.lng })
  }

  const handleOpenSheet = (pin: Pin) => {
    setSelectedPin(pin)
    setIsBottomSheetOpen(true)
    setPopupPin(null)
    setMemoryPin(null)
  }

  // 思い出（Visited）ピンの一覧（スワイプ切替用）
  const memories = useMemo(
    () => pins
      .filter(p => p.status === 'Visited' && p.category !== 'Here')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [pins]
  )

  // ピンのタップ：まずカード（ポップアップ）を表示する
  const handleTapPin = (pin: Pin) => {
    handleShowPopup(pin)
  }

  // カードの「思い出を見る」：思い出専用ビューを開く
  const handleOpenMemory = (pin: Pin) => {
    setPopupPin(null)
    setMemoryPin(pin)
    setCenterLocation({ lat: pin.lat, lng: pin.lng })
  }

  // 思い出ビューのスワイプ：別の思い出に切替＋マップを該当ピンへ移動
  const handleMemoryChange = (pin: Pin) => {
    setMemoryPin(pin)
    setCenterLocation({ lat: pin.lat, lng: pin.lng })
  }

  // ワンタップで「行きたい」→「思い出」に変更
  const handleQuickVisit = async (pin: Pin) => {
    setPopupPin(null)
    setPins(prev => prev.map(p => p.id === pin.id ? { ...p, status: 'Visited' } : p))
    const { error } = await supabase.from('pins').update({ status: 'Visited' }).eq('id', pin.id)
    if (error) console.error(error)
  }

  // 「行きたい」ピンの長押し → 思い出に変更の確認ダイアログを表示
  const handleLongPressPin = (pin: Pin) => {
    if (pin.status === 'Visited' || pin.category === 'Here') return
    setPopupPin(null)
    setConfirmVisitPin(pin)
  }

  // AIセレクト開始：シートを閉じてマップ上にオーバーレイ表示
  const handleStartAiSelect = (lat: number, lng: number, category: string) => {
    setIsBottomSheetOpen(false)
    setAiSelect({ lat, lng, category })
  }

  // AIオーバーレイを閉じる（キャンセル）→ シートに戻る
  const handleCloseAiSelect = () => {
    setAiSelect(null)
    setSearchCircle(null)
    setIsBottomSheetOpen(true)
  }

  // AI提案を採用 → ピン作成
  const handleApplyAiSuggestion = (s: any) => {
    setAiSelect(null)
    handleSavePin({
      title: s.name,
      category: s.category,
      notes: s.reason,
      status: 'Planned',
      lat: s.lat,
      lng: s.lng,
    })
  }

  const handleSavePin = async (pinData: Partial<Pin>) => {
    if (pinData.id) {
      const { error } = await supabase.from('pins').update({
        title: pinData.title,
        category: pinData.category,
        status: pinData.status,
        notes: pinData.notes,
        photo_url: pinData.photo_url,
        reactions: pinData.reactions,
        scheduled_at: pinData.scheduled_at,
      }).eq('id', pinData.id)
      if (error) console.error(error)
    } else {
      const newLat = pinData.lat ?? tempLocation?.lat
      const newLng = pinData.lng ?? tempLocation?.lng
      const { error } = await supabase.from('pins').insert([{
        group_id: groupId,
        lat: newLat,
        lng: newLng,
        title: pinData.title,
        category: pinData.category,
        status: pinData.status,
        notes: pinData.notes,
        photo_url: pinData.photo_url,
        reactions: pinData.reactions,
        scheduled_at: pinData.scheduled_at,
        created_by: getUserId(),
        creator_name: nickname,
        creator_avatar: avatarUrl,
      }])
      if (error) console.error(error)
      // 新規ピンの位置へマップを移動
      if (newLat != null && newLng != null) {
        setCenterLocation({ lat: newLat, lng: newLng })
      }
    }
    setIsBottomSheetOpen(false)
    setSelectedPin(null)
    setTempLocation(null)
    setSearchCircle(null)
  }

  const handleDeletePin = async (pinId: string) => {
    const { error } = await supabase.from('pins').delete().eq('id', pinId)
    if (error) console.error(error)
    else {
      setIsBottomSheetOpen(false)
      setSelectedPin(null)
      setTempLocation(null)
    }
  }

  // ルート計算完了：地図に表示する
  const handleRouteComputed = (result: RouteResult | null) => {
    setRouteDirections(result?.directions ?? null)
    setRouteOrderedPinIds(result?.orderedPinIds ?? [])
    if (result) setShowRoute(true)
  }

  // タイムラインから保存済みルートを選択 → マップに表示
  const handleSelectRoute = (route: SavedRoute) => {
    setPopupPin(null)
    setPendingRoute(route)
    setActiveTab('map')
  }
  const handleRouteLoaded = (res: RouteResult | null, orderedIds: string[]) => {
    setRouteDirections(res?.directions ?? null)
    setRouteOrderedPinIds(res ? res.orderedPinIds : orderedIds)
    setShowRoute(true)
    setPendingRoute(null)
  }

  // タブ切り替え：マップを選んだら常に現在地から表示する
  const handleTabChange = (tab: 'map' | 'groups' | 'timeline' | 'settings') => {
    if (tab === 'map' && userLocationRef.current) {
      setPopupPin(null)
      setCenterLocation({ ...userLocationRef.current })
    }
    setActiveTab(tab)
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
    <div className="relative w-full h-screen overflow-hidden bg-[var(--bg-app)] flex flex-col">
      {showNicknameModal && (
        <NicknameModal onConfirm={(name, avatar) => {
          setNickname(name)
          setAvatarUrl(avatar)
          setShowNicknameModal(false)
        }} />
      )}

      {/* マップ画面 */}
      <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'map' ? 'flex' : 'hidden'}`}>
        <div className="relative flex-1 min-h-0">
          <MapComponent
            pins={displayPins}
            onAddPin={handleAddPin}
            onOpenSheet={handleOpenSheet}
            onTapPin={handleTapPin}
            onLongPressPin={handleLongPressPin}
            onOpenMemory={handleOpenMemory}
            popupPin={popupPin}
            onClosePopup={() => setPopupPin(null)}
            centerLocation={centerLocation}
            userLocation={userLocation}
            userAvatarUrl={avatarUrl}
            memberLocations={memberLocations}
            searchCircle={searchCircle}
            mapTheme={mapStyle}
            routeDirections={routeDirections}
            routeOrderedPinIds={routeOrderedPinIds}
            showRoute={showRoute}
            onAddPlace={handleAddPlace}
            onQuickVisit={handleQuickVisit}
            droppingPin={droppingPin}
          />

          {/* スポット検索ボタン（右上） */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="absolute right-4 z-10 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-gray-100 pl-3 pr-4 py-2 flex items-center gap-1.5 active:scale-95 transition-all"
            style={{ top: 'max(env(safe-area-inset-top, 0px) + 12px, 16px)' }}
          >
            <Search size={16} className="text-[var(--color-primary)]" />
            <span className="text-sm font-bold text-gray-700 whitespace-nowrap">検索</span>
          </button>

          <MapFilterPanel
            groups={storedGroups}
            currentGroupId={groupId}
            visibleGroupIds={visibleGroupIds}
            onToggleGroup={toggleGroup}
            visibleCategories={visibleCategories}
            onToggleCategory={toggleCategory}
            statusFilter={statusFilter}
            onChangeStatus={setStatusFilter}
            routeAvailable={routeDirections != null}
            showRoute={showRoute}
            onToggleShowRoute={() => setShowRoute(v => !v)}
          />
          <CountdownWidget pins={pins} onPinSelect={handleShowPopup} />
          <HereWidget pins={pins} onSelectPin={handleShowPopup} />

          {/* ルート起動ボタン（右下・現在地ボタンの上） */}
          <button
            onClick={() => setIsRoutePlannerOpen(true)}
            className="absolute right-4 bottom-24 bg-white p-3.5 rounded-full shadow-lg active:scale-95 transition-all z-10 border border-gray-100"
            aria-label="ルートを計画"
          >
            <RouteIcon size={24} className="text-[#dc2626]" />
          </button>

          {aiSelect && (
            <AiSearchOverlay
              center={{ lat: aiSelect.lat, lng: aiSelect.lng }}
              category={aiSelect.category}
              onRadiusChange={(radiusKm) => setSearchCircle({ lat: aiSelect.lat, lng: aiSelect.lng, radiusKm })}
              onApply={handleApplyAiSuggestion}
              onClose={handleCloseAiSelect}
            />
          )}
        </div>
      </div>

      {/* スポット検索（Google Places） */}
      <PlaceSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onPick={handleAddPlace}
      />

      {/* 保存済みルートの読み込み（再計算して地図表示） */}
      <RouteLoader pending={pendingRoute} pins={pins} onResult={handleRouteLoaded} />

      {/* ルート計画パネル */}
      <RoutePlanner
        isOpen={isRoutePlannerOpen}
        onClose={() => setIsRoutePlannerOpen(false)}
        pins={pins}
        groupId={groupId}
        creatorName={nickname}
        creatorAvatar={avatarUrl}
        onRouteComputed={handleRouteComputed}
      />

      {/* タイムライン画面（開くたびに最初の状態に戻すため、非表示時はアンマウント） */}
      {activeTab === 'timeline' && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Timeline
            pins={pins}
            groupId={groupId}
            onSelectPin={handleShowPopup}
            onDeletePin={handleDeletePin}
            onSelectRoute={handleSelectRoute}
          />
        </div>
      )}

      {/* グループ画面 */}
      {activeTab === 'groups' && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <GroupsList currentGroupId={groupId} />
        </div>
      )}

      {/* 設定画面 */}
      {activeTab === 'settings' && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Settings
            nickname={nickname}
            avatarUrl={avatarUrl}
            onSaveProfile={(newName, newAvatar) => {
              setNickname(newName)
              setAvatarUrl(newAvatar)
            }}
            themeColor={themeColor}
            onChangeThemeColor={handleChangeThemeColor}
            mapStyle={mapStyle}
            onChangeMapStyle={handleChangeMapStyle}
          />
        </div>
      )}

      <BottomNav activeTab={activeTab} onChange={handleTabChange} />

      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => {
          setIsBottomSheetOpen(false)
          setSelectedPin(null)
          setTempLocation(null)
          setSearchCircle(null)
        }}
        pin={selectedPin}
        onSave={handleSavePin}
        onDelete={handleDeletePin}
        onSearchRadiusChange={setSearchCircle}
        onStartAiSelect={handleStartAiSelect}
      />

      {/* 思い出専用ビュー */}
      <MemoryView
        pin={memoryPin}
        memories={memories}
        onClose={() => setMemoryPin(null)}
        onEdit={handleOpenSheet}
        onChange={handleMemoryChange}
      />

      {/* 「思い出に変更しますか？」確認ダイアログ */}
      {confirmVisitPin && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmVisitPin(null)} />
          <div className="relative bg-[var(--surface)] rounded-3xl shadow-2xl w-full max-w-xs p-6 text-center">
            <div className="text-base font-bold text-[var(--text-strong)] mb-1">思い出に変更しますか？</div>
            <div className="text-sm text-[var(--text-muted)] mb-5 truncate">{confirmVisitPin.title || '無題のスポット'}</div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmVisitPin(null)}
                className="flex-1 py-3 rounded-2xl font-bold text-[var(--text-strong)] bg-[var(--surface-sunken)] border border-[var(--border-soft)] active:opacity-80"
              >
                いいえ
              </button>
              <button
                onClick={() => { handleQuickVisit(confirmVisitPin); setConfirmVisitPin(null) }}
                className="flex-1 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-orange-400 to-amber-500 shadow-md active:scale-[0.98]"
              >
                はい
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </APIProvider>
  )
}
