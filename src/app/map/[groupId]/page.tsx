'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase, Pin, MemberLocation, getUserId } from '@/lib/supabase'
import BottomSheet from '@/components/BottomSheet'
import Timeline from '@/components/Timeline'
import CountdownWidget from '@/components/CountdownWidget'
import NicknameModal from '@/components/NicknameModal'

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

  const [nickname, setNickname] = useState<string | null>(null)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [memberLocations, setMemberLocations] = useState<MemberLocation[]>([])

  const userLocationRef = useRef<{lat: number, lng: number} | null>(null)

  // ニックネーム確認
  useEffect(() => {
    const saved = localStorage.getItem('tabitree_nickname')
    if (saved) setNickname(saved)
    else setShowNicknameModal(true)
  }, [])

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
      if (!loc) return
      await supabase.from('member_locations').upsert({
        group_id: groupId,
        user_id: userId,
        nickname,
        lat: loc.lat,
        lng: loc.lng,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'group_id,user_id' })
    }

    share()
    const interval = setInterval(share, SHARE_INTERVAL_MS)

    const cleanup = async () => {
      clearInterval(interval)
      await supabase.from('member_locations').delete()
        .eq('group_id', groupId).eq('user_id', userId)
    }
    window.addEventListener('beforeunload', cleanup)
    return () => {
      cleanup()
      window.removeEventListener('beforeunload', cleanup)
    }
  }, [nickname, groupId])

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

    const channel = supabase
      .channel('member_locations')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'member_locations',
        filter: `group_id=eq.${groupId}`
      }, fetchLocations)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
    setPopupPin(pin)
    setCenterLocation({ lat: pin.lat, lng: pin.lng })
  }

  const handleOpenSheet = (pin: Pin) => {
    setSelectedPin(pin)
    setIsBottomSheetOpen(true)
    setPopupPin(null)
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
      const { error } = await supabase.from('pins').insert([{
        group_id: groupId,
        lat: pinData.lat ?? tempLocation?.lat,
        lng: pinData.lng ?? tempLocation?.lng,
        title: pinData.title,
        category: pinData.category,
        status: pinData.status,
        notes: pinData.notes,
        photo_url: pinData.photo_url,
        reactions: pinData.reactions,
        scheduled_at: pinData.scheduled_at,
      }])
      if (error) console.error(error)
    }
    setIsBottomSheetOpen(false)
    setSelectedPin(null)
    setTempLocation(null)
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
        <NicknameModal onConfirm={(name) => {
          setNickname(name)
          setShowNicknameModal(false)
        }} />
      )}

      <CountdownWidget pins={pins} onPinSelect={handleShowPopup} />
      <Timeline pins={pins} onSelectPin={handleShowPopup} onDeletePin={handleDeletePin} />

      <MapComponent
        pins={pins}
        onAddPin={handleAddPin}
        onOpenSheet={handleOpenSheet}
        popupPin={popupPin}
        onClosePopup={() => setPopupPin(null)}
        centerLocation={centerLocation}
        userLocation={userLocation}
        memberLocations={memberLocations}
      />

      <BottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => {
          setIsBottomSheetOpen(false)
          setSelectedPin(null)
          setTempLocation(null)
        }}
        pin={selectedPin}
        onSave={handleSavePin}
        onDelete={handleDeletePin}
      />
    </div>
  )
}
