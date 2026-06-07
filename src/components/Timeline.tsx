'use client'

import { Pin, supabase, SavedRoute } from '@/lib/supabase'
import { googleMapsDirUrl } from '@/lib/route'
import { format, parseISO, differenceInDays, differenceInHours } from 'date-fns'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MapPin, Utensils, Bed, Camera, Droplets, Clock, Trash2, ImageIcon, Route as RouteIcon, Footprints, Car, ChevronRight, Navigation } from 'lucide-react'
import { useState, useEffect } from 'react'

type TimelineProps = {
  pins: Pin[]
  groupId: string
  onSelectPin: (pin: Pin) => void
  onDeletePin: (pinId: string) => void
  onSelectRoute?: (route: SavedRoute) => void
}

export default function Timeline({ pins, groupId, onSelectPin, onDeletePin, onSelectRoute }: TimelineProps) {
  const [activeTab, setActiveTab] = useState<'recent' | 'history' | 'route'>('recent')
  const [routes, setRoutes] = useState<SavedRoute[]>([])
  const [routesLoading, setRoutesLoading] = useState(false)

  useEffect(() => {
    if (!groupId) return
    setRoutesLoading(true)
    supabase.from('routes').select('*').eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRoutes((data as SavedRoute[]) || [])
        setRoutesLoading(false)
      })
  }, [groupId])

  const handleDeleteRoute = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!window.confirm('このルートを削除しますか？')) return
    await supabase.from('routes').delete().eq('id', id)
    setRoutes(prev => prev.filter(r => r.id !== id))
  }

  const recentPins = [...pins]
    .filter(p => p.status !== 'Visited' && p.category !== 'Here')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const visitedPins = [...pins]
    .filter(p => p.status === 'Visited' && p.category !== 'Here')
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
    <div className="flex flex-col h-full bg-[var(--surface-muted)]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* ヘッダー */}
      <div className="bg-[var(--surface)] border-b border-[var(--border-soft)] px-4 pt-5 pb-0 flex-shrink-0">
        <h1 className="text-xl font-bold text-[var(--text-strong)] mb-3">タイムライン</h1>
        <div className="flex">
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'recent'
                ? 'border-[var(--color-primary)] text-[var(--accent-strong)]'
                : 'border-transparent text-[var(--text-muted)]'
            }`}
          >
            スポット一覧 ({recentPins.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-orange-400 text-orange-600'
                : 'border-transparent text-[var(--text-muted)]'
            }`}
          >
            思い出 ({visitedPins.length})
          </button>
          <button
            onClick={() => setActiveTab('route')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'route'
                ? 'border-[#dc2626] text-[#dc2626]'
                : 'border-transparent text-[var(--text-muted)]'
            }`}
          >
            ルート ({routes.length})
          </button>
        </div>
      </div>

      {/* リスト */}
      <div className="flex-1 overflow-y-auto scroll-touch scrollbar-hide">
        {activeTab === 'recent' && (
          <div className="p-4 space-y-3">
            {recentPins.length === 0 && (
              <div className="text-center text-[var(--text-muted)] py-20 text-sm leading-relaxed">
                まだスポットがありません。<br />マップを長押しして追加しましょう！
              </div>
            )}
            {recentPins.map(pin => (
              <div
                key={pin.id}
                onClick={() => onSelectPin(pin)}
                className="bg-[var(--surface)] rounded-2xl px-4 py-4 shadow-sm border border-[var(--border-soft)] flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all group"
              >
                <div className={`p-3 rounded-xl ${getCategoryColor(pin.category)} flex-shrink-0`}>
                  {getCategoryIcon(pin.category, 18)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[var(--text-strong)] text-base truncate">{pin.title}</div>
                  {pin.creator_name && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-[var(--color-primary)] text-white text-[9px] font-bold flex-shrink-0">
                        {pin.creator_avatar
                          ? <img src={pin.creator_avatar} alt={pin.creator_name} className="w-full h-full object-cover" />
                          : pin.creator_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-[var(--text-muted)] truncate">{pin.creator_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                      行きたい
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
                  className="p-2.5 text-gray-300 hover:text-rose-500 active:text-rose-500 hover:bg-rose-50 rounded-xl transition-all flex-shrink-0"
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
              <div className="text-center text-[var(--text-muted)] py-20 text-sm leading-relaxed">
                まだ思い出はありません。<br />「思い出にする」で写真を残しましょう！
              </div>
            )}
            {visitedPins.map(pin => (
              <div
                key={pin.id}
                onClick={() => onSelectPin(pin)}
                className="bg-[var(--surface)] rounded-2xl overflow-hidden shadow-sm border border-[var(--border-soft)] cursor-pointer active:scale-[0.98] transition-all group"
              >
                {pin.photo_url ? (
                  <div className="w-full h-48 relative">
                    <img src={pin.photo_url} alt={pin.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-12">
                      <div className="text-white font-bold text-lg truncate">{pin.title}</div>
                      <div className="text-white/70 text-xs mt-0.5 flex items-center gap-1.5">
                        {pin.creator_name && (
                          <span className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full overflow-hidden inline-flex items-center justify-center bg-white/25 text-[8px] font-bold">
                              {pin.creator_avatar
                                ? <img src={pin.creator_avatar} alt={pin.creator_name} className="w-full h-full object-cover" />
                                : pin.creator_name.charAt(0).toUpperCase()}
                            </span>
                            {pin.creator_name}・
                          </span>
                        )}
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

        {activeTab === 'route' && (
          <div className="p-4 space-y-3">
            {routesLoading ? (
              <div className="py-20 text-center text-[var(--text-muted)] text-sm">読み込み中...</div>
            ) : routes.length === 0 ? (
              <div className="text-center text-[var(--text-muted)] py-20 text-sm leading-relaxed">
                保存されたルートはありません。<br />マップの「ルート」ボタンから作成・保存できます。
              </div>
            ) : (
              routes.map(route => {
                const stopTitles = route.pin_ids
                  .map(id => pins.find(p => p.id === id)?.title)
                  .filter(Boolean)
                  .join(' → ')
                const km = route.total_distance_m != null ? (route.total_distance_m / 1000).toFixed(1) : '-'
                const min = route.total_duration_s != null ? Math.max(1, Math.round(route.total_duration_s / 60)) : '-'
                const navUrl = googleMapsDirUrl(
                  route.pin_ids
                    .map(id => pins.find(p => p.id === id))
                    .filter(Boolean)
                    .map(p => ({ lat: (p as Pin).lat, lng: (p as Pin).lng })),
                  route.mode,
                )
                return (
                  <div
                    key={route.id}
                    onClick={() => onSelectRoute?.(route)}
                    className="bg-[var(--surface)] rounded-2xl px-4 py-4 shadow-sm border border-[var(--border-soft)] cursor-pointer active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#dc2626]/10 flex items-center justify-center flex-shrink-0">
                        <RouteIcon size={16} className="text-[#dc2626]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[var(--text-strong)] text-base truncate">{route.name}</div>
                      </div>
                      <button
                        onClick={e => handleDeleteRoute(e, route.id)}
                        className="p-2 text-gray-300 hover:text-rose-500 active:text-rose-500 rounded-lg transition-all flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={18} className="text-[var(--text-muted)] flex-shrink-0" />
                    </div>

                    {/* メタ情報 */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                      <span className="flex items-center gap-1 bg-[#dc2626]/10 text-[#dc2626] px-2 py-0.5 rounded-full font-bold">
                        {route.mode === 'WALKING' ? <Footprints size={12} /> : <Car size={12} />}
                        {route.mode === 'WALKING' ? '徒歩' : '車'}
                      </span>
                      <span className="text-[var(--text-muted)] font-bold">{km}km・{min}分</span>
                      <span className="text-[var(--text-muted)]">{route.pin_ids.length}スポット</span>
                    </div>

                    {stopTitles && (
                      <div className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2 leading-relaxed">{stopTitles}</div>
                    )}

                    {/* Googleマップでナビ */}
                    {navUrl && (
                      <a
                        href={navUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="mt-2.5 w-full bg-[#1a73e8] active:opacity-90 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm transition-all"
                      >
                        <Navigation size={16} />
                        Googleマップでナビ
                      </a>
                    )}

                    {/* 作成者 */}
                    {route.creator_name && (
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[var(--border-soft)]">
                        <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-[var(--color-primary)] text-white text-[9px] font-bold flex-shrink-0">
                          {route.creator_avatar
                            ? <img src={route.creator_avatar} alt={route.creator_name} className="w-full h-full object-cover" />
                            : route.creator_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">
                          <span className="font-bold text-[var(--text-strong)]">{route.creator_name}</span> が作成
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] ml-auto">
                          {formatDistanceToNow(new Date(route.created_at), { addSuffix: true, locale: ja })}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
