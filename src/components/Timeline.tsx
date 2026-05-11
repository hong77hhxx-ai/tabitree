'use client'

import { Pin } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, differenceInDays, differenceInHours } from 'date-fns'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MapPin, Utensils, Bed, Camera, Droplets, ChevronUp, ChevronDown, ImageIcon, Heart, ThumbsUp, Smile, Clock, Trash2 } from 'lucide-react'
import { useState } from 'react'

type TimelineProps = {
  pins: Pin[]
  onSelectPin: (pin: Pin) => void
  onDeletePin: (pinId: string) => void
}

export default function Timeline({ pins, onSelectPin, onDeletePin }: TimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'recent' | 'history'>('recent')
  
  // 最新順にソートして5件表示 (Plan)
  const recentPins = [...pins]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // 訪問済みのピン (History)
  const visitedPins = [...pins]
    .filter(p => p.status === 'Visited')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (pins.length === 0) return null

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Eat': return <Utensils size={14} className="text-rose-600" />
      case 'Stay': return <Bed size={14} className="text-emerald-600" />
      case 'Sightseeing': return <Camera size={14} className="text-sky-600" />
      case 'Onsen': return <Droplets size={14} className="text-amber-600" />
      default: return <MapPin size={14} className="text-teal-600" />
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
    <div className="absolute top-4 left-4 z-10 w-64">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 overflow-hidden transition-all">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 text-sm font-bold text-gray-700 bg-white/50 hover:bg-white/80 transition-colors"
        >
          <span>タイムライン</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex border-b border-gray-100">
                <button 
                  onClick={() => setActiveTab('recent')}
                  className={`flex-1 py-2 text-xs font-bold transition-colors ${activeTab === 'recent' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}
                >
                  最近の追加
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 py-2 text-xs font-bold transition-colors ${activeTab === 'history' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-gray-400'}`}
                >
                  思い出 ({visitedPins.length})
                </button>
              </div>

              <div className="p-2 space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
                {activeTab === 'recent' && recentPins.map(pin => (
                  <div 
                    key={pin.id}
                    onClick={() => onSelectPin(pin)}
                    className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <div className={`mt-0.5 p-1.5 rounded-full ${getCategoryColor(pin.category)} flex-shrink-0`}>
                      {getCategoryIcon(pin.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-800 truncate flex items-center gap-2">
                        {pin.title}
                        {pin.scheduled_at && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                            <Clock size={10} />
                            {differenceInHours(parseISO(pin.scheduled_at), new Date()) >= 24 
                              ? `あと ${differenceInDays(parseISO(pin.scheduled_at), new Date()) + 1}日`
                              : `予定 ${format(parseISO(pin.scheduled_at), 'HH:mm')}`
                            }
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(pin.created_at), { addSuffix: true, locale: ja })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('このスポットを削除してもよろしいですか？')) {
                          onDeletePin(pin.id);
                        }
                      }}
                      className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {activeTab === 'history' && visitedPins.map(pin => (
                  <div 
                    key={pin.id}
                    onClick={() => onSelectPin(pin)}
                    className="flex flex-col gap-2 p-2 rounded-xl hover:bg-orange-50/50 cursor-pointer transition-colors border border-transparent hover:border-orange-100 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-full bg-orange-100 text-orange-600 flex-shrink-0`}>
                        {getCategoryIcon(pin.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-800 truncate flex items-center gap-2">
                          {pin.title}
                          {pin.scheduled_at && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                              <Clock size={10} />
                              {differenceInHours(parseISO(pin.scheduled_at), new Date()) >= 24 
                                ? `あと ${differenceInDays(parseISO(pin.scheduled_at), new Date()) + 1}日`
                                : `予定 ${format(parseISO(pin.scheduled_at), 'HH:mm')}`
                              }
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(pin.created_at), { addSuffix: true, locale: ja })}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('このスポットを削除してもよろしいですか？')) {
                            onDeletePin(pin.id);
                          }
                        }}
                        className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="削除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    {pin.photo_url && (
                      <div className="w-full aspect-video rounded-lg overflow-hidden mt-1 relative">
                        <img src={pin.photo_url} alt="memory" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                      </div>
                    )}
                    {!pin.photo_url && pin.notes && (
                      <div className="text-xs text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
                        {pin.notes}
                      </div>
                    )}

                    {/* スタンププレビュー */}
                    {pin.reactions && Object.keys(pin.reactions).length > 0 && (
                      <div className="flex gap-1.5 mt-1">
                        {Object.entries(pin.reactions).map(([emoji, count]) => {
                          const icon = emoji === 'heart' ? '❤️' : emoji === 'like' ? '👍' : '😋'
                          return count > 0 ? (
                            <div key={emoji} className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-200 text-[10px] shadow-sm">
                              <span>{icon}</span><span className="font-bold text-gray-600">{count as number}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                ))}
                
                {activeTab === 'history' && visitedPins.length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-6">
                    まだ思い出はありません。<br/>ピンをチェックインして写真を残しましょう！
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
