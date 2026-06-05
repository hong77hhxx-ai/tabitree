'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Group, GROUP_COLORS, getJoinedGroupIds, addJoinedGroup, removeJoinedGroup } from '@/lib/supabase'
import { MapPin, Plus, ArrowRight, ChevronRight, Trash2, X, Compass } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function Home() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // 参加マップ一覧を取得
  useEffect(() => {
    const fetchGroups = async () => {
      const ids = getJoinedGroupIds()
      if (ids.length === 0) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .in('id', ids)
      if (!error && data) {
        // localStorageの並び順（新しい順）を維持
        const ordered = ids
          .map(id => data.find(g => g.id === id))
          .filter((g): g is Group => !!g)
        setGroups(ordered)
      }
      setLoading(false)
    }
    fetchGroups()
  }, [])

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return
    setIsCreating(true)

    const color = GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]
    const { data, error } = await supabase
      .from('groups')
      .insert([{ name: groupName, color }])
      .select()
      .single()

    if (error) {
      console.error(error)
      setErrorMsg(`エラー: ${error.message} (code: ${error.code})`)
      setIsCreating(false)
      return
    }
    if (data) {
      addJoinedGroup(data.id)
      router.push(`/map/${data.id}`)
    }
  }

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (window.confirm('この一覧から削除しますか？（マップ自体は削除されません）')) {
      removeJoinedGroup(id)
      setGroups(prev => prev.filter(g => g.id !== id))
    }
  }

  return (
    <div
      className="min-h-screen bg-[#f0faf6] flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* ヘッダー */}
      <div className="bg-[var(--color-primary)] px-6 pt-10 pb-7 text-white relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm">
            <MapPin size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-wider">TabiTree</h1>
            <p className="text-white/90 text-xs font-semibold">みんなで作る、旅行マップ</p>
          </div>
        </div>
      </div>

      {/* マップ一覧 */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <h2 className="text-sm font-bold text-gray-500 mb-3 px-1">参加中のマップ</h2>

        {loading ? (
          <div className="text-center text-gray-400 py-16 text-sm">読み込み中...</div>
        ) : groups.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <Compass size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm leading-relaxed">まだマップがありません。<br />下のボタンから新しく作りましょう！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g, idx) => (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => router.push(`/map/${g.id}`)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 active:scale-[0.98] transition-all group text-left"
              >
                <div
                  className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: g.color || '#88D8C0' }}
                >
                  <MapPin size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 truncate">{g.name}</div>
                  <div className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(g.created_at), { addSuffix: true, locale: ja })}に作成
                  </div>
                </div>
                <button
                  onClick={(e) => handleRemove(e, g.id)}
                  className="p-2 text-gray-300 hover:text-rose-500 active:text-rose-500 rounded-lg transition-all flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
                <ChevronRight size={20} className="text-gray-300 flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* 新規作成ボタン */}
      <div className="flex-shrink-0 px-5 pb-6 pt-2">
        <button
          onClick={() => setShowCreate(true)}
          className="w-full bg-[var(--color-primary)] active:opacity-80 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md text-base"
        >
          <Plus size={22} />
          新しいマップを作る
        </button>
      </div>

      {/* 新規作成モーダル */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="relative bg-white rounded-t-3xl shadow-2xl w-full max-w-lg px-6 pt-5 pb-8"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2rem)' }}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-800">新しいマップを作る</h2>
                <button onClick={() => setShowCreate(false)} className="p-1.5 bg-gray-100 rounded-full text-gray-500">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <input
                  type="text"
                  placeholder="例: 北海道旅行2026"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all bg-gray-50 focus:bg-white text-gray-800 text-base"
                  maxLength={50}
                />
                {errorMsg && (
                  <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{errorMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={isCreating || !groupName.trim()}
                  className="w-full bg-[var(--color-primary)] active:opacity-80 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-md text-base"
                >
                  {isCreating ? '作成中...' : '作成する'}
                  {!isCreating && <ArrowRight size={20} />}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
