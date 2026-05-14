'use client'

import { Map, List } from 'lucide-react'

type Tab = 'map' | 'timeline'

type BottomNavProps = {
  activeTab: Tab
  onChange: (tab: Tab) => void
}

const TABS = [
  { id: 'map' as Tab, label: 'マップ', icon: Map },
  { id: 'timeline' as Tab, label: 'タイムライン', icon: List },
]

export default function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <div
      className="flex-shrink-0 bg-white border-t border-gray-100 flex shadow-[0_-1px_12px_rgba(0,0,0,0.07)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TABS.map(tab => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center pt-3 pb-2 gap-1 transition-all active:scale-95 ${
              isActive ? 'text-teal-600' : 'text-gray-400'
            }`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className={`text-[11px] font-bold ${isActive ? 'text-teal-700' : 'text-gray-400'}`}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
