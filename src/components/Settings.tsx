'use client'

import { useState } from 'react'
import { User, Map as MapIcon, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import Profile from './Profile'

export type MapTheme = 'default' | 'dark'

type SettingsProps = {
  nickname: string | null
  avatarUrl: string | null
  onSaveProfile: (nickname: string, avatarUrl: string | null) => void
  mapTheme: MapTheme
  onChangeMapTheme: (theme: MapTheme) => void
}

const MAP_THEMES: { id: MapTheme, label: string, swatch: string }[] = [
  { id: 'default', label: 'デフォルト', swatch: 'bg-gradient-to-br from-gray-100 to-gray-300' },
  { id: 'dark', label: 'ダーク', swatch: 'bg-gradient-to-br from-gray-700 to-gray-900' },
]

export default function Settings({ nickname, avatarUrl, onSaveProfile, mapTheme, onChangeMapTheme }: SettingsProps) {
  const [view, setView] = useState<'menu' | 'profile' | 'map'>('menu')

  // プロフィールサブ画面
  if (view === 'profile') {
    return (
      <div className="flex flex-col h-full bg-[#f8fcfb]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="bg-white border-b border-gray-100 px-2 pt-4 pb-3 flex items-center flex-shrink-0">
          <button onClick={() => setView('menu')} className="p-2 text-gray-500 active:text-gray-700 flex items-center gap-1">
            <ChevronLeft size={22} />
            <span className="text-sm font-bold">設定</span>
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <Profile nickname={nickname} avatarUrl={avatarUrl} onSave={onSaveProfile} />
        </div>
      </div>
    )
  }

  // マップ色サブ画面
  if (view === 'map') {
    return (
      <div className="flex flex-col h-full bg-[#f8fcfb]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="bg-white border-b border-gray-100 px-2 pt-4 pb-3 flex items-center flex-shrink-0">
          <button onClick={() => setView('menu')} className="p-2 text-gray-500 active:text-gray-700 flex items-center gap-1">
            <ChevronLeft size={22} />
            <span className="text-sm font-bold">設定</span>
          </button>
          <h1 className="text-base font-bold text-gray-800 ml-2">マップの色</h1>
        </div>
        <div className="flex-1 overflow-y-auto scroll-touch scrollbar-hide p-4 space-y-3">
          {MAP_THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => onChangeMapTheme(t.id)}
              className={`w-full bg-white rounded-2xl p-3 shadow-sm border-2 flex items-center gap-3 transition-all active:scale-[0.98] ${
                mapTheme === t.id ? 'border-[var(--color-primary)]' : 'border-gray-100'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex-shrink-0 border border-gray-200 ${t.swatch}`} />
              <span className="flex-1 text-left text-sm font-bold text-gray-800">{t.label}</span>
              {mapTheme === t.id && (
                <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // メニュー（一覧）
  return (
    <div className="flex flex-col h-full bg-[#f8fcfb]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-800">設定</h1>
      </div>
      <div className="flex-1 overflow-y-auto scroll-touch scrollbar-hide p-4 space-y-3">
        <button
          onClick={() => setView('profile')}
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 active:scale-[0.98] transition-all"
        >
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 flex-shrink-0">
            <User size={20} />
          </div>
          <div className="flex-1 text-left">
            <div className="font-bold text-gray-800">プロフィール</div>
            <div className="text-xs text-gray-400">{nickname || '未設定'}</div>
          </div>
          <ChevronRight size={20} className="text-gray-300" />
        </button>

        <button
          onClick={() => setView('map')}
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 active:scale-[0.98] transition-all"
        >
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
            <MapIcon size={20} />
          </div>
          <div className="flex-1 text-left">
            <div className="font-bold text-gray-800">マップ</div>
            <div className="text-xs text-gray-400">
              色: {MAP_THEMES.find(t => t.id === mapTheme)?.label}
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-300" />
        </button>
      </div>
    </div>
  )
}
