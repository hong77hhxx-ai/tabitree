'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { searchPlaces, PlaceResult } from '@/lib/places'
import {
  Search, X, Loader2, Plus, Utensils, Bed, Camera, Droplets, MapPin,
} from 'lucide-react'

type PlaceSearchProps = {
  isOpen: boolean
  onClose: () => void
  onPick: (place: PlaceResult) => void
}

const catIcon = (category: string, size = 18) => {
  switch (category) {
    case 'Eat': return <Utensils size={size} className="text-rose-600" />
    case 'Stay': return <Bed size={size} className="text-emerald-600" />
    case 'Sightseeing': return <Camera size={size} className="text-sky-600" />
    case 'Onsen': return <Droplets size={size} className="text-amber-600" />
    default: return <MapPin size={size} className="text-teal-600" />
  }
}
const catLabel: Record<string, string> = { Eat: '食べる', Stay: '泊まる', Sightseeing: '観光', Onsen: '温泉' }

export default function PlaceSearch({ isOpen, onClose, onPick }: PlaceSearchProps) {
  const map = useMap()
  const placesLib = useMapsLibrary('places')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    if (!placesLib) {
      setError('地図ライブラリの読み込み中です。少し待って再試行してください。')
      return
    }
    setLoading(true)
    setError('')
    setSearched(true)
    try {
      const bias = map?.getBounds() ?? null
      const res = await searchPlaces(q, placesLib, bias)
      setResults(res)
    } catch (err: any) {
      setError(err?.message || '検索に失敗しました。Places API (New) の有効化を確認してください。')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setQuery('')
    setResults([])
    setError('')
    setSearched(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative bg-[var(--surface)] shadow-2xl rounded-b-3xl"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            {/* 検索バー */}
            <form onSubmit={handleSearch} className="px-4 pt-4 pb-3 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-[var(--surface-sunken)] rounded-full px-4 py-2.5 border border-[var(--border-soft)]">
                <Search size={18} className="text-[var(--text-muted)] flex-shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="スポットを検索（例: ラーメン 渋谷）"
                  className="flex-1 min-w-0 bg-transparent outline-none text-[var(--text-strong)] text-sm font-bold"
                />
                {query && (
                  <button type="button" onClick={reset} className="text-[var(--text-muted)] flex-shrink-0">
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!query.trim() || loading}
                className="bg-[var(--color-primary)] text-white font-bold text-sm px-4 py-2.5 rounded-full flex-shrink-0 disabled:opacity-40"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : '検索'}
              </button>
              <button type="button" onClick={onClose} className="text-[var(--text-muted)] text-sm font-bold flex-shrink-0 px-1">
                閉じる
              </button>
            </form>

            {/* 結果 */}
            <div className="max-h-[62vh] overflow-y-auto px-3 pb-4">
              {loading && (
                <div className="py-10 flex justify-center text-[var(--text-muted)]">
                  <Loader2 size={22} className="animate-spin" />
                </div>
              )}
              {!loading && error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 mx-1">{error}</p>
              )}
              {!loading && !error && searched && results.length === 0 && (
                <div className="py-10 text-center text-sm text-[var(--text-muted)]">
                  該当するスポットが見つかりませんでした。
                </div>
              )}
              {!loading && !error && !searched && (
                <div className="py-10 text-center text-sm text-[var(--text-muted)]">
                  店名やキーワードで検索して、地図にピンを追加できます。
                </div>
              )}
              <div className="space-y-1.5">
                {results.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { onPick(r); onClose() }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-[var(--surface-sunken)] active:bg-[var(--surface-sunken)] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-soft)] flex items-center justify-center flex-shrink-0">
                      {catIcon(r.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[var(--text-strong)] text-sm truncate">{r.name}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate">
                        <span className="text-[var(--accent)] font-bold">{catLabel[r.category]}</span>
                        {r.address ? `・${r.address}` : ''}
                      </div>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center flex-shrink-0">
                      <Plus size={18} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
