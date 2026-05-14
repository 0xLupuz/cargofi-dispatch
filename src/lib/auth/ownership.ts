import { createServiceClient } from '@/lib/supabase'
import { isAdminProfile, type UserProfile } from '@/lib/auth/profile'

export type DriverAssignmentType = 'owner_operator' | 'company'

export interface OwnerOperatorMembership {
  user_id: string
  owner_operator_id: string
}

export interface DriverMembership {
  user_id: string
  driver_id: string
}

export interface DriverAssignment {
  id: string
  tenant_id: string
  driver_id: string
  assignment_type: DriverAssignmentType
  owner_operator_id: string | null
  unit_id: string | null
  starts_at: string
  ends_at: string | null
}

export interface ProfileOwnership {
  profile: UserProfile
  ownerOperatorId: string | null
  driverId: string | null
  currentDriverAssignment: DriverAssignment | null
}

export async function getOwnerOperatorMembership(
  profile: UserProfile,
): Promise<OwnerOperatorMembership | null> {
  if (profile.role !== 'owner_operator') {
    return null
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('owner_operator_users')
    .select('user_id, owner_operator_id')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (error) {
    console.error('Failed to load owner operator membership', error)
    return null
  }

  return data
}

export async function getDriverMembership(profile: UserProfile): Promise<DriverMembership | null> {
  if (profile.role !== 'driver') {
    return null
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('driver_users')
    .select('user_id, driver_id')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (error) {
    console.error('Failed to load driver membership', error)
    return null
  }

  return data
}

export async function getCurrentDriverAssignment(driverId: string): Promise<DriverAssignment | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('driver_assignments')
    .select('id, tenant_id, driver_id, assignment_type, owner_operator_id, unit_id, starts_at, ends_at')
    .eq('driver_id', driverId)
    .is('ends_at', null)
    .maybeSingle()

  if (error) {
    console.error('Failed to load current driver assignment', error)
    return null
  }

  return data
}

export async function resolveProfileOwnership(profile: UserProfile): Promise<ProfileOwnership> {
  if (isAdminProfile(profile)) {
    return {
      profile,
      ownerOperatorId: null,
      driverId: null,
      currentDriverAssignment: null,
    }
  }

  if (profile.role === 'owner_operator') {
    const membership = await getOwnerOperatorMembership(profile)

    return {
      profile,
      ownerOperatorId: membership?.owner_operator_id ?? null,
      driverId: null,
      currentDriverAssignment: null,
    }
  }

  if (profile.role === 'driver') {
    const membership = await getDriverMembership(profile)
    const currentDriverAssignment = membership?.driver_id
      ? await getCurrentDriverAssignment(membership.driver_id)
      : null

    return {
      profile,
      ownerOperatorId: currentDriverAssignment?.owner_operator_id ?? null,
      driverId: membership?.driver_id ?? null,
      currentDriverAssignment,
    }
  }

  return {
    profile,
    ownerOperatorId: null,
    driverId: null,
    currentDriverAssignment: null,
  }
}

export function canAccessTenant(profile: UserProfile, tenantId: string) {
  return profile.active === true && profile.tenant_id === tenantId
}

export function canAccessOwnerOperator(
  profile: UserProfile,
  ownership: ProfileOwnership | null,
  ownerOperatorId: string,
) {
  if (!profile.active) {
    return false
  }

  if (isAdminProfile(profile)) {
    return true
  }

  if (profile.role === 'owner_operator') {
    return ownership?.ownerOperatorId === ownerOperatorId
  }

  if (profile.role === 'driver') {
    return ownership?.currentDriverAssignment?.owner_operator_id === ownerOperatorId
  }

  return false
}

export function getOwnerOperatorScope(profile: UserProfile, ownership: ProfileOwnership | null) {
  if (!profile.active || isAdminProfile(profile)) {
    return null
  }

  return ownership?.ownerOperatorId ?? null
}

export function isCompanyAssignedDriver(ownership: ProfileOwnership | null) {
  return ownership?.currentDriverAssignment?.assignment_type === 'company'
}
