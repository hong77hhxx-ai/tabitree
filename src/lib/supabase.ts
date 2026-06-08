import { createClient } from '@supabase/supabase-js'

// trim + ASCII以外を除去（Vercel環境変数のエンコード問題対策）
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co').trim().replace(/[^\x20-\x7E]/g, '')
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key').trim().replace(/[^\x20-\x7E]/g, '')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Pin = {
  id: string
  group_id: string
  lat: number
  lng: number
  category: 'Eat' | 'Stay' | 'Sightseeing' | 'Onsen' | 'Here'
  title: string
  notes: string | null
  status: 'Planned' | 'Visited'
  photo_url: string | null
  reactions: Record<string, number> | null
  scheduled_at: string | null
  created_at: string
  // 作成者情報（認証なしのため作成時にスナップショットを保存）
  created_by: string | null
  creator_name: string | null
  creator_avatar: string | null
}

export const uploadPhoto = async (file: File, pinId: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${pinId}_${Math.random()}.${fileExt}`
  const filePath = `${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('pin-photos')
    .upload(filePath, file)

  if (uploadError) {
    console.error('Error uploading photo:', uploadError)
    return null
  }

  const { data } = supabase.storage.from('pin-photos').getPublicUrl(filePath)
  return data.publicUrl
}

export type Group = {
  id: string
  name: string
  color: string | null
  photo_url: string | null
  created_at: string
}

// グループの写真をアップロード（pin-photos バケットを流用）
export const uploadGroupPhoto = async (file: File, groupId: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop()
  const filePath = `groups/${groupId}_${Date.now()}.${fileExt}`

  const { error } = await supabase.storage.from('pin-photos').upload(filePath, file)
  if (error) { console.error('Group photo upload error:', error); return null }

  const { data } = supabase.storage.from('pin-photos').getPublicUrl(filePath)
  return data.publicUrl
}

// マップの色パレット（6色）
export const GROUP_COLORS = [
  '#88D8C0', '#FFB3BA', '#BAE1FF',
  '#FFD8A8', '#C3B1E1', '#A8E6CF',
]

// localStorageに保存する参加グループの形
export type StoredGroup = {
  id: string
  name: string
  color: string | null
  photo_url?: string | null
  joinedAt: string
}

const GROUPS_KEY = 'tabitree_groups'

// 参加したマップをlocalStorageで管理（認証なし）
export const getStoredGroups = (): StoredGroup[] => {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]')
  } catch {
    return []
  }
}

export const addStoredGroup = (group: { id: string, name: string, color: string | null, photo_url?: string | null }) => {
  if (typeof window === 'undefined') return
  const groups = getStoredGroups()
  const existing = groups.find(g => g.id === group.id)
  if (existing) {
    // 既存なら写真など最新情報を反映
    const merged = groups.map(g => g.id === group.id ? { ...g, ...group } : g)
    localStorage.setItem(GROUPS_KEY, JSON.stringify(merged))
    return
  }
  const updated: StoredGroup[] = [
    { ...group, joinedAt: new Date().toISOString() },
    ...groups,
  ]
  localStorage.setItem(GROUPS_KEY, JSON.stringify(updated))
}

// 参加グループの写真をローカルにも反映
export const updateStoredGroupPhoto = (id: string, photo_url: string | null) => {
  if (typeof window === 'undefined') return
  const updated = getStoredGroups().map(g => g.id === id ? { ...g, photo_url } : g)
  localStorage.setItem(GROUPS_KEY, JSON.stringify(updated))
}

// 参加グループの名前をローカルにも反映
export const updateStoredGroupName = (id: string, name: string) => {
  if (typeof window === 'undefined') return
  const updated = getStoredGroups().map(g => g.id === id ? { ...g, name } : g)
  localStorage.setItem(GROUPS_KEY, JSON.stringify(updated))
}

export const removeStoredGroup = (id: string) => {
  if (typeof window === 'undefined') return
  const updated = getStoredGroups().filter(g => g.id !== id)
  localStorage.setItem(GROUPS_KEY, JSON.stringify(updated))
}

export type MemberLocation = {
  id: string
  group_id: string
  user_id: string
  nickname: string
  avatar_url: string | null
  lat: number
  lng: number
  updated_at: string
}

// 保存された最適化ルート（タイムラインで一覧表示）
export type SavedRoute = {
  id: string
  group_id: string
  name: string
  mode: 'WALKING' | 'DRIVING'
  pin_ids: string[]
  total_distance_m: number | null
  total_duration_s: number | null
  created_by: string | null
  creator_name: string | null
  creator_avatar: string | null
  created_at: string
}

// 一度でも参加した（マップを開いた）メンバーの永続記録
export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  nickname: string | null
  avatar_url: string | null
  joined_at: string
  updated_at: string
}

// グループ参加を記録（マップを開いたときに呼ぶ）
export const upsertGroupMember = async (
  groupId: string, userId: string, nickname: string | null, avatarUrl: string | null
) => {
  if (!groupId || !userId) return
  await supabase.from('group_members').upsert({
    group_id: groupId,
    user_id: userId,
    nickname,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'group_id,user_id' })
}

export const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop()
  const filePath = `avatars/${userId}.${fileExt}`

  await supabase.storage.from('pin-photos').remove([filePath])

  const { error } = await supabase.storage.from('pin-photos').upload(filePath, file)
  if (error) { console.error('Avatar upload error:', error); return null }

  const { data } = supabase.storage.from('pin-photos').getPublicUrl(filePath)
  return data.publicUrl
}

export const getUserId = (): string => {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('tabitree_user_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('tabitree_user_id', id)
  }
  return id
}

// 思い出のリアクション（いいね・絵文字）は1アカウントにつき1ピン1回まで。
// 自分がどのピンにどのスタンプを付けたかを localStorage で記録する。
const MY_REACTIONS_KEY = 'tabitree_my_reactions'

const getMyReactions = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(MY_REACTIONS_KEY) || '{}')
  } catch {
    return {}
  }
}

export const getMyReaction = (pinId: string): string | null => {
  if (!pinId) return null
  return getMyReactions()[pinId] || null
}

export const setMyReaction = (pinId: string, emojiId: string | null) => {
  if (typeof window === 'undefined' || !pinId) return
  const all = getMyReactions()
  if (emojiId) all[pinId] = emojiId
  else delete all[pinId]
  localStorage.setItem(MY_REACTIONS_KEY, JSON.stringify(all))
}
