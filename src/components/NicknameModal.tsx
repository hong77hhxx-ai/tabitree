'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { User } from 'lucide-react'

type Props = {
  onConfirm: (nickname: string) => void
}

export default function NicknameModal({ onConfirm }: Props) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const name = value.trim()
    if (!name) return
    localStorage.setItem('tabitree_nickname', name)
    onConfirm(name)
  }

  return (
    // キーボード表示時でも見切れないよう items-start + pt で上寄せ
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
        {/* ドラッグハンドル */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

        <div className="flex justify-center mb-4">
          <div className="bg-[var(--color-primary)]/20 p-4 rounded-2xl">
            <User size={32} className="text-[var(--color-primary)]" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-800 text-center mb-1">あなたの名前は？</h2>
        <p className="text-sm text-gray-500 text-center mb-6">マップ上でメンバーに表示されます</p>
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
            disabled={!value.trim()}
            className="w-full bg-[var(--color-primary)] text-white font-bold py-4 rounded-2xl disabled:opacity-40 active:opacity-80 transition-all text-base"
          >
            マップに参加する
          </button>
        </form>
      </motion.div>
    </div>
  )
}
