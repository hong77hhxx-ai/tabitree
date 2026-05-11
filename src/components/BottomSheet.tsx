'use client'

import { Pin, uploadPhoto } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, MapPin, Utensils, Bed, Camera, Droplets, Sparkles, Loader2, ImagePlus, CheckCircle, Heart, ThumbsUp, Smile, Navigation, Calendar, Clock } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'

type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  pin: Partial<Pin> | null
  onSave: (pin: Partial<Pin>) => void
}

const CATEGORIES = [
  { id: 'Eat', icon: <Utensils size={18} />, label: '食べる', bgClass: 'bg-[var(--color-eat)]', textClass: 'text-rose-800', ringClass: 'ring-rose-300' },
  { id: 'Stay', icon: <Bed size={18} />, label: '泊まる', bgClass: 'bg-[var(--color-stay)]', textClass: 'text-emerald-800', ringClass: 'ring-emerald-300' },
  { id: 'Sightseeing', icon: <Camera size={18} />, label: '観光', bgClass: 'bg-[var(--color-sightseeing)]', textClass: 'text-sky-800', ringClass: 'ring-sky-300' },
  { id: 'Onsen', icon: <Droplets size={18} />, label: '温泉', bgClass: 'bg-[var(--color-onsen)]', textClass: 'text-amber-800', ringClass: 'ring-amber-300' },
]

const STATUSES = ['Planned', 'Confirmed', 'Visited']

export default function BottomSheet({ isOpen, onClose, pin, onSave }: BottomSheetProps) {
  const [formData, setFormData] = useState<Partial<Pin>>({})
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 絵文字の定義
  const EMOJIS = [
    { icon: <Heart size={16} />, label: '❤️', id: 'heart' },
    { icon: <ThumbsUp size={16} />, label: '👍', id: 'like' },
    { icon: <Smile size={16} />, label: '😋', id: 'yummy' },
  ]

  useEffect(() => {
    if (pin) {
      setFormData({
        ...pin,
        category: pin.category || 'Eat',
        status: pin.status || 'Planned',
        title: pin.title || '',
        notes: pin.notes || '',
        photo_url: pin.photo_url || null,
        reactions: pin.reactions || {},
        scheduled_at: pin.scheduled_at || null,
      })
      setSuggestions([])
    }
  }, [pin])

  const handleChange = (field: keyof Pin, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleReaction = (emojiId: string) => {
    setFormData(prev => {
      const currentReactions = prev.reactions || {}
      const currentCount = currentReactions[emojiId] || 0
      return {
        ...prev,
        reactions: { ...currentReactions, [emojiId]: currentCount + 1 }
      }
    })
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !pin?.id) return

    setIsUploading(true)
    const url = await uploadPhoto(file, pin.id)
    setIsUploading(false)

    if (url) {
      handleChange('photo_url', url)
    } else {
      alert('写真のアップロードに失敗しました。')
    }
  }

  const handleCheckIn = () => {
    handleChange('status', 'Visited')
  }

  const handleNavigate = () => {
    const lat = pin?.lat || formData.lat
    const lng = pin?.lng || formData.lng
    if (!lat || !lng) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, '_blank')
  }

  const handleAddToCalendar = () => {
    if (!formData.title || !formData.scheduled_at) return
    
    const startTime = new Date(formData.scheduled_at).toISOString().replace(/-|:|\.\d\d\d/g, "")
    const endTime = new Date(new Date(formData.scheduled_at).getTime() + 3600000).toISOString().replace(/-|:|\.\d\d\d/g, "")
    
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(formData.title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(formData.notes || '')}&location=${pin?.lat},${pin?.lng}`
    window.open(url, '_blank')
  }

  const handleSave = () => {
    const dataToSave = { ...formData }
    if (dataToSave.scheduled_at) {
      // ローカル時間をISO文字列に変換（タイムゾーン情報を含める）
      dataToSave.scheduled_at = new Date(dataToSave.scheduled_at).toISOString()
    }
    onSave(dataToSave)
  }

  const handleSuggest = async () => {
    if (!pin?.lat || !pin?.lng) return
    
    setIsSuggesting(true)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: pin.lat,
          lng: pin.lng,
          category: formData.category
        })
      })
      const data = await res.json()
      if (data.suggestions) {
        setSuggestions(data.suggestions)
      } else if (data.error) {
        alert(`エラー: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error)
      alert('AIからの提案の取得に失敗しました。')
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleApplySuggestion = (suggestion: any) => {
    onSave({
      title: suggestion.name,
      category: suggestion.category,
      notes: suggestion.reason,
      status: 'Planned',
      lat: suggestion.lat,
      lng: suggestion.lng,
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-xl z-50 p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <MapPin className="text-[var(--color-primary)]" />
                {pin?.id ? 'スポットを編集' : '新しいスポット'}
              </h2>
              <div className="flex items-center gap-2">
                {pin?.id && (
                  <button 
                    onClick={handleNavigate}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1 px-3 text-xs font-bold shadow-sm"
                  >
                    <Navigation size={14} />
                    ナビする
                  </button>
                )}
                <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-4 mt-2">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-600">カテゴリ</label>
                  {!pin?.id && (
                    <button 
                      onClick={handleSuggest}
                      disabled={isSuggesting}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                      {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      Magic Suggest ✨
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleChange('category', cat.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                        formData.category === cat.id 
                          ? `${cat.bgClass} ${cat.textClass} font-bold ring-2 ring-offset-1 ${cat.ringClass}` 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {cat.icon}
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {suggestions.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-indigo-100 p-1.5 rounded-lg">
                        <Sparkles size={16} className="text-indigo-600" />
                      </div>
                      <label className="block text-sm font-bold text-gray-800">AIのおすすめスポット</label>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                      {suggestions.map((s, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => handleApplySuggestion(s)}
                          className="min-w-[280px] flex-shrink-0 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer group"
                        >
                          <div className="relative h-32 w-full bg-gray-100">
                            <img 
                              src={`https://loremflickr.com/400/300/${encodeURIComponent(s.imageSearchTerm || s.name)}?random=${idx}`} 
                              alt={s.name}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                // フォールバック: カテゴリに基づいた一般的な写真
                                (e.target as HTMLImageElement).src = `https://loremflickr.com/400/300/${s.category.toLowerCase()},travel?random=${idx}`;
                              }}
                            />
                            <div className="absolute top-2 right-2">
                              <div className={`text-[10px] font-bold text-white px-2 py-1 rounded-full border border-white/20 shadow-lg backdrop-blur-md ${
                                s.category === 'Eat' ? 'bg-rose-500/80' :
                                s.category === 'Stay' ? 'bg-emerald-500/80' :
                                s.category === 'Sightseeing' ? 'bg-sky-500/80' :
                                s.category === 'Onsen' ? 'bg-amber-500/80' : 'bg-gray-500/80'
                              }`}>
                                {CATEGORIES.find(c => c.id === s.category)?.label || s.category}
                              </div>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="font-bold text-base text-gray-900 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">{s.name}</div>
                            <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">{s.reason}</div>
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                                <Sparkles size={12} className="animate-pulse" />
                                AIが選んだスポット
                              </div>
                              <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                <Save size={14} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">タイトル</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="お店や場所の名前"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:bg-white transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">ステータス</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  {STATUSES.map(status => (
                    <button
                      key={status}
                      onClick={() => handleChange('status', status)}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                        formData.status === status
                          ? 'bg-white text-[var(--color-primary)] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {status === 'Planned' ? '行きたい' : status === 'Confirmed' ? '予約済/確定' : '行った'}
                    </button>
                  ))}
                </div>
              </div>

              {/* チェックインボタン */}
              {formData.status === 'Confirmed' && pin?.id && (
                <button
                  onClick={handleCheckIn}
                  className="w-full py-4 bg-gradient-to-r from-emerald-400 to-teal-500 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <CheckCircle size={24} />
                  チェックイン✨ (訪問を記録)
                </button>
              )}

              {/* 訪問済の場合：写真とスタンプ */}
              {formData.status === 'Visited' && (
                <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl space-y-4 mt-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold text-gray-700">📸 思い出の写真</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handlePhotoUpload}
                      disabled={isUploading || !pin?.id}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || !pin?.id}
                      className="flex items-center gap-1 text-xs font-bold bg-white text-orange-600 px-3 py-1.5 rounded-full border border-orange-200 shadow-sm hover:bg-orange-50 disabled:opacity-50 transition-all"
                    >
                      {isUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                      {formData.photo_url ? '写真を変更' : '写真を追加'}
                    </button>
                  </div>
                  
                  {formData.photo_url && (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
                      <img src={formData.photo_url} alt="思い出の写真" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {!formData.photo_url && !isUploading && (
                    <div className="w-full aspect-video rounded-lg border-2 border-dashed border-orange-200 bg-orange-50 flex flex-col items-center justify-center text-orange-400">
                      <ImagePlus size={32} className="mb-2 opacity-50" />
                      <span className="text-sm font-medium">まだ写真がありません</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-orange-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2">みんなのスタンプ</label>
                    <div className="flex gap-2">
                      {EMOJIS.map(emoji => {
                        const count = formData.reactions?.[emoji.id] || 0
                        return (
                          <button
                            key={emoji.id}
                            onClick={() => handleReaction(emoji.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 shadow-sm"
                          >
                            <span className="text-base">{emoji.label}</span>
                            {count > 0 && <span className="text-xs font-bold text-gray-600">{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">予定日時</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Calendar size={16} />
                    </div>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_at ? format(new Date(formData.scheduled_at), "yyyy-MM-dd'T'HH:mm") : ''}
                      onChange={e => handleChange('scheduled_at', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:bg-white transition-all text-sm text-gray-800"
                    />
                  </div>
                  {formData.scheduled_at && (
                    <button
                      onClick={handleAddToCalendar}
                      className="px-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-1 text-xs font-bold"
                      title="Googleカレンダーに追加"
                    >
                      <Calendar size={14} />
                      追加
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">メモ (任意)</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="営業時間、食べたいメニューなど"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:bg-white transition-all text-gray-800 resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!formData.title}
              className="mt-4 w-full bg-[var(--color-primary)] hover:opacity-90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Save size={20} />
              保存する
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
