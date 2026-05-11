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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8"
      >
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
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:bg-white transition-all text-gray-800 text-center text-lg font-bold"
          />
          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full bg-[var(--color-primary)] text-white font-bold py-3 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all"
          >
            マップに参加する
          </button>
        </form>
      </motion.div>
    </div>
  )
}
