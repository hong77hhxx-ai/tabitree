'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  supabase, Group, GROUP_COLORS,
  getStoredGroups, addStoredGroup, removeStoredGroup, StoredGroup,
  uploadGroupPhoto, updateStoredGroupPhoto,
} from '@/lib/supabase'
import { MapPin, Plus, ArrowRight, ChevronRight, Trash2, X, Compass, Link2, Layers, Camera, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

type GroupsListProps = {
  currentGroupId: string
}

type Mode = 'none' | 'create' | 'join'

export default function GroupsList({ currentGroupId }: GroupsListProps) {
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
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  useEffect(() => {
    const stored = getStoredGroups()
    setGroups(stored)
    // DBから最新情報（写真など）を同期
    const ids = stored.map(g => g.id)
    if (ids.length === 0) return
    supabase.from('groups').select('*').in('id', ids).then(({ data }) => {
      if (!data) return
      ;(data as Group[]).forEach(g => {
        addStoredGroup({ id: g.id, name: g.name, color: g.color, photo_url: g.photo_url ?? null })
      })
      setGroups(getStoredGroups())
    })
  }, [])

  const handleGroupPhoto = async (e: React.ChangeEvent<HTMLInputElement>, groupId: string) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingId(groupId)
    const url = await uploadGroupPhoto(file, groupId)
    if (url) {
      await supabase.from('groups').update({ photo_url: url }).eq('id', groupId)
      updateStoredGroupPhoto(groupId, url)
      setGroups(getStoredGroups())
    }
    setUploadingId(null)
  }

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
    setGroups(getStoredGroups())
    closeForm()
    router.push(`/map/${g.id}`)
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = joinInput.trim()
    if (!raw) return
    setErrorMsg('')
    setIsJoining(true)

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
    setGroups(getStoredGroups())
    closeForm()
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
    setIsCreating(false)
    setIsJoining(false)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f0faf6] overflow-y-auto">
      {/* ヘッダー */}
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100 flex-shrink-0">
        <h1 className="text-xl font-extrabold text-gray-850 flex items-center gap-2">
          <Layers className="text-teal-600" size={24} />
          マップグループ
        </h1>
        <p className="text-xs text-gray-500 mt-1">あなたが参加しているマップの切り替え・管理ができます。</p>
      </div>

      {/* マップ一覧 */}
      <div className="flex-1 px-5 py-5 overflow-y-auto">
        <h2 className="text-xs font-bold text-gray-400 mb-3 px-1 tracking-wider uppercase">参加中のマップ</h2>

        {groups.length === 0 ? (
          <div className="text-center text-gray-400 py-16 bg-white rounded-2xl shadow-sm border border-gray-100/50">
            <Compass size={40} className="mx-auto mb-3 opacity-40 text-teal-600" />
            <p className="text-sm leading-relaxed">まだマップがありません。<br />下のボタンから始めましょう！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g, idx) => {
              const isCurrent = g.id === currentGroupId
              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => {
                    if (!isCurrent) router.push(`/map/${g.id}`)
                  }}
                  className={`bg-white rounded-2xl shadow-sm border flex items-center overflow-hidden active:scale-[0.98] transition-all cursor-pointer ${
                    isCurrent ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  {/* カラーバー */}
                  <div className="w-2 self-stretch flex-shrink-0" style={{ backgroundColor: g.color || '#88D8C0' }} />
                  <div className="flex items-center gap-3 flex-1 min-w-0 p-4">
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center relative overflow-hidden cursor-pointer group/photo"
                      style={{ backgroundColor: g.color || '#88D8C0' }}
                    >
                      {g.photo_url ? (
                        <img src={g.photo_url} alt={g.name} className="w-full h-full object-cover" />
                      ) : (
                        <MapPin size={20} className="text-white" />
                      )}
                      {/* 写真変更オーバーレイ */}
                      <span className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 active:opacity-100 transition-opacity">
                        {uploadingId === g.id
                          ? <Loader2 size={16} className="text-white animate-spin" />
                          : <Camera size={16} className="text-white" />}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleGroupPhoto(e, g.id)}
                        disabled={uploadingId === g.id}
                      />
                      {isCurrent && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-teal-500 border-2 border-white"></span>
                        </span>
                      )}
                    </label>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 truncate">{g.name}</span>
                        {isCurrent && (
                          <span className="bg-teal-50 text-teal-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-teal-100 flex-shrink-0">
                            表示中
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {g.joinedAt ? formatDistanceToNow(new Date(g.joinedAt), { addSuffix: true, locale: ja }) : ''}に参加
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleRemove(e, g.id)}
                      className="p-2 text-gray-300 hover:text-rose-500 active:text-rose-500 rounded-lg transition-all flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={20} className={`text-gray-300 flex-shrink-0 ${isCurrent ? 'text-teal-500' : ''}`} />
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex-shrink-0 px-5 pb-8 pt-4 bg-white border-t border-gray-100 flex flex-col gap-3">
        <button
          onClick={() => { closeForm(); setMode('create') }}
          className="w-full bg-teal-600 active:bg-teal-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md text-base"
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

      {/* フォーム（ボトムシート/モーダル） */}
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
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all bg-gray-50 focus:bg-white text-gray-800 text-base"
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
                    className="w-full bg-teal-600 active:bg-teal-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-md text-base"
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
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all bg-gray-50 focus:bg-white text-gray-800 text-base"
                    />
                    <p className="text-xs text-gray-400 mt-2">共有されたURLをそのまま貼り付けてもOKです。</p>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isJoining || !joinInput.trim()}
                    className="w-full bg-teal-600 active:bg-teal-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-md text-base"
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
