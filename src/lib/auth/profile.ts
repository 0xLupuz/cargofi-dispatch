import { createServiceClient } from '@/lib/supabase'

export type AppRole = 'admin' | 'owner_operator' | 'driver'

export interface UserProfile {
  id: string
  tenant_id: string
  role: AppRole
  display_name: string | null
  phone: string | null
  active: boolean
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await createServiceClient()
    .from('user_profiles')
    .select('id, tenant_id, role, display_name, phone, active')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('user_profiles lookup failed:', error.message)
    return null
  }

  return data as UserProfile | null
}

export async function getActiveUserProfile(userId: string): Promise<UserProfile | null> {
  const profile = await getUserProfile(userId)
  if (!profile?.active) return null
  return profile
}
