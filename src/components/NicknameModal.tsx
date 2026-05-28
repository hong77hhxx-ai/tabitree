'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Loader2 } from 'lucide-react'
import { uploadAvatar, getUserId } from '@/lib/supabase'

type Props = {
  onConfirm: (nickname: string, avatarUrl: string | null) => void
}

export default function NicknameModal({ onConfirm }: Props) {
  const [value, setValue] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // プレビュー表示
    setPreviewUrl(URL.createObjectURL(file))
    setIsUploading(true)

    const userId = getUserId()
    const url = await uploadAvatar(file, userId)
    setIsUploading(false)

    if (url) {
      setAvatarUrl(url)
      localStorage.setItem('tabitree_avatar_url', url)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = value.trim()
    if (!name) return
    localStorage.setItem('tabitree_nickname', name)
    onConfirm(name, avatarUrl)
  }

  const initial = value.trim().charAt(0).toUpperCase()

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end justify-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white rounded-t-3xl shadow-2xl w-full max-w-lg px-6 pt-6 pb-8"
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

        <h2 className="text-xl font-bold text-gray-800 text-center mb-1">プロフィールを設定</h2>
        <p className="text-sm text-gray-500 text-center mb-6">マップ上でメンバーに表示されます</p>

        {/* アバター */}
        <div className="flex justify-center mb-6">
          <label className="relative cursor-pointer group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--color-primary)] shadow-md bg-[var(--color-primary)] flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-extrabold text-white">
                  {initial || '?'}
                </span>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <Loader2 size={24} className="text-white animate-spin" />
                </div>
              )}
            </div>
            {/* カメラアイコン */}
            <div className="absolute bottom-0 right-0 bg-[var(--color-primary)] rounded-full p-2 border-2 border-white shadow group-active:scale-95 transition-transform">
              <Camera size={16} className="text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={isUploading}
            />
          </label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="例: たろう"
            maxLength={20}
            className="w-full px-4 py-4 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:bg-white transition-all text-gray-800 text-center text-lg font-bold"
          />
          <button
            type="submit"
            disabled={!value.trim() || isUploading}
            className="w-full bg-[var(--color-primary)] text-white font-bold py-4 rounded-2xl disabled:opacity-40 active:opacity-80 transition-all text-base"
          >
            マップに参加する
          </button>
        </form>
      </motion.div>
    </div>
  )
}
