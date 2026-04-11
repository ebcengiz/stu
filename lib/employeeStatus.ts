/**
 * API / DB'den gelen leave_date değerinin "işten çıkmış" anlamına gelip gelmediği.
 * Boş string, null, anlamsız veya 0000-… tarihleri aktif sayılır.
 */
export function hasTerminationDate(leaveDate: unknown): boolean {
  if (leaveDate == null) return false

  const s = String(leaveDate).trim()
  if (s === '' || s === 'null' || s === 'undefined') return false

  const part = s.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(part)) return false
  if (part.startsWith('0000')) return false

  const [y, m, d] = part.split('-').map(Number)
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return false

  return true
}

export function isActiveEmployeeRecord(leaveDate: unknown): boolean {
  return !hasTerminationDate(leaveDate)
}
