import type { SupabaseClient } from '@supabase/supabase-js'
import { adjustAccountBalance } from '@/lib/account-balance'
import { resolveMasrafLabel } from '@/lib/masraf-kalemleri'
import {
  appendExpenseRef,
  deleteEmployeeCariRowsForExpense,
  deleteLedgerRowsForExpense,
  fetchLedgerRowsForExpense,
  isMissingDbColumnError,
} from '@/lib/expense-movement-ref'

export function expenseCurrencyStr(c: unknown) {
  return c == null ? 'TRY' : String(c)
}

type ExpLike = {
  payment_status: string
  payment_account_id?: string | null
  payment_employee_id?: string | null
}

/** Önceden ödenmiş masrafın defter / çalışan cari hareketlerini geri alır (silmeden). */
export async function undoPaidExpenseMovements(
  supabase: SupabaseClient,
  tenantId: string,
  expenseId: string,
  exp: ExpLike
) {
  const paid = exp.payment_status === 'paid'
  if (paid && exp.payment_account_id) {
    const ledRows = await fetchLedgerRowsForExpense(
      supabase,
      tenantId,
      expenseId,
      exp.payment_account_id as string
    )
    for (const L of ledRows) {
      if (L.entry_type === 'outflow') {
        const amt = Number(L.amount)
        await adjustAccountBalance(supabase, {
          tenantId,
          accountId: L.account_id,
          delta: amt,
          currency: expenseCurrencyStr(L.currency),
        })
      }
    }
    await deleteLedgerRowsForExpense(supabase, tenantId, expenseId, exp.payment_account_id as string)
  }
  if (paid && exp.payment_employee_id) {
    await deleteEmployeeCariRowsForExpense(
      supabase,
      tenantId,
      expenseId,
      exp.payment_employee_id as string
    )
  }
}

/**
 * Kayıt oluşturulduktan / güncellendikten sonra ödeme hareketlerini yazar.
 * Hata olursa kısmi hareketleri POST ile aynı mantıkta temizler (masraf satırını silmez).
 */
export async function applyPaidExpenseMovements(
  supabase: SupabaseClient,
  tenantId: string,
  data: Record<string, unknown>,
  expenseId: string,
  expense_item_key: string,
  num: number
) {
  const payment_status = String(data.payment_status)
  const payment_account_id = data.payment_account_id ? String(data.payment_account_id) : null
  const payment_employee_id = data.payment_employee_id ? String(data.payment_employee_id) : null

  if (payment_status !== 'paid') return

  const label = await resolveMasrafLabel(supabase, tenantId, expense_item_key)
  const txDateIso = new Date(String(data.transaction_date).slice(0, 10) + 'T12:00:00').toISOString()
  const descParts: string[] = [`Genel masraf: ${label}`]
  if (data.doc_no) descParts.push(`Belge: ${data.doc_no}`)
  if (data.description) descParts.push(String(data.description))
  const movementDesc = appendExpenseRef(descParts.join(' · '), expenseId)
  const cur = expenseCurrencyStr(data.currency)

  let accountDebited = false
  try {
    if (payment_account_id) {
      await adjustAccountBalance(supabase, {
        tenantId,
        accountId: payment_account_id,
        delta: -num,
        currency: cur,
      })
      accountDebited = true
      const ledgerBase = {
        tenant_id: tenantId,
        account_id: payment_account_id,
        entry_type: 'outflow' as const,
        amount: num,
        currency: cur,
        description: movementDesc,
        transaction_date: txDateIso,
      }
      let le = (
        await supabase.from('account_ledger_entries').insert({
          ...ledgerBase,
          general_expense_id: expenseId,
        })
      ).error
      if (le && isMissingDbColumnError(le, 'general_expense_id')) {
        le = (await supabase.from('account_ledger_entries').insert(ledgerBase)).error
      }
      if (le) throw le
    }

    if (payment_employee_id) {
      const cariBase = {
        tenant_id: tenantId,
        employee_id: payment_employee_id,
        entry_type: 'expense',
        signed_amount: -num,
        currency: cur,
        description: movementDesc,
        expense_item: label,
        transaction_date: txDateIso,
      }
      let ce = (
        await supabase.from('employee_cari_transactions').insert({
          ...cariBase,
          general_expense_id: expenseId,
        })
      ).error
      if (ce && isMissingDbColumnError(ce, 'general_expense_id')) {
        ce = (await supabase.from('employee_cari_transactions').insert(cariBase)).error
      }
      if (ce) throw ce
    }
  } catch (inner: unknown) {
    if (accountDebited && payment_account_id) {
      try {
        await adjustAccountBalance(supabase, {
          tenantId,
          accountId: payment_account_id,
          delta: num,
          currency: cur,
        })
      } catch {
        /* rollback uyarısı */
      }
      await deleteLedgerRowsForExpense(supabase, tenantId, expenseId, payment_account_id)
    }
    if (payment_employee_id) {
      await deleteEmployeeCariRowsForExpense(supabase, tenantId, expenseId, payment_employee_id)
    }
    throw inner
  }
}
