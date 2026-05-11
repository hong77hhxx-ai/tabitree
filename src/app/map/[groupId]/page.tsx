'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase, Pin } from '@/lib/supabase'
import BottomSheet from '@/components/BottomSheet'
import Timeline from '@/components/Timeline'
import CountdownWidget from '@/components/CountdownWidget'

// Disable SSR for MapLibre
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false })

export default function MapPage() {
  const params = useParams()
  const groupId = params.groupId as string

  const [pins, setPins] = useState<Pin[]>([])
  const [selectedPin, setSelectedPin] = useState<Partial<Pin> | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)
  const [tempLocation, setTempLocation] = useState<{lat: number, lng: number} | null>(null)

  useEffect(() => {
    if (!groupId) return

    // Fetch initial pins
    const fetchPins = async () => {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('group_id', groupId)
      
      if (!error && data) {
        setPins(data as Pin[])
      }
    }
    fetchPins()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('public:pins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pins', filter: `group_id=eq.${groupId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPins(prev => [...prev, payload.new as Pin])
        } else if (payload.eventType === 'UPDATE') {
          setPins(prev => prev.map(p => p.id === payload.new.id ? payload.new as Pin : p))
        } else if (payload.eventType === 'DELETE') {
          setPins(prev => prev.filter(p => p.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId])

  const handleAddPin = (lat: number, lng: number) => {
    setTempLocation({ lat, lng })
    setSelectedPin({ lat, lng })
    setIsBottomSheetOpen(true)
  }

  const handleSelectPin = (pin: Pin) => {
    setSelectedPin(pin)
    setIsBottomSheetOpen(true)
  }

  const handleSavePin = async (pinData: Partial<Pin>) => {
    if (pinData.id) {
      // Update
      const { error } = await supabase
        .from('pins')
        .update({
          title: pinData.title,
          category: pinData.category,
          status: pinData.status,
          notes: pinData.notes,
          photo_url: pinData.photo_url,
          reactions: pinData.reactions,
          scheduled_at: pinData.scheduled_at,
        })
        .eq('id', pinData.id)
      
      if (error) console.error(error)
    } else {
      // Insert
      const { error } = await supabase
        .from('pins')
        .insert([{
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

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100 flex flex-col">
      <CountdownWidget pins={pins} />
      <Timeline pins={pins} onSelectPin={handleSelectPin} />
      
      <MapComponent 
        pins={pins} 
        onAddPin={handleAddPin} 
        onSelectPin={handleSelectPin} 
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
      />
    </div>
  )
}
