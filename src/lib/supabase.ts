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
  status: 'Planned' | 'Confirmed' | 'Visited'
  photo_url: string | null
  reactions: Record<string, number> | null
  scheduled_at: string | null
  created_at: string
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
  created_at: string
}

// マップの色パレット
export const GROUP_COLORS = [
  '#88D8C0', '#FFB3BA', '#BAE1FF', '#FFD8A8',
  '#C3B1E1', '#A8E6CF', '#FFAAA5', '#B5EAD7',
]

// 参加したマップのID一覧をlocalStorageで管理（認証なし）
export const getJoinedGroupIds = (): string[] => {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('tabitree_joined_groups') || '[]')
  } catch {
    return []
  }
}

export const addJoinedGroup = (groupId: string) => {
  if (typeof window === 'undefined') return
  const ids = getJoinedGroupIds()
  if (!ids.includes(groupId)) {
    // 最新を先頭に
    localStorage.setItem('tabitree_joined_groups', JSON.stringify([groupId, ...ids]))
  }
}

export const removeJoinedGroup = (groupId: string) => {
  if (typeof window === 'undefined') return
  const ids = getJoinedGroupIds().filter(id => id !== groupId)
  localStorage.setItem('tabitree_joined_groups', JSON.stringify(ids))
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
