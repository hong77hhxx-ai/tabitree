'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Map as MapIcon, Palette, ChevronRight, ChevronLeft, Check, Home } from 'lucide-react'
import Profile from './Profile'

export type ThemeColor = 'default' | 'dark' | 'pink' | 'blue'
export type MapStyle = 'default' | 'dark'

// 旧 MapTheme との互換のため別名を残す
export type MapTheme = ThemeColor

type SettingsProps = {
  nickname: string | null
  avatarUrl: string | null
  onSaveProfile: (nickname: string, avatarUrl: string | null) => void
  themeColor: ThemeColor
  onChangeThemeColor: (theme: ThemeColor) => void
  mapStyle: MapStyle
  onChangeMapStyle: (style: MapStyle) => void
}

const THEME_COLORS: { id: ThemeColor, label: string, swatch: string }[] = [
  { id: 'default', label: 'デフォルト', swatch: 'bg-gradient-to-br from-[#88D8C0] to-[#5bbfa3]' },
  { id: 'dark', label: 'ダーク', swatch: 'bg-gradient-to-br from-slate-700 to-slate-900' },
  { id: 'pink', label: 'ピンク', swatch: 'bg-gradient-to-br from-[#f9a8d4] to-[#f472b6]' },
  { id: 'blue', label: 'ブルー', swatch: 'bg-gradient-to-br from-[#7dd3fc] to-[#38bdf8]' },
]

const MAP_STYLES: { id: MapStyle, label: string, swatch: string }[] = [
  { id: 'default', label: 'デフォルト（ライト）', swatch: 'bg-gradient-to-br from-gray-100 to-gray-300' },
  { id: 'dark', label: 'ダーク', swatch: 'bg-gradient-to-br from-gray-700 to-gray-900' },
]

export default function Settings({
  nickname, avatarUrl, onSaveProfile,
  themeColor, onChangeThemeColor, mapStyle, onChangeMapStyle,
}: SettingsProps) {
  const [view, setView] = useState<'menu' | 'profile' | 'theme' | 'map'>('menu')
  const router = useRouter()

  const backHeader = (title?: string) => (
    <div className="bg-[var(--surface)] border-b border-[var(--border-soft)] px-2 pt-4 pb-3 flex items-center flex-shrink-0">
      <button onClick={() => setView('menu')} className="p-2 text-[var(--text-muted)] active:opacity-70 flex items-center gap-1">
        <ChevronLeft size={22} />
        <span className="text-sm font-bold">設定</span>
      </button>
      {title && <h1 className="text-base font-bold text-[var(--text-strong)] ml-2">{title}</h1>}
    </div>
  )

  // プロフィールサブ画面
  if (view === 'profile') {
    return (
      <div className="flex flex-col h-full bg-[var(--surface-muted)]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {backHeader()}
        <div className="flex-1 min-h-0">
          <Profile nickname={nickname} avatarUrl={avatarUrl} onSave={onSaveProfile} />
        </div>
      </div>
    )
  }

  // テーマカラーのサブ画面
  if (view === 'theme') {
    return (
      <div className="flex flex-col h-full bg-[var(--surface-muted)]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {backHeader('テーマカラー')}
        <div className="flex-1 overflow-y-auto scroll-touch scrollbar-hide p-4 space-y-3">
          {THEME_COLORS.map(t => (
            <button
              key={t.id}
              onClick={() => onChangeThemeColor(t.id)}
              className={`w-full bg-[var(--surface)] rounded-2xl p-3 shadow-sm border-2 flex items-center gap-3 transition-all active:scale-[0.98] ${
                themeColor === t.id ? 'border-[var(--color-primary)]' : 'border-[var(--border-soft)]'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex-shrink-0 border border-black/5 ${t.swatch}`} />
              <span className="flex-1 text-left text-sm font-bold text-[var(--text-strong)]">{t.label}</span>
              {themeColor === t.id && (
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

  // マップの色サブ画面
  if (view === 'map') {
    return (
      <div className="flex flex-col h-full bg-[var(--surface-muted)]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {backHeader('マップの色')}
        <div className="flex-1 overflow-y-auto scroll-touch scrollbar-hide p-4 space-y-3">
          {MAP_STYLES.map(t => (
            <button
              key={t.id}
              onClick={() => onChangeMapStyle(t.id)}
              className={`w-full bg-[var(--surface)] rounded-2xl p-3 shadow-sm border-2 flex items-center gap-3 transition-all active:scale-[0.98] ${
                mapStyle === t.id ? 'border-[var(--color-primary)]' : 'border-[var(--border-soft)]'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex-shrink-0 border border-gray-200 ${t.swatch}`} />
              <span className="flex-1 text-left text-sm font-bold text-[var(--text-strong)]">{t.label}</span>
              {mapStyle === t.id && (
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
    <div className="flex flex-col h-full bg-[var(--surface-muted)]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="bg-[var(--surface)] border-b border-[var(--border-soft)] px-4 pt-5 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-[var(--text-strong)]">設定</h1>
      </div>
      <div className="flex-1 overflow-y-auto scroll-touch scrollbar-hide p-4 space-y-3">
        <button
          onClick={() => setView('profile')}
          className="w-full bg-[var(--surface)] rounded-2xl p-4 shadow-sm border border-[var(--border-soft)] flex items-center gap-3 active:scale-[0.98] transition-all"
        >
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 flex-shrink-0">
            <User size={20} />
          </div>
          <div className="flex-1 text-left">
            <div className="font-bold text-[var(--text-strong)]">プロフィール</div>
            <div className="text-xs text-[var(--text-muted)]">{nickname || '未設定'}</div>
          </div>
          <ChevronRight size={20} className="text-[var(--text-muted)]" />
        </button>

        <button
          onClick={() => setView('theme')}
          className="w-full bg-[var(--surface)] rounded-2xl p-4 shadow-sm border border-[var(--border-soft)] flex items-center gap-3 active:scale-[0.98] transition-all"
        >
          <div className="p-2.5 rounded-xl bg-pink-50 text-pink-500 flex-shrink-0">
            <Palette size={20} />
          </div>
          <div className="flex-1 text-left">
            <div className="font-bold text-[var(--text-strong)]">テーマカラー</div>
            <div className="text-xs text-[var(--text-muted)]">
              {THEME_COLORS.find(t => t.id === themeColor)?.label}
            </div>
          </div>
          <ChevronRight size={20} className="text-[var(--text-muted)]" />
        </button>

        <button
          onClick={() => setView('map')}
          className="w-full bg-[var(--surface)] rounded-2xl p-4 shadow-sm border border-[var(--border-soft)] flex items-center gap-3 active:scale-[0.98] transition-all"
        >
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
            <MapIcon size={20} />
          </div>
          <div className="flex-1 text-left">
            <div className="font-bold text-[var(--text-strong)]">マップの色</div>
            <div className="text-xs text-[var(--text-muted)]">
              {MAP_STYLES.find(t => t.id === mapStyle)?.label}
            </div>
          </div>
          <ChevronRight size={20} className="text-[var(--text-muted)]" />
        </button>

        <button
          onClick={() => router.push('/')}
          className="w-full bg-[var(--surface)] rounded-2xl p-4 shadow-sm border border-[var(--border-soft)] flex items-center gap-3 active:scale-[0.98] transition-all"
        >
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 flex-shrink-0">
            <Home size={20} />
          </div>
          <div className="flex-1 text-left">
            <div className="font-bold text-[var(--text-strong)]">マップ一覧へ戻る</div>
            <div className="text-xs text-[var(--text-muted)]">他のマップを切り替え</div>
          </div>
          <ChevronRight size={20} className="text-[var(--text-muted)]" />
        </button>
      </div>
    </div>
  )
}
