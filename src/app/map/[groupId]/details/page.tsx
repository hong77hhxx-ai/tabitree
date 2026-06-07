'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  supabase, Group, GroupMember, Pin,
  getStoredGroups, addStoredGroup, StoredGroup,
  uploadGroupPhoto, updateStoredGroupPhoto, updateStoredGroupName,
} from '@/lib/supabase'
import {
  MapPin, Camera, Loader2, ChevronLeft, Users, Pencil, Check, Home, X,
  Utensils, Bed, Camera as CameraIcon, Droplets, ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

const CATEGORY_LABEL: Record<string, string> = {
  Eat: '食べる', Stay: '泊まる', Sightseeing: '観光', Onsen: '温泉', Here: '今ここ',
}
const STATUS_LABEL: Record<string, string> = {
  Planned: '行きたい', Confirmed: '予約済', Visited: '行った',
}
const categoryIcon = (category: string, size = 16) => {
  switch (category) {
    case 'Eat': return <Utensils size={size} className="text-rose-600" />
    case 'Stay': return <Bed size={size} className="text-emerald-600" />
    case 'Sightseeing': return <CameraIcon size={size} className="text-sky-600" />
    case 'Onsen': return <Droplets size={size} className="text-amber-600" />
    case 'Here': return <Users size={size} className="text-violet-600" />
    default: return <MapPin size={size} className="text-teal-600" />
  }
}

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string

  const [group, setGroup] = useState<StoredGroup | null>(null)
  const [loadingGroup, setLoadingGroup] = useState(true)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pins, setPins] = useState<Pin[]>([])
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null)

  // 名前編集
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)

  // グループデータ読み込み・同期
  useEffect(() => {
    if (!groupId) return

    const loadData = async () => {
      setLoadingGroup(true)
      // 1. ローカルストレージから先に取得して表示
      const stored = getStoredGroups()
      const current = stored.find(g => g.id === groupId)
      if (current) {
        setGroup(current)
        setNameDraft(current.name)
      }

      // 2. DBから最新情報を取得して同期
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (!error && data) {
        const g = data as Group
        addStoredGroup({ id: g.id, name: g.name, color: g.color, photo_url: g.photo_url ?? null })
        
        // 再度ローカルストレージから最新の形を取得してステート更新
        const updatedStored = getStoredGroups().find(x => x.id === groupId)
        if (updatedStored) {
          setGroup(updatedStored)
          setNameDraft(updatedStored.name)
        }
      }
      setLoadingGroup(false)
    }

    const fetchMembers = async () => {
      setMembersLoading(true)
      // 一度でも参加した全員を表示（group_members に永続記録）
      const { data } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true })

      if (data) {
        setMembers(data as GroupMember[])
      }
      setMembersLoading(false)
    }

    const fetchPins = async () => {
      const { data } = await supabase.from('pins').select('*').eq('group_id', groupId)
      if (data) setPins(data as Pin[])
    }

    loadData()
    fetchMembers()
    fetchPins()
  }, [groupId])

  // 指定メンバーが追加したピン
  const pinsByMember = (userId: string) =>
    pins.filter(p => p.created_by === userId && p.category !== 'Here')

  // 写真変更処理
  const handleGroupPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !groupId) return
    setUploading(true)
    const url = await uploadGroupPhoto(file, groupId)
    if (url) {
      await supabase.from('groups').update({ photo_url: url }).eq('id', groupId)
      updateStoredGroupPhoto(groupId, url)
      
      setGroup(prev => prev ? { ...prev, photo_url: url } : null)
    }
    setUploading(false)
  }

  // 名前変更処理
  const handleRename = async () => {
    const name = nameDraft.trim()
    if (!groupId || !name || (group && name === group.name)) {
      setEditingName(false)
      return
    }
    setSavingName(true)
    const { error } = await supabase.from('groups').update({ name }).eq('id', groupId)
    if (!error) {
      updateStoredGroupName(groupId, name)
      setGroup(prev => prev ? { ...prev, name } : null)
    }
    setSavingName(false)
    setEditingName(false)
  }

  const handleBack = () => {
    // 履歴があれば戻り、無ければマップ画面かトップへ遷移
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(`/map/${groupId}`)
    }
  }

  if (loadingGroup && !group) {
    return (
      <div className="min-h-screen bg-[var(--surface-muted-2)] flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)] mb-2" />
        <p className="text-sm text-[var(--text-muted)] font-semibold">読み込み中...</p>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[var(--surface-muted-2)] flex flex-col items-center justify-center p-6 text-center">
        <MapPin size={48} className="text-gray-300 mb-4" />
        <h2 className="text-lg font-bold text-[var(--text-strong)] mb-2">グループが見つかりません</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">URLが正しくないか、グループが削除された可能性があります。</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-2xl shadow-md active:opacity-90 transition-all flex items-center gap-2"
        >
          <Home size={18} />
          トップページに戻る
        </button>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-[var(--surface-muted-2)] flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* ヘッダー */}
      <div className="px-2 pt-5 pb-3 bg-[var(--surface)] border-b border-[var(--border-soft)] flex items-center flex-shrink-0">
        <button onClick={handleBack} className="p-2 text-[var(--text-muted)] active:opacity-70 flex items-center gap-1">
          <ChevronLeft size={22} />
          <span className="text-sm font-bold">戻る</span>
        </button>
        <h1 className="text-base font-extrabold text-[var(--text-strong)] ml-2">グループ詳細</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* 写真 + 名前 */}
        <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border-soft)] p-6 flex flex-col items-center gap-4">
          <label className="relative cursor-pointer group/dp">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center border border-black/5"
              style={{ backgroundColor: group.color || '#88D8C0' }}
            >
              {group.photo_url ? (
                <img src={group.photo_url} alt={group.name} className="w-full h-full object-cover" />
              ) : (
                <MapPin size={32} className="text-white" />
              )}
              <span className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover/dp:opacity-100 active:opacity-100 transition-opacity">
                {uploading
                  ? <Loader2 size={20} className="text-white animate-spin" />
                  : <Camera size={20} className="text-white" />}
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGroupPhoto}
              disabled={uploading}
            />
          </label>

          {/* 名前（変更可能） */}
          {editingName ? (
            <div className="w-full flex items-center gap-2 max-w-sm">
              <input
                type="text"
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                autoFocus
                maxLength={50}
                className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-sunken)] text-[var(--text-strong)] font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
              <button
                onClick={handleRename}
                disabled={savingName}
                className="p-2.5 rounded-xl text-white flex-shrink-0 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent, #0d9488)' }}
              >
                {savingName ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNameDraft(group.name); setEditingName(true) }}
              className="flex items-center gap-2 text-[var(--text-strong)] font-extrabold text-lg active:opacity-70"
            >
              {group.name}
              <Pencil size={15} className="text-[var(--text-muted)]" />
            </button>
          )}
          <span className="text-[11px] text-[var(--text-muted)] font-medium">写真・名前をタップで変更できます</span>
        </div>

        {/* メンバー一覧 */}
        <div>
          <h2 className="text-xs font-bold text-[var(--text-muted)] mb-2.5 px-1 tracking-wider uppercase flex items-center gap-1.5">
            <Users size={14} style={{ color: 'var(--accent, #0d9488)' }} />
            メンバー（{members.length}）
          </h2>
          <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border-soft)] overflow-hidden">
            {membersLoading ? (
              <div className="py-8 flex justify-center text-[var(--text-muted)]">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--text-muted)] font-medium">
                まだメンバーがいません。
              </div>
            ) : (
              members.map((m, i) => {
                const count = pinsByMember(m.user_id).length
                return (
                  <button
                    key={m.user_id}
                    onClick={() => setSelectedMember(m)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[var(--surface-sunken)] transition-colors ${i > 0 ? 'border-t border-[var(--border-soft)]' : ''}`}
                  >
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ backgroundColor: group.color || '#88D8C0' }}
                    >
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.nickname || ''} className="w-full h-full object-cover" />
                      ) : (
                        (m.nickname || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[var(--text-strong)] truncate text-sm">{m.nickname || '名無し'}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                        {count}件のスポットを追加
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[var(--text-muted)] flex-shrink-0" />
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* メンバー詳細オーバーレイ：名前 + 追加したピン一覧 */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedMember(null)}
          />
          <div
            className="relative bg-[var(--surface)] rounded-t-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="w-10 h-1 bg-[var(--border-soft)] rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
            {/* メンバーヘッダー */}
            <div className="px-6 pt-3 pb-4 flex items-center gap-3 border-b border-[var(--border-soft)] flex-shrink-0">
              <div
                className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                style={{ backgroundColor: group.color || '#88D8C0' }}
              >
                {selectedMember.avatar_url ? (
                  <img src={selectedMember.avatar_url} alt={selectedMember.nickname || ''} className="w-full h-full object-cover" />
                ) : (
                  (selectedMember.nickname || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-[var(--text-strong)] text-lg truncate">{selectedMember.nickname || '名無し'}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                  {selectedMember.joined_at
                    ? `${formatDistanceToNow(new Date(selectedMember.joined_at), { addSuffix: true, locale: ja })}に参加`
                    : ''}
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-2 bg-[var(--surface-sunken)] rounded-full text-[var(--text-muted)] flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* 追加したピン一覧 */}
            <div className="px-5 py-4 overflow-y-auto">
              <h3 className="text-xs font-bold text-[var(--text-muted)] mb-2 px-1 tracking-wider uppercase">
                追加したスポット（{pinsByMember(selectedMember.user_id).length}）
              </h3>
              {pinsByMember(selectedMember.user_id).length === 0 ? (
                <div className="py-10 text-center text-sm text-[var(--text-muted)] font-medium">
                  まだスポットを追加していません。
                </div>
              ) : (
                <div className="space-y-2">
                  {pinsByMember(selectedMember.user_id).map(p => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-[var(--surface-sunken)] rounded-2xl px-3 py-3 border border-[var(--border-soft)]"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border-soft)] flex items-center justify-center flex-shrink-0">
                        {categoryIcon(p.category, 18)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[var(--text-strong)] text-sm truncate">{p.title || '無題のスポット'}</div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {CATEGORY_LABEL[p.category] ?? p.category}
                          {p.status ? `・${STATUS_LABEL[p.status] ?? p.status}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
