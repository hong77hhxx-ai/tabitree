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
  created_at: string
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
