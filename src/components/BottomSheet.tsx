'use client'

import { Pin, uploadPhoto } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, MapPin, Utensils, Bed, Camera, Droplets, Sparkles, Loader2, ImagePlus, CheckCircle, Heart, ThumbsUp, Smile, Navigation, Calendar, Clock, Trash2, Users } from 'lucide-react'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  pin: Partial<Pin> | null
  onSave: (pin: Partial<Pin>) => void
  onDelete: (pinId: string) => void
  onSearchRadiusChange?: (circle: { lat: number, lng: number, radiusKm: number } | null) => void
}

const SEARCH_RADII = [1, 5, 10, 30]

const CATEGORIES = [
  { id: 'Here', icon: <Users size={18} />, label: '今ここにいるよ', bgClass: 'bg-violet-100', textClass: 'text-violet-800', ringClass: 'ring-violet-300' },
  { id: 'Eat', icon: <Utensils size={18} />, label: '食べる', bgClass: 'bg-[var(--color-eat)]', textClass: 'text-rose-800', ringClass: 'ring-rose-300' },
  { id: 'Stay', icon: <Bed size={18} />, label: '泊まる', bgClass: 'bg-[var(--color-stay)]', textClass: 'text-emerald-800', ringClass: 'ring-emerald-300' },
  { id: 'Sightseeing', icon: <Camera size={18} />, label: '観光', bgClass: 'bg-[var(--color-sightseeing)]', textClass: 'text-sky-800', ringClass: 'ring-sky-300' },
  { id: 'Onsen', icon: <Droplets size={18} />, label: '温泉', bgClass: 'bg-[var(--color-onsen)]', textClass: 'text-amber-800', ringClass: 'ring-amber-300' },
]

const HERE_DURATIONS = [
  { label: '1時間', hours: 1 },
  { label: '3時間', hours: 3 },
  { label: '今日中', hours: null },
]

const STATUSES = ['Planned', 'Confirmed', 'Visited']

export default function BottomSheet({ isOpen, onClose, pin, onSave, onDelete, onSearchRadiusChange }: BottomSheetProps) {
  const [formData, setFormData] = useState<Partial<Pin>>({})
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showRadiusPicker, setShowRadiusPicker] = useState(false)
  const [searchedRadius, setSearchedRadius] = useState<number | null>(null)


  // 絵文字の定義
  const EMOJIS = [
    { icon: <Heart size={16} />, label: '❤️', id: 'heart' },
    { icon: <ThumbsUp size={16} />, label: '👍', id: 'like' },
    { icon: <Smile size={16} />, label: '😋', id: 'yummy' },
  ]

  const HERE_REACTIONS = [
    { label: '🚶', text: '向かってます', id: 'going' },
    { label: '⏰', text: '遅れます', id: 'late' },
    { label: '👋', text: 'いるよ！', id: 'here' },
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
      setSelectedDuration(null)
      setShowRadiusPicker(false)
      setSearchedRadius(null)
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

  const handleDelete = () => {
    if (!pin?.id) return
    if (window.confirm('このスポットを削除してもよろしいですか？')) {
      onDelete(pin.id)
    }
  }

  // AIセレクトボタン → 半径選択を表示
  const handleStartSuggest = () => {
    setSuggestions([])
    setSearchedRadius(null)
    setShowRadiusPicker(true)
  }

  // 半径を選んで検索実行
  const handleSearchWithRadius = async (radiusKm: number) => {
    if (!pin?.lat || !pin?.lng) return
    setShowRadiusPicker(false)
    setSearchedRadius(radiusKm)
    // マップに検索範囲の円を表示
    onSearchRadiusChange?.({ lat: pin.lat, lng: pin.lng, radiusKm })

    setIsSuggesting(true)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: pin.lat,
          lng: pin.lng,
          category: formData.category,
          radiusKm,
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

  // 次の半径段階を取得（範囲拡大用）
  const nextRadius = searchedRadius
    ? SEARCH_RADII.find(r => r > searchedRadius) ?? null
    : null

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
                  {!pin?.id && formData.category !== 'Here' && (
                    <button
                      onClick={handleStartSuggest}
                      disabled={isSuggesting}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                      {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      AI Select ✨
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

                {/* 半径選択 */}
                {showRadiusPicker && (
                  <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-600" />
                      <label className="block text-sm font-bold text-indigo-700">検索範囲を選んでください</label>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {SEARCH_RADII.map(r => (
                        <button
                          key={r}
                          onClick={() => handleSearchWithRadius(r)}
                          className="py-3 text-sm font-bold rounded-xl bg-white text-indigo-600 border border-indigo-200 active:bg-indigo-600 active:text-white transition-all"
                        >
                          {r}km
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 検索中 */}
                {isSuggesting && (
                  <div className="mt-4 flex flex-col items-center justify-center py-8 text-indigo-500">
                    <Loader2 size={28} className="animate-spin mb-2" />
                    <span className="text-sm font-bold">半径{searchedRadius}km以内を検索中...</span>
                  </div>
                )}

                {!isSuggesting && suggestions.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-indigo-100 p-1.5 rounded-lg">
                        <Sparkles size={16} className="text-indigo-600" />
                      </div>
                      <label className="block text-sm font-bold text-gray-800">AIのおすすめスポット（半径{searchedRadius}km）</label>
                    </div>
                    <div className="space-y-3">
                      {suggestions.map((s, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleApplySuggestion(s)}
                          className="flex gap-3 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition-all cursor-pointer group p-2"
                        >
                          {/* サムネイル写真 */}
                          <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                            <img
                              src={`https://loremflickr.com/400/300/${encodeURIComponent(s.imageSearchTerm || s.name)}?random=${idx}`}
                              alt={s.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://loremflickr.com/400/300/${s.category.toLowerCase()},travel?random=${idx}`;
                              }}
                            />
                            <div className="absolute bottom-1 left-1">
                              <div className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full shadow ${
                                s.category === 'Eat' ? 'bg-rose-500/90' :
                                s.category === 'Stay' ? 'bg-emerald-500/90' :
                                s.category === 'Sightseeing' ? 'bg-sky-500/90' :
                                s.category === 'Onsen' ? 'bg-amber-500/90' : 'bg-gray-500/90'
                              }`}>
                                {CATEGORIES.find(c => c.id === s.category)?.label || s.category}
                              </div>
                            </div>
                          </div>

                          {/* 情報 */}
                          <div className="flex-1 min-w-0 py-1 pr-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <div className="font-bold text-sm text-gray-900 line-clamp-1 group-active:text-indigo-600 transition-colors flex-1">{s.name}</div>
                                {typeof s.distanceKm === 'number' && (
                                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                    {s.distanceKm < 1 ? `${Math.round(s.distanceKm * 1000)}m` : `${s.distanceKm.toFixed(1)}km`}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed mt-0.5">{s.reason}</div>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <div className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                                <Sparkles size={11} className="animate-pulse" />
                                AIのおすすめ
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-indigo-500 px-2 py-1 rounded-full shadow-sm">
                                <Save size={11} />
                                追加して移動
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 3件未満：範囲拡大ボタン */}
                    {suggestions.length < 3 && (
                      <div className="mt-3 text-center">
                        <p className="text-xs text-gray-400 mb-2">
                          この範囲では{suggestions.length}件見つかりました
                        </p>
                        {nextRadius ? (
                          <button
                            onClick={() => handleSearchWithRadius(nextRadius)}
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2.5 rounded-xl active:bg-indigo-100 transition-all"
                          >
                            <Sparkles size={14} />
                            半径{nextRadius}kmに広げて再検索
                          </button>
                        ) : (
                          <p className="text-xs text-gray-400">これ以上範囲を広げられません</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 検索結果0件 */}
                {!isSuggesting && searchedRadius !== null && suggestions.length === 0 && (
                  <div className="mt-4 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-3">半径{searchedRadius}km以内に見つかりませんでした</p>
                    {nextRadius && (
                      <button
                        onClick={() => handleSearchWithRadius(nextRadius)}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2.5 rounded-xl active:bg-indigo-100 transition-all"
                      >
                        <Sparkles size={14} />
                        半径{nextRadius}kmに広げて再検索
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">
                  {formData.category === 'Here' ? '場所の名前（任意）' : 'タイトル'}
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder={formData.category === 'Here' ? '例: 図書館2F, 学食前' : 'お店や場所の名前'}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:bg-white transition-all text-gray-800"
                />
              </div>

              {/* Hereカテゴリ：滞在時間セレクター */}
              {formData.category === 'Here' && (
                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 space-y-3">
                  <label className="block text-sm font-bold text-violet-700">⏱ どのくらいいる？</label>
                  <div className="flex gap-2">
                    {HERE_DURATIONS.map(({ label, hours }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        const expires = hours
                          ? new Date(Date.now() + hours * 3600000).toISOString()
                          : new Date(new Date().setHours(23, 59, 59, 0)).toISOString()
                        setSelectedDuration(label)
                        handleChange('scheduled_at', expires)
                      }}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-xl border transition-all ${
                        selectedDuration === label
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-violet-600 border-violet-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  </div>
                  <p className="text-xs text-violet-400">時間が経つと自動的に消えます</p>

                  {/* Hereクイックリアクション（既存ピンのみ） */}
                  {pin?.id && (
                    <div className="pt-2 border-t border-violet-100">
                      <label className="block text-xs font-bold text-violet-600 mb-2">クイックリアクション</label>
                      <div className="flex flex-wrap gap-2">
                        {HERE_REACTIONS.map(r => {
                          const count = formData.reactions?.[r.id] || 0
                          return (
                            <button
                              key={r.id}
                              onClick={() => handleReaction(r.id)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all active:scale-95 text-sm font-bold ${
                                count > 0
                                  ? 'bg-violet-100 border-violet-300 text-violet-700'
                                  : 'bg-white border-violet-200 text-violet-600'
                              }`}
                            >
                              <span>{r.label}</span>
                              <span>{r.text}</span>
                              {count > 0 && <span className="text-xs bg-violet-500 text-white px-1.5 py-0.5 rounded-full">{count}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formData.category !== 'Here' && (
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
              )}

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
                    <span className="text-sm font-bold text-gray-700">📸 思い出の写真</span>
                    <div className={`flex gap-2 ${isUploading || !pin?.id ? 'opacity-50 pointer-events-none' : ''}`}>
                      {/* カメラで撮影 */}
                      <label className="flex items-center gap-1 text-xs font-bold bg-white text-orange-600 px-3 py-1.5 rounded-full border border-orange-200 shadow-sm active:bg-orange-50 cursor-pointer">
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <span>📷</span>}
                        撮影
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={isUploading || !pin?.id} />
                      </label>
                      {/* ライブラリから選択 */}
                      <label className="flex items-center gap-1 text-xs font-bold bg-white text-orange-600 px-3 py-1.5 rounded-full border border-orange-200 shadow-sm active:bg-orange-50 cursor-pointer">
                        <ImagePlus size={14} />
                        選択
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading || !pin?.id} />
                      </label>
                    </div>
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
                <div className="space-y-2">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
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
                      className="w-full py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5 text-sm font-bold"
                      title="Googleカレンダーに追加"
                    >
                      <Calendar size={16} />
                      Googleカレンダーに追加
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

            <div className="flex gap-2 mt-4">
              {pin?.id && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-4 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all flex items-center justify-center shadow-sm"
                  title="削除する"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!formData.title}
                className="flex-1 bg-[var(--color-primary)] hover:opacity-90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Save size={20} />
                保存する
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
