'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  supabase, Group, GROUP_COLORS,
  getStoredGroups, addStoredGroup, removeStoredGroup, StoredGroup,
} from '@/lib/supabase'
import { MapPin, Plus, ArrowRight, ChevronRight, Trash2, X, Compass, Link2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

type Mode = 'none' | 'create' | 'join'

export default function Home() {
  const router = useRouter()
  const [groups, setGroups] = useState<StoredGroup[]>([])
  const [mode, setMode] = useState<Mode>('none')

  // 作成フォーム
  const [groupName, setGroupName] = useState('')
  const [selectedColor, setSelectedColor] = useState(GROUP_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)

  // 参加フォーム
  const [joinInput, setJoinInput] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    setGroups(getStoredGroups())
  }, [])

  // 新規作成
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return
    setErrorMsg('')
    setIsCreating(true)

    const { data, error } = await supabase
      .from('groups')
      .insert([{ name: groupName.trim(), color: selectedColor }])
      .select()
      .single()

    if (error || !data) {
      setErrorMsg(`作成に失敗しました: ${error?.message ?? '不明なエラー'}`)
      setIsCreating(false)
      return
    }

    const g = data as Group
    addStoredGroup({ id: g.id, name: g.name, color: g.color })
    router.push(`/map/${g.id}`)
  }

  // URL/IDで参加
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = joinInput.trim()
    if (!raw) return
    setErrorMsg('')
    setIsJoining(true)

    // URLからID(UUID)を抽出、なければ入力値そのものをIDとして扱う
    const uuidMatch = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    const id = uuidMatch ? uuidMatch[0] : raw

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      setErrorMsg('マップが見つかりませんでした。URLまたはIDを確認してください。')
      setIsJoining(false)
      return
    }

    const g = data as Group
    addStoredGroup({ id: g.id, name: g.name, color: g.color })
    router.push(`/map/${g.id}`)
  }

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (window.confirm('この一覧から削除しますか？（マップ自体は削除されません）')) {
      removeStoredGroup(id)
      setGroups(getStoredGroups())
    }
  }

  const closeForm = () => {
    setMode('none')
    setErrorMsg('')
    setGroupName('')
    setJoinInput('')
    setSelectedColor(GROUP_COLORS[0])
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

        {groups.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <Compass size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm leading-relaxed">まだマップがありません。<br />下のボタンから始めましょう！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g, idx) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => router.push(`/map/${g.id}`)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center overflow-hidden active:scale-[0.98] transition-all cursor-pointer"
              >
                {/* カラーバー */}
                <div className="w-2 self-stretch flex-shrink-0" style={{ backgroundColor: g.color || '#88D8C0' }} />
                <div className="flex items-center gap-3 flex-1 min-w-0 p-4">
                  <div
                    className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: g.color || '#88D8C0' }}
                  >
                    <MapPin size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 truncate">{g.name}</div>
                    <div className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(g.joinedAt), { addSuffix: true, locale: ja })}に参加
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleRemove(e, g.id)}
                    className="p-2 text-gray-300 hover:text-rose-500 active:text-rose-500 rounded-lg transition-all flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronRight size={20} className="text-gray-300 flex-shrink-0" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex-shrink-0 px-5 pb-6 pt-2 space-y-3">
        <button
          onClick={() => { closeForm(); setMode('create') }}
          className="w-full bg-[var(--color-primary)] active:opacity-80 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md text-base"
        >
          <Plus size={22} />
          新しいマップを作る
        </button>
        <button
          onClick={() => { closeForm(); setMode('join') }}
          className="w-full bg-white active:bg-gray-50 text-gray-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all border border-gray-200 text-base"
        >
          <Link2 size={20} />
          URLで参加する
        </button>
      </div>

      {/* フォーム（ボトムシート） */}
      <AnimatePresence>
        {mode !== 'none' && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeForm}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="relative bg-white rounded-t-3xl shadow-2xl w-full max-w-lg px-6 pt-5"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2rem)' }}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-800">
                  {mode === 'create' ? '新しいマップを作る' : 'URLで参加する'}
                </h2>
                <button onClick={closeForm} className="p-1.5 bg-gray-100 rounded-full text-gray-500">
                  <X size={18} />
                </button>
              </div>

              {/* 新規作成フォーム */}
              {mode === 'create' && (
                <form onSubmit={handleCreateGroup} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">マップ名</label>
                    <input
                      type="text"
                      placeholder="例: 北海道旅行2026"
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      autoFocus
                      maxLength={50}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all bg-gray-50 focus:bg-white text-gray-800 text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">カラー</label>
                    <div className="flex gap-3">
                      {GROUP_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={`w-10 h-10 rounded-full transition-all ${
                            selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={color}
                        />
                      ))}
                    </div>
                  </div>

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
              )}

              {/* 参加フォーム */}
              {mode === 'join' && (
                <form onSubmit={handleJoin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">マップのURL または ID</label>
                    <input
                      type="text"
                      placeholder="https://tabitree.vercel.app/map/..."
                      value={joinInput}
                      onChange={e => setJoinInput(e.target.value)}
                      autoFocus
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all bg-gray-50 focus:bg-white text-gray-800 text-base"
                    />
                    <p className="text-xs text-gray-400 mt-2">共有されたURLをそのまま貼り付けてもOKです。</p>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isJoining || !joinInput.trim()}
                    className="w-full bg-[var(--color-primary)] active:opacity-80 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-md text-base"
                  >
                    {isJoining ? '確認中...' : '参加する'}
                    {!isJoining && <ArrowRight size={20} />}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
