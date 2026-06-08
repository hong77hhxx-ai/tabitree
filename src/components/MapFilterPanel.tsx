'use client'

import { useState } from 'react'
import { StoredGroup } from '@/lib/supabase'
import { Menu, X, Check, Utensils, Bed, Camera, Droplets, Layers, Tag, ListFilter, Route as RouteIcon } from 'lucide-react'

export type PinCategory = 'Eat' | 'Stay' | 'Sightseeing' | 'Onsen'
export type StatusFilter = 'all' | 'plan' | 'memory'

const STATUS_FILTERS: { id: StatusFilter, label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'plan', label: '予定' },
  { id: 'memory', label: '思い出' },
]

export const FILTER_CATEGORIES: { id: PinCategory, label: string, Icon: typeof Utensils, color: string, bg: string }[] = [
  { id: 'Eat', label: '食べる', Icon: Utensils, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  { id: 'Stay', label: '泊まる', Icon: Bed, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  { id: 'Sightseeing', label: '観光', Icon: Camera, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
  { id: 'Onsen', label: '温泉', Icon: Droplets, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
]

type MapFilterPanelProps = {
  groups: StoredGroup[]
  currentGroupId: string
  visibleGroupIds: string[]
  onToggleGroup: (id: string) => void
  visibleCategories: PinCategory[]
  onToggleCategory: (c: PinCategory) => void
  statusFilter: StatusFilter
  onChangeStatus: (s: StatusFilter) => void
  routeAvailable: boolean
  showRoute: boolean
  onToggleShowRoute: () => void
}

export default function MapFilterPanel({
  groups, currentGroupId, visibleGroupIds, onToggleGroup,
  visibleCategories, onToggleCategory,
  statusFilter, onChangeStatus, routeAvailable, showRoute, onToggleShowRoute,
}: MapFilterPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="absolute left-4 z-20 flex flex-col items-start"
      style={{ top: 'max(env(safe-area-inset-top, 0px) + 12px, 16px)' }}
    >
      {/* ハンバーガーボタン（横棒3本） */}
      <button
        onClick={() => setOpen(v => !v)}
        className="bg-[var(--surface)] backdrop-blur-md rounded-full shadow-lg border border-[var(--border-soft)] p-2.5 flex items-center justify-center active:scale-95 transition-all"
        aria-label="フィルター"
      >
        {open ? <X size={20} className="text-[var(--text-strong)]" /> : <Menu size={20} className="text-[var(--text-strong)]" />}
      </button>

      {open && (
        <div className="mt-2 bg-[var(--surface)] rounded-2xl shadow-xl border border-[var(--border-soft)] overflow-hidden w-64 max-h-[70vh] overflow-y-auto">
          {/* グループ */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Layers size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-bold text-[var(--text-muted)] tracking-wider uppercase">表示するグループ</span>
            </div>
            {groups.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-2">参加中のグループがありません。</p>
            ) : (
              <div className="space-y-1">
                {groups.map(g => {
                  const checked = visibleGroupIds.includes(g.id)
                  const isCurrent = g.id === currentGroupId
                  return (
                    <button
                      key={g.id}
                      onClick={() => onToggleGroup(g.id)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[var(--surface-sunken)] transition-colors text-left"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-black/5"
                        style={{ backgroundColor: g.color || '#88D8C0' }}
                      />
                      <span className="flex-1 min-w-0 text-sm font-bold text-[var(--text-strong)] truncate">
                        {g.name}
                        {isCurrent && <span className="ml-1 text-[10px] font-bold" style={{ color: 'var(--accent)' }}>（表示中）</span>}
                      </span>
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-all"
                        style={checked
                          ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                          : { backgroundColor: 'var(--surface)', borderColor: 'var(--border-soft)' }}
                      >
                        {checked && <Check size={14} className="text-white" />}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-[var(--border-soft)] mx-4 my-1" />

          {/* カテゴリー */}
          <div className="px-4 pt-2 pb-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Tag size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-bold text-[var(--text-muted)] tracking-wider uppercase">カテゴリー</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FILTER_CATEGORIES.map(({ id, label, Icon, color, bg }) => {
                const active = visibleCategories.includes(id)
                return (
                  <button
                    key={id}
                    onClick={() => onToggleCategory(id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      active ? bg : 'bg-[var(--surface-sunken)] border-[var(--border-soft)] opacity-60'
                    }`}
                  >
                    <Icon size={16} className={active ? color : 'text-[var(--text-muted)]'} />
                    <span className={active ? 'text-gray-700' : 'text-[var(--text-muted)]'}>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="h-px bg-[var(--border-soft)] mx-4 my-1" />

          {/* 表示状態（すべて / 予定 / 思い出） */}
          <div className="px-4 pt-2 pb-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <ListFilter size={14} style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-bold text-[var(--text-muted)] tracking-wider uppercase">表示</span>
            </div>
            <div className="flex bg-[var(--surface-sunken)] p-1 rounded-xl">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => onChangeStatus(f.id)}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                    statusFilter === f.id ? 'bg-[var(--surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ルート表示 ON/OFF（ルート作成後のみ） */}
          {routeAvailable && (
            <>
              <div className="h-px bg-[var(--border-soft)] mx-4 my-1" />
              <div className="px-4 pt-2 pb-4">
                <button
                  onClick={onToggleShowRoute}
                  className="w-full flex items-center gap-2.5 px-1 py-1"
                >
                  <RouteIcon size={16} className={showRoute ? 'text-[#dc2626]' : 'text-[var(--text-muted)]'} />
                  <span className={`flex-1 text-left text-sm font-bold ${showRoute ? 'text-[var(--text-strong)]' : 'text-[var(--text-muted)]'}`}>ルートを表示</span>
                  <span className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${showRoute ? 'bg-[#dc2626]' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${showRoute ? 'left-4.5' : 'left-0.5'}`} style={{ left: showRoute ? '18px' : '2px' }} />
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
