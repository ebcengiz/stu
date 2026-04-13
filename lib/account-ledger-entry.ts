import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingDbColumnError } from '@/lib/expense-movement-ref'

type EntryType = 'inflow' | 'outflow'

/**
 * Hesap detayları (GET /api/account-transactions) kaynağı: account_ledger_entries.
 * Bakiye güncellemesi (adjustAccountBalance) ile birlikte kullanılmalıdır.
 */
export async function insertAccountLedgerEntry(
  supabase: SupabaseClient,
  row: {
    tenant_id: string
    account_id: string
    entry_type: EntryType
    amount: number
    currency: string
    description: string
    /** yyyy-mm-dd */
    transaction_date: string
    portfolio_check_id?: string | null
  }
): Promise<string> {
  const d = String(row.transaction_date).slice(0, 10)
  const txIso = new Date(d + 'T12:00:00').toISOString()
  const payload: Record<string, unknown> = {
    tenant_id: row.tenant_id,
    account_id: row.account_id,
    entry_type: row.entry_type,
    amount: row.amount,
    currency: row.currency,
    description: row.description,
    transaction_date: txIso,
  }
  if (row.portfolio_check_id) payload.portfolio_check_id = row.portfolio_check_id

  let { data, error } = await supabase.from('account_ledger_entries').insert(payload).select('id').single()
  if (error && row.portfolio_check_id && isMissingDbColumnError(error, 'portfolio_check_id')) {
    delete payload.portfolio_check_id
    const retry = await supabase.from('account_ledger_entries').insert(payload).select('id').single()
    data = retry.data
    error = retry.error
  }
  if (error) throw error
  return data!.id as string
}

export async function deleteAccountLedgerEntry(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<void> {
  const { error } = await supabase.from('account_ledger_entries').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) throw error
}
