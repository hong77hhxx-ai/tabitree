'use client'

import { useState } from 'react'
import { Camera, Save, CheckCircle, Loader2 } from 'lucide-react'
import { uploadAvatar, getUserId } from '@/lib/supabase'

type ProfileProps = {
  nickname: string | null
  avatarUrl: string | null
  onSave: (nickname: string, avatarUrl: string | null) => void
}

export default function Profile({ nickname, avatarUrl, onSave }: ProfileProps) {
  const [name, setName] = useState(nickname || '')
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarUrl)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [saved, setSaved] = useState(false)

  const displayAvatar = previewUrl || currentAvatar
  const initial = name.trim().charAt(0).toUpperCase()

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    setIsUploading(true)
    const userId = getUserId()
    const url = await uploadAvatar(file, userId)
    setIsUploading(false)
    if (url) {
      setCurrentAvatar(url)
      setPreviewUrl(null)
      localStorage.setItem('tabitree_avatar_url', url)
    }
  }

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    localStorage.setItem('tabitree_nickname', trimmed)
    onSave(trimmed, currentAvatar)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div
      className="flex flex-col h-full bg-[#f8fcfb]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-800">プロフィール</h1>
      </div>

      <div className="flex-1 overflow-y-auto scroll-touch scrollbar-hide">
        <div className="p-6 space-y-8">

          {/* アバター */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[var(--color-primary)] shadow-lg bg-[var(--color-primary)] flex items-center justify-center">
                {displayAvatar ? (
                  <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-extrabold text-white">{initial || '?'}</span>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <Loader2 size={28} className="text-white animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* 写真変更ボタン */}
            <div className="flex gap-3">
              <label className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-2xl border cursor-pointer transition-all active:scale-95 bg-white border-gray-200 text-gray-600 shadow-sm ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <Camera size={16} />
                カメラ
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAvatarChange} disabled={isUploading} />
              </label>
              <label className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-2xl border cursor-pointer transition-all active:scale-95 bg-white border-gray-200 text-gray-600 shadow-sm ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                🖼️ ライブラリ
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={isUploading} />
              </label>
            </div>
          </div>

          {/* 名前 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
            <label className="block text-sm font-bold text-gray-700">ニックネーム</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例: たろう"
              maxLength={20}
              className="w-full px-4 py-4 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:bg-white transition-all text-gray-800 text-lg font-bold"
            />
            <p className="text-xs text-gray-400">マップ上で他のメンバーに表示されます</p>
          </div>

          {/* 保存ボタン */}
          <button
            onClick={handleSave}
            disabled={!name.trim() || isUploading}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 shadow-md ${
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-[var(--color-primary)] text-white'
            }`}
          >
            {saved ? (
              <><CheckCircle size={20} />保存しました</>
            ) : (
              <><Save size={20} />変更を保存</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
