import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Pin = {
  id: string
  group_id: string
  lat: number
  lng: number
  category: 'Eat' | 'Stay' | 'Sightseeing' | 'Onsen'
  title: string
  notes: string | null
  status: 'Planned' | 'Confirmed' | 'Visited'
  photo_url: string | null
  reactions: Record<string, number> | null
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
