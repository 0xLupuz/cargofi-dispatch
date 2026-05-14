import { isAdminProfile, type UserProfile } from '@/lib/auth/profile'
import {
  canAccessOwnerOperator,
  canAccessTenant,
  type ProfileOwnership,
} from '@/lib/auth/ownership'

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: string }

function allow(): AccessDecision {
  return { allowed: true }
}

function deny(reason: string): AccessDecision {
  return { allowed: false, reason }
}

export function requireActiveProfile(profile: UserProfile | null | undefined): AccessDecision {
  if (!profile) {
    return deny('missing_profile')
  }

  if (!profile.active) {
    return deny('inactive_profile')
  }

  return allow()
}

export function authorizeTenantAccess(profile: UserProfile, tenantId: string): AccessDecision {
  const activeProfile = requireActiveProfile(profile)

  if (!activeProfile.allowed) {
    return activeProfile
  }

  if (!canAccessTenant(profile, tenantId)) {
    return deny('tenant_scope_mismatch')
  }

  return allow()
}

export function authorizeOwnerOperatorAccess(
  profile: UserProfile,
  ownership: ProfileOwnership | null,
  ownerOperatorId: string,
): AccessDecision {
  const activeProfile = requireActiveProfile(profile)

  if (!activeProfile.allowed) {
    return activeProfile
  }

  if (!canAccessOwnerOperator(profile, ownership, ownerOperatorId)) {
    return deny('owner_operator_scope_mismatch')
  }

  return allow()
}

export function authorizeOwnerOperatorTenantAccess(
  profile: UserProfile,
  ownership: ProfileOwnership | null,
  tenantId: string,
  ownerOperatorId: string,
): AccessDecision {
  const tenantAccess = authorizeTenantAccess(profile, tenantId)

  if (!tenantAccess.allowed) {
    return tenantAccess
  }

  if (isAdminProfile(profile)) {
    return allow()
  }

  return authorizeOwnerOperatorAccess(profile, ownership, ownerOperatorId)
}
