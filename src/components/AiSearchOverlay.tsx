'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, Save, X, Search } from 'lucide-react'

const SEARCH_RADII = [1, 5, 10, 30]

const CATEGORY_LABEL: Record<string, string> = {
  Eat: '食べる', Stay: '泊まる', Sightseeing: '観光', Onsen: '温泉',
}

type Props = {
  center: { lat: number, lng: number }
  category: string
  onRadiusChange: (radiusKm: number) => void
  onApply: (suggestion: any) => void
  onClose: () => void
}

export default function AiSearchOverlay({ center, category, onRadiusChange, onApply, onClose }: Props) {
  const [radiusKm, setRadiusKm] = useState(5)
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
  const [searchedRadius, setSearchedRadius] = useState<number | null>(null)

  // 初期表示時に円を描画
  useEffect(() => {
    onRadiusChange(radiusKm)
  }, [radiusKm])

  const handleSelectRadius = (r: number) => {
    setRadiusKm(r)
    setResults(null) // 半径を変えたら結果をリセット
  }

  const handleSearch = async () => {
    setIsSearching(true)
    setSearchedRadius(radiusKm)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: center.lat, lng: center.lng, category, radiusKm })
      })
      const data = await res.json()
      if (data.suggestions) setResults(data.suggestions)
      else if (data.error) { alert(`エラー: ${data.error}`); setResults([]) }
    } catch (e) {
      console.error(e)
      alert('AIからの提案の取得に失敗しました。')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const nextRadius = searchedRadius ? SEARCH_RADII.find(r => r > searchedRadius) ?? null : null

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      {/* 上部：半径選択バー */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-auto w-[calc(100%-2rem)] max-w-sm"
        style={{ top: 'max(env(safe-area-inset-top, 0px) + 12px, 16px)' }}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-[var(--surface)] rounded-2xl shadow-lg border border-[var(--border-soft)] p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-500">
              <Sparkles size={16} />
              AI Select 検索範囲
            </div>
            <button onClick={onClose} className="p-1 text-[var(--text-muted)] active:opacity-70">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {SEARCH_RADII.map(r => (
              <button
                key={r}
                onClick={() => handleSelectRadius(r)}
                className={`py-2 text-sm font-bold rounded-xl transition-all ${
                  radiusKm === r
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-[var(--surface-sunken)] text-indigo-500 border border-indigo-300/30'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* 下部：検索ボタン or 結果リスト */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <AnimatePresence mode="wait">
          {/* 検索前 */}
          {!results && !isSearching && (
            <motion.div
              key="search-btn"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="p-4"
            >
              <button
                onClick={handleSearch}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Search size={20} />
                半径{radiusKm}km以内を検索
              </button>
            </motion.div>
          )}

          {/* 検索中 */}
          {isSearching && (
            <motion.div
              key="loading"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-4"
            >
              <div className="w-full bg-[var(--surface)] rounded-2xl shadow-lg py-6 flex flex-col items-center text-indigo-500">
                <Loader2 size={28} className="animate-spin mb-2" />
                <span className="text-sm font-bold">半径{radiusKm}km以内を検索中...</span>
              </div>
            </motion.div>
          )}

          {/* 結果リスト */}
          {results && !isSearching && (
            <motion.div
              key="results"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="bg-[var(--surface)] rounded-t-3xl shadow-2xl max-h-[55vh] flex flex-col"
            >
              <div className="px-5 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-strong)]">
                  <Sparkles size={16} className="text-indigo-500" />
                  おすすめ（半径{searchedRadius}km・{results.length}件）
                </div>
                <button onClick={onClose} className="p-1.5 bg-[var(--surface-sunken)] rounded-full text-[var(--text-muted)]">
                  <X size={16} />
                </button>
              </div>

              <div className="px-4 pb-5 overflow-y-auto scrollbar-hide space-y-3">
                {results.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => onApply(s)}
                    className="flex gap-3 bg-[var(--surface)] border border-[var(--border-soft)] rounded-2xl shadow-sm active:scale-[0.98] transition-all cursor-pointer group p-2"
                  >
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-[var(--surface-sunken)]">
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
                          {CATEGORY_LABEL[s.category] || s.category}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 py-1 pr-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className="font-bold text-sm text-[var(--text-strong)] line-clamp-1 flex-1">{s.name}</div>
                          {typeof s.distanceKm === 'number' && (
                            <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--surface-sunken)] px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                              {s.distanceKm < 1 ? `${Math.round(s.distanceKm * 1000)}m` : `${s.distanceKm.toFixed(1)}km`}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed mt-0.5">{s.reason}</div>
                      </div>
                      <div className="flex items-center justify-end mt-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-indigo-500 px-2 py-1 rounded-full shadow-sm">
                          <Save size={11} />
                          追加して移動
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 3件未満：範囲拡大 */}
                {results.length < 3 && (
                  <div className="text-center pt-1">
                    <p className="text-xs text-[var(--text-muted)] mb-2">
                      {results.length === 0
                        ? `半径${searchedRadius}km以内に見つかりませんでした`
                        : `この範囲では${results.length}件見つかりました`}
                    </p>
                    {nextRadius ? (
                      <button
                        onClick={() => { setRadiusKm(nextRadius); handleSearchAt(nextRadius) }}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2.5 rounded-xl active:bg-indigo-100 transition-all"
                      >
                        <Sparkles size={14} />
                        半径{nextRadius}kmに広げて再検索
                      </button>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)]">これ以上範囲を広げられません</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )

  // 指定半径で即検索（範囲拡大ボタン用）
  async function handleSearchAt(r: number) {
    setIsSearching(true)
    setSearchedRadius(r)
    onRadiusChange(r)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: center.lat, lng: center.lng, category, radiusKm: r })
      })
      const data = await res.json()
      if (data.suggestions) setResults(data.suggestions)
      else setResults([])
    } catch {
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }
}
