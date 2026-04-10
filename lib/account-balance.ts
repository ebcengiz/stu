import type { SupabaseClient } from '@supabase/supabase-js'

type PaymentMethod = 'cash' | 'credit_card' | 'cheque' | 'bank_transfer' | null | undefined

/** Nakit akışı olan tahsilat/ödeme yöntemleri — çek kasaya girmeyebilir */
export function cashMovementPaymentMethods(): Array<NonNullable<PaymentMethod>> {
  return ['cash', 'credit_card', 'bank_transfer']
}

export function requiresAccountForPayment(paymentMethod: PaymentMethod): boolean {
  if (!paymentMethod) return false
  return cashMovementPaymentMethods().includes(paymentMethod as 'cash' | 'credit_card' | 'bank_transfer')
}

/**
 * Hesap bakiyesini günceller. delta > 0 giriş, delta < 0 çıkış.
 * cash / bank / pos hesaplarında negatif bakiyeye izin verilmez; other (kart vb.) hariç.
 */
export async function adjustAccountBalance(
  supabase: SupabaseClient,
  params: {
    tenantId: string
    accountId: string
    delta: number
    currency: string
  }
) {
  const { data: account, error: fetchErr } = await supabase
    .from('accounts')
    .select('id, tenant_id, balance, currency, type, is_active')
    .eq('id', params.accountId)
    .eq('tenant_id', params.tenantId)
    .single()

  if (fetchErr || !account) {
    throw new Error('Seçilen hesap bulunamadı veya erişilemiyor')
  }
  if (account.is_active === false) {
    throw new Error('Pasif hesaba işlem yapılamaz')
  }
  if (account.currency !== params.currency) {
    throw new Error(
      `Hesap para birimi (${account.currency}) işlem para birimi (${params.currency}) ile aynı olmalıdır`
    )
  }

  const current = Number(account.balance)
  const next = current + params.delta

  const allowsNegative =
    account.type === 'other' ||
    account.type === 'kredi_karti' /* eski kayıtlar */
  if (params.delta < 0 && !allowsNegative && next < -0.0001) {
    throw new Error('Hesapta yeterli bakiye yok')
  }

  const { error: updErr } = await supabase
    .from('accounts')
    .update({ balance: next, updated_at: new Date().toISOString() })
    .eq('id', params.accountId)
    .eq('tenant_id', params.tenantId)

  if (updErr) throw new Error(updErr.message)
}
