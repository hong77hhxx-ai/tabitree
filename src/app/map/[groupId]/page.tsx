'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase, Pin, MemberLocation, getUserId, addStoredGroup } from '@/lib/supabase'
import BottomSheet from '@/components/BottomSheet'
import Timeline from '@/components/Timeline'
import CountdownWidget from '@/components/CountdownWidget'
import NicknameModal from '@/components/NicknameModal'
import BottomNav from '@/components/BottomNav'
import HereWidget from '@/components/HereWidget'
import Settings, { MapTheme } from '@/components/Settings'
import AiSearchOverlay from '@/components/AiSearchOverlay'
import GroupsList from '@/components/GroupsList'

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false })

const LOCATION_TTL_MS = 5 * 60 * 1000 // 5分以上更新がなければ非表示
const SHARE_INTERVAL_MS = 15_000

export default function MapPage() {
  const params = useParams()
  const groupId = params.groupId as string

  const [pins, setPins] = useState<Pin[]>([])
  const [selectedPin, setSelectedPin] = useState<Partial<Pin> | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number} | null>(null)
  const [centerLocation, setCenterLocation] = useState<{lat: number, lng: number} | null>(null)
  const [popupPin, setPopupPin] = useState<Pin | null>(null)
  const [activeTab, setActiveTab] = useState<'map' | 'groups' | 'timeline' | 'settings'>('map')
  const [mapTheme, setMapTheme] = useState<MapTheme>('default')
  const [searchCircle, setSearchCircle] = useState<{lat: number, lng: number, radiusKm: number} | null>(null)
  const [aiSelect, setAiSelect] = useState<{lat: number, lng: number, category: string} | null>(null)

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
    // マップ色テーマを復元
    const savedTheme = localStorage.getItem('tabitree_map_theme') as MapTheme | null
    if (savedTheme) setMapTheme(savedTheme)
    // このマップを参加一覧に追加（共有リンク経由でも記録）
    if (groupId) {
      supabase.from('groups').select('id, name, color').eq('id', groupId).single()
        .then(({ data }) => {
          if (data) addStoredGroup({ id: data.id, name: data.name, color: data.color })
        })
    }
  }, [])

  const handleChangeMapTheme = (theme: MapTheme) => {
    setMapTheme(theme)
    localStorage.setItem('tabitree_map_theme', theme)
  }

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

  const handleAddPin = (lat: number, lng: number) => {
    setPopupPin(null)
    setTempLocation({ lat, lng })
    setSelectedPin({ lat, lng })
    setIsBottomSheetOpen(true)
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

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100 flex flex-col">
      {showNicknameModal && (
        <NicknameModal onConfirm={(name, avatar) => {
          setNickname(name)
          setAvatarUrl(avatar)
          setShowNicknameModal(false)
        }} />
      )}

      {/* マップ画面 */}
      <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'map' ? 'flex' : 'hidden'}`}>
        <CountdownWidget pins={pins} onPinSelect={handleShowPopup} />
        <div className="relative flex-1 min-h-0">
          <MapComponent
            pins={pins}
            onAddPin={handleAddPin}
            onOpenSheet={handleOpenSheet}
            popupPin={popupPin}
            onClosePopup={() => setPopupPin(null)}
            centerLocation={centerLocation}
            userLocation={userLocation}
            memberLocations={memberLocations}
            searchCircle={searchCircle}
            mapTheme={mapTheme}
          />
          <HereWidget pins={pins} onSelectPin={handleShowPopup} />
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

      {/* タイムライン画面 */}
      <div className={`flex-1 min-h-0 overflow-hidden ${activeTab === 'timeline' ? 'flex flex-col' : 'hidden'}`}>
        <Timeline
          pins={pins}
          onSelectPin={handleShowPopup}
          onDeletePin={handleDeletePin}
        />
      </div>

      {/* グループ画面 */}
      <div className={`flex-1 min-h-0 overflow-hidden ${activeTab === 'groups' ? 'flex flex-col' : 'hidden'}`}>
        <GroupsList currentGroupId={groupId} />
      </div>

      {/* 設定画面 */}
      <div className={`flex-1 min-h-0 overflow-hidden ${activeTab === 'settings' ? 'flex flex-col' : 'hidden'}`}>
        <Settings
          nickname={nickname}
          avatarUrl={avatarUrl}
          onSaveProfile={(newName, newAvatar) => {
            setNickname(newName)
            setAvatarUrl(newAvatar)
          }}
          mapTheme={mapTheme}
          onChangeMapTheme={handleChangeMapTheme}
        />
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />

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
    </div>
  )
}
