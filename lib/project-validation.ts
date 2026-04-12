import type { SupabaseClient } from '@supabase/supabase-js'

/** Geçerli tenant projesi yoksa null döner; geçersiz id gönderilirse 400 için null + invalid. */
export async function resolveOptionalProjectId(
  supabase: SupabaseClient,
  tenantId: string,
  raw: unknown
): Promise<{ projectId: string | null; invalid: boolean }> {
  if (raw === undefined || raw === null || raw === '') {
    return { projectId: null, invalid: false }
  }
  const id = String(raw).trim()
  if (!id) return { projectId: null, invalid: false }

  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw error
  if (!data) return { projectId: null, invalid: true }
  return { projectId: data.id, invalid: false }
}
