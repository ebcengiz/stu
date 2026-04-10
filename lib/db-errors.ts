/** PostgREST: tabloda sütun yoksa insert/select hata metni */
export function isMissingColumnSchemaError(
  err: { message?: string } | null | undefined,
  column: string
): boolean {
  const m = String(err?.message || '')
  return (
    m.includes(column) &&
    (m.includes('schema cache') || m.includes('Could not find'))
  )
}
