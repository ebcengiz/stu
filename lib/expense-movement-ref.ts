import type { SupabaseClient } from '@supabase/supabase-js'

/** Masraf kaydı ile defter/cari satırlarını eşlemek için (migration yoksa da çalışır) */
export function appendExpenseRef(description: string, expenseId: string): string {
  const tag = `ref:${expenseId}`
  if (description.includes(tag)) return description
  return `${description} · ${tag}`
}

export function isMissingDbColumnError(err: { message?: string } | null | undefined, column: string): boolean {
  const m = String(err?.message ?? '')
  return (
    m.includes(column) &&
    (m.includes('schema cache') || m.includes('Could not find') || m.includes('column') || m.includes('does not exist'))
  )
}

type LedgerRow = { id: string; account_id: string; entry_type: string; amount: unknown; currency: unknown }

/** Silme / geri alma için: önce general_expense_id, yoksa açıklamadaki ref etiketi */
export async function fetchLedgerRowsForExpense(
  supabase: SupabaseClient,
  tenantId: string,
  expenseId: string,
  accountId: string
): Promise<LedgerRow[]> {
  const r1 = await supabase
    .from('account_ledger_entries')
    .select('id, account_id, entry_type, amount, currency')
    .eq('tenant_id', tenantId)
    .eq('general_expense_id', expenseId)

  if (!r1.error && r1.data?.length) return r1.data as LedgerRow[]
  if (r1.error && !isMissingDbColumnError(r1.error, 'general_expense_id')) {
    throw new Error(r1.error.message)
  }

  const r2 = await supabase
    .from('account_ledger_entries')
    .select('id, account_id, entry_type, amount, currency')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .ilike('description', `%ref:${expenseId}%`)

  if (r2.error) throw new Error(r2.error.message)
  return (r2.data ?? []) as LedgerRow[]
}

export async function fetchEmployeeCariRowsForExpense(
  supabase: SupabaseClient,
  tenantId: string,
  expenseId: string,
  employeeId: string
): Promise<{ id: string }[]> {
  const r1 = await supabase
    .from('employee_cari_transactions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('general_expense_id', expenseId)

  if (!r1.error && r1.data?.length) return r1.data as { id: string }[]
  if (r1.error && !isMissingDbColumnError(r1.error, 'general_expense_id')) {
    throw new Error(r1.error.message)
  }

  const r2 = await supabase
    .from('employee_cari_transactions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .ilike('description', `%ref:${expenseId}%`)

  if (r2.error) throw new Error(r2.error.message)
  return (r2.data ?? []) as { id: string }[]
}

/** Kayıt başarısız olunca deftere yazılan satırı temizle */
export async function deleteLedgerRowsForExpense(
  supabase: SupabaseClient,
  tenantId: string,
  expenseId: string,
  accountId: string
) {
  const { error: e1 } = await supabase
    .from('account_ledger_entries')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('general_expense_id', expenseId)
  if (e1 && !isMissingDbColumnError(e1, 'general_expense_id')) {
    console.error('deleteLedgerRowsForExpense general_expense_id:', e1.message)
  }
  await supabase
    .from('account_ledger_entries')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .ilike('description', `%ref:${expenseId}%`)
}

export async function deleteEmployeeCariRowsForExpense(
  supabase: SupabaseClient,
  tenantId: string,
  expenseId: string,
  employeeId: string
) {
  const { error: e1 } = await supabase
    .from('employee_cari_transactions')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('general_expense_id', expenseId)
  if (e1 && !isMissingDbColumnError(e1, 'general_expense_id')) {
    console.error('deleteEmployeeCariRowsForExpense general_expense_id:', e1.message)
  }
  await supabase
    .from('employee_cari_transactions')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .ilike('description', `%ref:${expenseId}%`)
}
