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
      setIsCreating(false)
      return
    }

    if (data) {
      router.push(`/map/${data.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fcfb] flex flex-col items-center justify-center p-6 text-gray-800">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden"
      >
        <div className="bg-[var(--color-primary)] p-8 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10 flex justify-center mb-4">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
              <MapPin size={40} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 relative z-10 tracking-wider">TabiTree</h1>
          <p className="text-white/90 font-medium relative z-10">みんなで作る、旅行マップ</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Users className="text-[var(--color-primary)]" size={24} />
              <p className="text-sm">URLをシェアするだけで、誰でも簡単にマップに参加できます。</p>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Sparkles className="text-amber-400" size={24} />
              <p className="text-sm">行きたいお店、泊まる宿をリアルタイムに共有。計画がもっと楽しくなります。</p>
            </div>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">新しいマップを作る</label>
              <input
                type="text"
                placeholder="例: 北海道旅行2026"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all bg-gray-50 focus:bg-white text-gray-800"
                maxLength={50}
              />
            </div>
            <button
              type="submit"
              disabled={isCreating || !groupName.trim()}
              className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-primary/20"
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
