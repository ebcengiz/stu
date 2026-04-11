import type { SupabaseClient } from '@supabase/supabase-js'
import { STATIC_MASRAF_GROUPS } from '@/lib/masraf-kalemleri'

export type ExpenseItemSeedRow = {
  group_name: string
  item_key: string
  label: string
  sort_order: number
}

export function flattenStaticExpenseItems(): ExpenseItemSeedRow[] {
  const out: ExpenseItemSeedRow[] = []
  for (const g of STATIC_MASRAF_GROUPS) {
    g.items.forEach((it, idx) => {
      out.push({
        group_name: g.group,
        item_key: it.value,
        label: it.label,
        sort_order: idx,
      })
    })
  }
  return out
}

/** İlk kurulum: kiracıda hiç kalem yoksa varsayılan listeyi yükler. */
export async function ensureDefaultExpenseItems(supabase: SupabaseClient, tenantId: string) {
  const { count, error: cErr } = await supabase
    .from('expense_item_definitions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  if (cErr) throw cErr
  if ((count ?? 0) > 0) return
  const rows = flattenStaticExpenseItems().map((r) => ({ ...r, tenant_id: tenantId }))
  const { error } = await supabase.from('expense_item_definitions').insert(rows)
  if (error) throw error
}
