'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MapPin, Users, Sparkles, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Home() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return
    setIsCreating(true)

    const { data, error } = await supabase
      .from('groups')
      .insert([{ name: groupName }])
      .select()
      .single()

    if (error) {
      console.error(error)
      setErrorMsg(`エラー: ${error.message} (code: ${error.code})`)
      setIsCreating(false)
      return
    }
    if (data) router.push(`/map/${data.id}`)
  }

  return (
    <div
      className="min-h-screen bg-[#f0faf6] flex flex-col items-center justify-center p-5"
      style={{ paddingTop: 'env(safe-area-inset-top, 20px)', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden"
      >
        {/* ヘッダー */}
        <div className="bg-[var(--color-primary)] px-6 pt-10 pb-8 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="relative z-10 flex justify-center mb-5"
          >
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
              <MapPin size={44} className="text-white" />
            </div>
          </motion.div>
          <h1 className="text-4xl font-extrabold mb-2 relative z-10 tracking-wider">TabiTree</h1>
          <p className="text-white/90 font-semibold relative z-10 text-base">みんなで作る、旅行マップ</p>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-7 space-y-7">
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-gray-600">
              <div className="bg-teal-50 p-2 rounded-xl flex-shrink-0">
                <Users size={20} className="text-[var(--color-primary)]" />
              </div>
              <p className="text-sm leading-relaxed pt-1">URLをシェアするだけで、誰でも簡単にマップに参加できます。</p>
            </div>
            <div className="flex items-start gap-3 text-gray-600">
              <div className="bg-amber-50 p-2 rounded-xl flex-shrink-0">
                <Sparkles size={20} className="text-amber-400" />
              </div>
              <p className="text-sm leading-relaxed pt-1">行きたいお店、泊まる宿をリアルタイムに共有。計画がもっと楽しくなります。</p>
            </div>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-4 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">新しいマップを作る</label>
              <input
                type="text"
                placeholder="例: 北海道旅行2026"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all bg-gray-50 focus:bg-white text-gray-800 text-base"
                maxLength={50}
              />
            </div>
            {errorMsg && (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={isCreating || !groupName.trim()}
              className="w-full bg-[var(--color-primary)] active:opacity-80 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-md text-base"
            >
              {isCreating ? '作成中...' : 'はじめる'}
              {!isCreating && <ArrowRight size={20} />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
