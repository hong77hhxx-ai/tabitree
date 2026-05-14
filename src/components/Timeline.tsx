'use client'

import { Pin } from '@/lib/supabase'
import { format, parseISO, differenceInDays, differenceInHours } from 'date-fns'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MapPin, Utensils, Bed, Camera, Droplets, Clock, Trash2, ImageIcon } from 'lucide-react'
import { useState } from 'react'

type TimelineProps = {
  pins: Pin[]
  onSelectPin: (pin: Pin) => void
  onDeletePin: (pinId: string) => void
}

export default function Timeline({ pins, onSelectPin, onDeletePin }: TimelineProps) {
  const [activeTab, setActiveTab] = useState<'recent' | 'history'>('recent')

  const recentPins = [...pins]
    .filter(p => p.status !== 'Visited')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const visitedPins = [...pins]
    .filter(p => p.status === 'Visited')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const getCategoryIcon = (category: string, size = 16) => {
    switch (category) {
      case 'Eat': return <Utensils size={size} className="text-rose-600" />
      case 'Stay': return <Bed size={size} className="text-emerald-600" />
      case 'Sightseeing': return <Camera size={size} className="text-sky-600" />
      case 'Onsen': return <Droplets size={size} className="text-amber-600" />
      default: return <MapPin size={size} className="text-teal-600" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Eat': return 'bg-[var(--color-eat)]'
      case 'Stay': return 'bg-[var(--color-stay)]'
      case 'Sightseeing': return 'bg-[var(--color-sightseeing)]'
      case 'Onsen': return 'bg-[var(--color-onsen)]'
      default: return 'bg-[var(--color-primary)]'
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fcfb]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-0 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-800 mb-3">タイムライン</h1>
        <div className="flex">
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'recent'
                ? 'border-[var(--color-primary)] text-teal-700'
                : 'border-transparent text-gray-400'
            }`}
          >
            スポット一覧 ({recentPins.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-orange-400 text-orange-600'
                : 'border-transparent text-gray-400'
            }`}
          >
            思い出 ({visitedPins.length})
          </button>
        </div>
      </div>

      {/* リスト */}
      <div className="flex-1 overflow-y-auto scroll-touch scrollbar-hide">
        {activeTab === 'recent' && (
          <div className="p-4 space-y-3">
            {recentPins.length === 0 && (
              <div className="text-center text-gray-400 py-20 text-sm leading-relaxed">
                まだスポットがありません。<br />マップを長押しして追加しましょう！
              </div>
            )}
            {recentPins.map(pin => (
              <div
                key={pin.id}
                onClick={() => onSelectPin(pin)}
                className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all group"
              >
                <div className={`p-3 rounded-xl ${getCategoryColor(pin.category)} flex-shrink-0`}>
                  {getCategoryIcon(pin.category, 18)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 text-base truncate">{pin.title}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      pin.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {pin.status === 'Planned' ? '行きたい' : '予約済'}
                    </span>
                    {pin.scheduled_at && (
                      <span className="text-xs bg-indigo-50 text-indigo-500 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                        <Clock size={11} />
                        {differenceInHours(parseISO(pin.scheduled_at), new Date()) >= 24
                          ? `あと${differenceInDays(parseISO(pin.scheduled_at), new Date()) + 1}日`
                          : format(parseISO(pin.scheduled_at), 'M/d HH:mm')
                        }
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(pin.created_at), { addSuffix: true, locale: ja })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    if (window.confirm('このスポットを削除しますか？')) onDeletePin(pin.id)
                  }}
                  className="p-2.5 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:opacity-100 flex-shrink-0"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-4 space-y-4">
            {visitedPins.length === 0 && (
              <div className="text-center text-gray-400 py-20 text-sm leading-relaxed">
                まだ思い出はありません。<br />チェックインして写真を残しましょう！
              </div>
            )}
            {visitedPins.map(pin => (
              <div
                key={pin.id}
                onClick={() => onSelectPin(pin)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all group"
              >
                {pin.photo_url ? (
                  <div className="w-full h-48 relative">
                    <img src={pin.photo_url} alt={pin.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-12">
                      <div className="text-white font-bold text-lg truncate">{pin.title}</div>
                      <div className="text-white/70 text-xs mt-0.5">
                        {formatDistanceToNow(new Date(pin.created_at), { addSuffix: true, locale: ja })}
                      </div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (window.confirm('このスポットを削除しますか？')) onDeletePin(pin.id)
                      }}
                      className="absolute bottom-3 right-3 p-2 bg-black/30 text-white/60 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-28 bg-orange-50 flex items-center justify-center relative">
                    <ImageIcon size={36} className="text-orange-200" />
                    <div className="absolute bottom-2 left-4 right-10">
                      <div className="font-bold text-gray-700 truncate">{pin.title}</div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (window.confirm('このスポットを削除しますか？')) onDeletePin(pin.id)
                      }}
                      className="absolute bottom-2 right-2 p-2 text-gray-300 hover:text-rose-500 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                {pin.reactions && Object.values(pin.reactions).some(v => (v as number) > 0) && (
                  <div className="px-4 py-2.5 flex items-center gap-2">
                    {Object.entries(pin.reactions).map(([emoji, count]) => {
                      const icon = emoji === 'heart' ? '❤️' : emoji === 'like' ? '👍' : '😋'
                      return (count as number) > 0 ? (
                        <div key={emoji} className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100 text-xs">
                          <span>{icon}</span>
                          <span className="font-bold text-gray-600">{count as number}</span>
                        </div>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
