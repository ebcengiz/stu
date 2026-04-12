import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Hesap silinmeden önce bu hesaba işaret eden nullable account_id / payment_account_id alanlarını temizler.
 * Bazı veritabanlarında FK ON DELETE SET NULL olmadan kalmış olabilir; bu adım silmeyi garanti eder.
 */
export async function clearReferencesToAccount(
  supabase: SupabaseClient,
  tenantId: string,
  accountId: string
): Promise<void> {
  const ops: { table: string; column: string }[] = [
    { table: 'customer_transactions', column: 'account_id' },
    { table: 'supplier_transactions', column: 'account_id' },
    { table: 'general_expenses', column: 'payment_account_id' },
    { table: 'loans', column: 'payment_account_id' },
    { table: 'employee_cari_transactions', column: 'account_id' },
  ]

  for (const { table, column } of ops) {
    const { error } = await supabase
      .from(table)
      .update({ [column]: null })
      .eq(column, accountId)
      .eq('tenant_id', tenantId)

    if (error) {
      const msg = error.message ?? ''
      if (
        msg.includes('does not exist') ||
        msg.includes('schema cache') ||
        msg.includes('Could not find')
      ) {
        continue
      }
      throw new Error(
        `${table} güncellenemedi (hesap referansları): ${msg}`
      )
    }
  }
}
