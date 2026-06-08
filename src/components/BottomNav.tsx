'use client'

import { Map, Layers, List, Settings } from 'lucide-react'

type Tab = 'map' | 'groups' | 'timeline' | 'settings'

type BottomNavProps = {
  activeTab: Tab
  onChange: (tab: Tab) => void
}

const TABS = [
  { id: 'map' as Tab, label: 'マップ', icon: Map },
  { id: 'groups' as Tab, label: 'グループ', icon: Layers },
  { id: 'timeline' as Tab, label: 'タイムライン', icon: List },
  { id: 'settings' as Tab, label: '設定', icon: Settings },
]

export default function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <div
      className="flex-shrink-0 bg-[var(--surface)] border-t border-[var(--border-soft)] flex shadow-[0_-1px_12px_rgba(0,0,0,0.07)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TABS.map(tab => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-1 flex flex-col items-center justify-center pt-3 pb-2 gap-1 transition-all active:scale-95"
            style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
            <span
              className="text-[11px] font-bold"
              style={{ color: isActive ? 'var(--accent-strong)' : 'var(--text-muted)' }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
