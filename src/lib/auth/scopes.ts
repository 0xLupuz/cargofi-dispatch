interface EqQuery<T> {
  eq(column: string, value: string): T
}

interface IsQuery<T> {
  is(column: string, value: boolean | null): T
}

export function scopeTenant<T extends EqQuery<T>>(query: T, tenantId: string) {
  return query.eq('tenant_id', tenantId)
}

export function scopeOwnerOperator<T extends EqQuery<T>>(query: T, ownerOperatorId: string) {
  return query.eq('owner_operator_id', ownerOperatorId)
}

export function scopeDriver<T extends EqQuery<T>>(query: T, driverId: string) {
  return query.eq('driver_id', driverId)
}

export function scopeActiveDriverAssignment<T extends EqQuery<T> & IsQuery<T>>(
  query: T,
  driverId: string,
) {
  return query.eq('driver_id', driverId).is('ends_at', null)
}
