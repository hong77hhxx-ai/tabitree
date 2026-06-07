'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { Pin, supabase, getUserId } from '@/lib/supabase'
import {
  computeRoute, routeCacheKey, getCachedRoute, saveRoute, RouteResult, TravelMode, googleMapsDirUrl,
} from '@/lib/route'
import {
  X, Footprints, Car, Loader2, Route as RouteIcon, Check, Flag, Play, Save, Navigation,
  Utensils, Bed, Camera, Droplets, MapPin,
} from 'lucide-react'

type RoutePlannerProps = {
  isOpen: boolean
  onClose: () => void
  pins: Pin[]
  groupId: string
  creatorName?: string | null
  creatorAvatar?: string | null
  onRouteComputed: (result: RouteResult | null) => void
  onRouteSaved?: () => void
}

const MAX_SELECT = 10

const catIcon = (category: string, size = 16) => {
  switch (category) {
    case 'Eat': return <Utensils size={size} className="text-rose-600" />
    case 'Stay': return <Bed size={size} className="text-emerald-600" />
    case 'Sightseeing': return <Camera size={size} className="text-sky-600" />
    case 'Onsen': return <Droplets size={size} className="text-amber-600" />
    default: return <MapPin size={size} className="text-teal-600" />
  }
}

export default function RoutePlanner({
  isOpen, onClose, pins, groupId, creatorName, creatorAvatar, onRouteComputed, onRouteSaved,
}: RoutePlannerProps) {
  const routesLibrary = useMapsLibrary('routes')

  const [selected, setSelected] = useState<string[]>([])
  const [startId, setStartId] = useState<string | null>(null)
  const [goalId, setGoalId] = useState<string | null>(null)
  const [mode, setMode] = useState<TravelMode>('DRIVING')
  const [computing, setComputing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RouteResult | null>(null)
  // ルート名・保存
  const [routeName, setRouteName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 選択候補：Planned / Confirmed のみ（Here と Visited は除外）
  const candidates = pins.filter(p => p.category !== 'Here' && (p.status === 'Planned' || p.status === 'Confirmed'))

  const pinById = (id: string) => pins.find(p => p.id === id)

  const toggleSelect = (id: string) => {
    setError('')
    setSelected(prev => {
      if (prev.includes(id)) {
        if (startId === id) setStartId(null)
        if (goalId === id) setGoalId(null)
        return prev.filter(x => x !== id)
      }
      if (prev.length >= MAX_SELECT) return prev // 上限超過は選択不可
      return [...prev, id]
    })
  }

  const chooseStart = (id: string) => {
    setError('')
    if (goalId === id) setGoalId(null)
    setStartId(prev => (prev === id ? null : id))
  }
  const chooseGoal = (id: string) => {
    setError('')
    if (startId === id) setStartId(null)
    setGoalId(prev => (prev === id ? null : id))
  }

  const canCompute = !!startId && !!goalId && startId !== goalId && selected.length >= 2 && !computing

  const handleCompute = async () => {
    if (!startId || !goalId) {
      setError('スタートとゴールを指定してください。')
      return
    }
    if (startId === goalId) {
      setError('スタートとゴールは別のピンにしてください。')
      return
    }
    const origin = pinById(startId)
    const destination = pinById(goalId)
    if (!origin || !destination) return

    const waypointPins = selected.filter(id => id !== startId && id !== goalId).map(pinById).filter(Boolean) as Pin[]

    setError('')
    setSaved(false)
    setComputing(true)
    try {
      const key = routeCacheKey(groupId, mode, selected)
      // 同じ選択+手段なら再計算しない（メモリキャッシュ）
      let res = getCachedRoute(key)
      if (!res) {
        res = await computeRoute(origin, destination, waypointPins, mode, routesLibrary)
        saveRoute(key, res)
      }
      setResult(res)
      onRouteComputed(res)
      // 既定のルート名：出発→到着
      if (!routeName.trim()) {
        setRouteName(`${origin.title || 'スタート'} → ${destination.title || 'ゴール'}`)
      }
    } catch (e: any) {
      setError(e?.message || 'ルート計算に失敗しました。Directions APIの有効化を確認してください。')
    } finally {
      setComputing(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    const name = routeName.trim() || 'ルート'
    setSaving(true)
    const { error: err } = await supabase.from('routes').insert([{
      group_id: groupId,
      name,
      mode,
      pin_ids: result.orderedPinIds,
      total_distance_m: result.totalDistanceM,
      total_duration_s: result.totalDurationS,
      created_by: getUserId(),
      creator_name: creatorName ?? null,
      creator_avatar: creatorAvatar ?? null,
    }])
    setSaving(false)
    if (err) {
      setError(`ルートの保存に失敗しました: ${err.message}`)
      return
    }
    setSaved(true)
    onRouteSaved?.()
  }

  const formatKm = (m: number) => (m / 1000).toFixed(1)
  const formatMin = (s: number) => Math.max(1, Math.round(s / 60))

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="relative bg-[var(--surface)] rounded-t-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[88vh]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="w-10 h-1 bg-[var(--border-soft)] rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

            {/* ヘッダー */}
            <div className="px-6 pt-3 pb-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-[var(--text-strong)] flex items-center gap-2">
                <RouteIcon className="text-[var(--color-primary)]" size={22} />
                ルートを計画
              </h2>
              <button onClick={onClose} className="p-2 bg-[var(--surface-sunken)] rounded-full text-[var(--text-muted)] hover:opacity-80">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 pb-6 overflow-y-auto space-y-5">
              {/* 移動手段 */}
              <div>
                <label className="block text-sm font-semibold text-[var(--text-muted)] mb-2">移動手段</label>
                <div className="flex bg-[var(--surface-sunken)] p-1 rounded-xl">
                  {([
                    { id: 'DRIVING' as TravelMode, label: '車', Icon: Car },
                    { id: 'WALKING' as TravelMode, label: '徒歩', Icon: Footprints },
                  ]).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => setMode(id)}
                      className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        mode === id ? 'bg-[var(--surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ピン選択 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-[var(--text-muted)]">
                    ピンを選択（{selected.length}/{MAX_SELECT}）
                  </label>
                  <span className="text-[11px] text-[var(--text-muted)]">出発・到着を指定</span>
                </div>

                {candidates.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--text-muted)] bg-[var(--surface-sunken)] rounded-xl">
                    「行きたい / 予約済」のピンがありません。
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {candidates.map(p => {
                      const isSel = selected.includes(p.id)
                      const isStart = startId === p.id
                      const isGoal = goalId === p.id
                      const atMax = !isSel && selected.length >= MAX_SELECT
                      return (
                        <div
                          key={p.id}
                          className={`rounded-xl border transition-all ${
                            isSel ? 'border-[var(--color-primary)] bg-[var(--surface-sunken)]' : 'border-[var(--border-soft)] bg-[var(--surface)]'
                          } ${atMax ? 'opacity-40' : ''}`}
                        >
                          <div className="flex items-center gap-2.5 px-3 py-2.5">
                            <button
                              onClick={() => toggleSelect(p.id)}
                              disabled={atMax}
                              className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-all ${
                                isSel ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'bg-[var(--surface)] border-[var(--border-soft)]'
                              }`}
                            >
                              {isSel && <Check size={14} className="text-white" />}
                            </button>
                            <span className="flex-shrink-0">{catIcon(p.category, 16)}</span>
                            <span className="flex-1 min-w-0 text-sm font-bold text-[var(--text-strong)] truncate">
                              {p.title || '無題のスポット'}
                            </span>
                          </div>
                          {isSel && (
                            <div className="flex gap-2 px-3 pb-2.5 pl-10">
                              <button
                                onClick={() => chooseStart(p.id)}
                                className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                                  isStart ? 'bg-teal-600 text-white border-teal-600' : 'text-[var(--text-muted)] border-[var(--border-soft)]'
                                }`}
                              >
                                <Play size={11} /> 出発
                              </button>
                              <button
                                onClick={() => chooseGoal(p.id)}
                                className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                                  isGoal ? 'bg-rose-500 text-white border-rose-500' : 'text-[var(--text-muted)] border-[var(--border-soft)]'
                                }`}
                              >
                                <Flag size={11} /> 到着
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
              )}

              {/* 計算ボタン */}
              <button
                onClick={handleCompute}
                disabled={!canCompute}
                className="w-full bg-[var(--color-primary)] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-md text-base"
              >
                {computing ? <Loader2 size={20} className="animate-spin" /> : <RouteIcon size={20} />}
                {computing ? '計算中...' : 'ルートを計算'}
              </button>

              {/* 結果 */}
              {result && !computing && (
                <div className="bg-[var(--surface-sunken)] rounded-2xl p-4 border border-[var(--border-soft)]">
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">距離</div>
                      <div className="text-lg font-extrabold text-[var(--text-strong)]">{formatKm(result.totalDistanceM)}<span className="text-xs ml-0.5">km</span></div>
                    </div>
                    <div className="w-px h-8 bg-[var(--border-soft)]" />
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">所要時間</div>
                      <div className="text-lg font-extrabold text-[var(--text-strong)]">{formatMin(result.totalDurationS)}<span className="text-xs ml-0.5">分</span></div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {result.orderedPinIds.map((id, i) => {
                      const p = pinById(id)
                      if (!p) return null
                      return (
                        <div key={id} className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="flex-shrink-0">{catIcon(p.category, 14)}</span>
                          <span className="text-sm font-bold text-[var(--text-strong)] truncate">{p.title || '無題のスポット'}</span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-3">地図にルートが表示されました。パネルを閉じても表示は維持されます。</p>

                  {/* Googleマップでナビ */}
                  <a
                    href={googleMapsDirUrl(
                      result.orderedPinIds.map(id => pinById(id)).filter(Boolean).map(p => ({ lat: (p as Pin).lat, lng: (p as Pin).lng })),
                      mode,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full bg-[#1a73e8] active:opacity-90 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md text-sm"
                  >
                    <Navigation size={18} />
                    Googleマップでナビ
                  </a>

                  {/* ルート名 + 保存 */}
                  <div className="mt-4 pt-3 border-t border-[var(--border-soft)]">
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">ルート名</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={routeName}
                        onChange={e => { setRouteName(e.target.value); setSaved(false) }}
                        placeholder="例: 1日目の観光ルート"
                        maxLength={60}
                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-strong)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                      <button
                        onClick={handleSave}
                        disabled={saving || saved || !routeName.trim()}
                        className="px-4 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                        style={{ backgroundColor: saved ? '#10b981' : 'var(--color-primary)' }}
                      >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
                        {saved ? '保存済' : '保存'}
                      </button>
                    </div>
                    {saved && (
                      <p className="text-[11px] text-emerald-600 mt-1.5 font-bold">タイムラインの「ルート」タブから確認できます。</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
