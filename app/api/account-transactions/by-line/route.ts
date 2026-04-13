import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { adjustAccountBalance, requiresAccountForPayment } from '@/lib/account-balance'

type PM = Parameters<typeof requiresAccountForPayment>[0]

type LineKind = 'ct' | 'st' | 'al'

function parseLineId(lineId: string): { kind: LineKind; uuid: string } | null {
  const s = String(lineId ?? '').trim()
  if (s.startsWith('ct-')) return { kind: 'ct', uuid: s.slice(3) }
  if (s.startsWith('st-')) return { kind: 'st', uuid: s.slice(3) }
  if (s.startsWith('al-')) return { kind: 'al', uuid: s.slice(3) }
  return null
}

function parseAmount(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

function txDateIso(d: string) {
  return new Date(String(d).slice(0, 10) + 'T12:00:00').toISOString()
}

/** PATCH: Tek hesap hareketi — açıklama, tarih, tutar (virman satırlarında tutar değişmez) */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id
    const body = await request.json()
    const parsed = parseLineId(String(body.line_id ?? ''))
    if (!parsed) return NextResponse.json({ error: 'Geçersiz satır' }, { status: 400 })

    const description = body.description != null ? String(body.description).trim() : undefined
    const transaction_date = body.transaction_date != null ? String(body.transaction_date).slice(0, 10) : undefined
    const amountRaw = body.amount

    if (description === undefined && transaction_date === undefined && amountRaw === undefined) {
      return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
    }

    const newAmount = amountRaw !== undefined ? parseAmount(amountRaw) : undefined
    if (amountRaw !== undefined && (!Number.isFinite(newAmount) || (newAmount as number) <= 0)) {
      return NextResponse.json({ error: 'Geçerli tutar girin' }, { status: 400 })
    }

    if (parsed.kind === 'ct') {
      const { data: row, error: fErr } = await supabase
        .from('customer_transactions')
        .select('id, tenant_id, type, amount, account_id, payment_method, currency, description, transaction_date')
        .eq('id', parsed.uuid)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (fErr) throw fErr
      if (!row) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
      if (row.type !== 'payment') {
        return NextResponse.json({ error: 'Yalnızca tahsilat satırları düzenlenebilir' }, { status: 400 })
      }

      const oldAmt = Number(row.amount)
      const accId = row.account_id as string | null
      const pm = row.payment_method as PM
      const cur = String(row.currency || 'TRY')

      if (newAmount !== undefined && newAmount !== oldAmt) {
        if (!accId || !requiresAccountForPayment(pm)) {
          return NextResponse.json(
            { error: 'Bu tahsilatta tutar değiştirilemez (hesaba bağlı kayıt değil)' },
            { status: 400 }
          )
        }
        const delta = (newAmount as number) - oldAmt
        try {
          await adjustAccountBalance(supabase, { tenantId, accountId: accId, delta, currency: cur })
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Hesap güncellenemedi'
          return NextResponse.json({ error: msg }, { status: 400 })
        }
      }

      const upd: Record<string, unknown> = {}
      if (description !== undefined) upd.description = description || null
      if (transaction_date !== undefined) upd.transaction_date = txDateIso(transaction_date)
      if (newAmount !== undefined) upd.amount = newAmount

      const { data: updated, error: uErr } = await supabase
        .from('customer_transactions')
        .update(upd)
        .eq('id', parsed.uuid)
        .eq('tenant_id', tenantId)
        .select('*')
        .single()

      if (uErr) {
        if (newAmount !== undefined && newAmount !== oldAmt && accId && requiresAccountForPayment(pm)) {
          try {
            await adjustAccountBalance(supabase, {
              tenantId,
              accountId: accId,
              delta: oldAmt - (newAmount as number),
              currency: cur,
            })
          } catch {
            /* rollback uyarısı */
          }
        }
        throw uErr
      }
      return NextResponse.json(updated)
    }

    if (parsed.kind === 'st') {
      const { data: row, error: fErr } = await supabase
        .from('supplier_transactions')
        .select('id, tenant_id, type, amount, account_id, payment_method, currency, description, transaction_date')
        .eq('id', parsed.uuid)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (fErr) throw fErr
      if (!row) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
      if (row.type !== 'payment') {
        return NextResponse.json({ error: 'Yalnızca ödeme satırları düzenlenebilir' }, { status: 400 })
      }

      const oldAmt = Number(row.amount)
      const accId = row.account_id as string | null
      const pm = row.payment_method as PM
      const cur = String(row.currency || 'TRY')

      if (newAmount !== undefined && newAmount !== oldAmt) {
        if (!accId || !requiresAccountForPayment(pm)) {
          return NextResponse.json(
            { error: 'Bu ödemede tutar değiştirilemez (hesaba bağlı kayıt değil)' },
            { status: 400 }
          )
        }
        const delta = oldAmt - (newAmount as number)
        try {
          await adjustAccountBalance(supabase, { tenantId, accountId: accId, delta, currency: cur })
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Hesap güncellenemedi'
          return NextResponse.json({ error: msg }, { status: 400 })
        }
      }

      const upd: Record<string, unknown> = {}
      if (description !== undefined) upd.description = description || null
      if (transaction_date !== undefined) upd.transaction_date = txDateIso(transaction_date)
      if (newAmount !== undefined) upd.amount = newAmount

      const { data: updated, error: uErr } = await supabase
        .from('supplier_transactions')
        .update(upd)
        .eq('id', parsed.uuid)
        .eq('tenant_id', tenantId)
        .select('*')
        .single()

      if (uErr) {
        if (newAmount !== undefined && newAmount !== oldAmt && accId && requiresAccountForPayment(pm)) {
          try {
            await adjustAccountBalance(supabase, {
              tenantId,
              accountId: accId,
              delta: (newAmount as number) - oldAmt,
              currency: cur,
            })
          } catch {
            /* rollback uyarısı */
          }
        }
        throw uErr
      }
      return NextResponse.json(updated)
    }

    const { data: led, error: lErr } = await supabase
      .from('account_ledger_entries')
      .select('*')
      .eq('id', parsed.uuid)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (lErr) throw lErr
    if (!led) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

    const et = String(led.entry_type)
    if (et === 'transfer_in' || et === 'transfer_out') {
      if (newAmount !== undefined && newAmount !== Number(led.amount)) {
        return NextResponse.json(
          { error: 'Virman satırında tutar değiştirilemez; işlemi iptal edip yeniden girin' },
          { status: 400 }
        )
      }
    }

    const oldAmt = Number(led.amount)
    const accId = String(led.account_id)
    const cur = String(led.currency || 'TRY')

    if (newAmount !== undefined && newAmount !== oldAmt) {
      let delta = 0
      if (et === 'inflow' || et === 'transfer_in') delta = (newAmount as number) - oldAmt
      else if (et === 'outflow' || et === 'transfer_out') delta = oldAmt - (newAmount as number)
      else return NextResponse.json({ error: 'Geçersiz kayıt tipi' }, { status: 400 })

      try {
        await adjustAccountBalance(supabase, { tenantId, accountId: accId, delta, currency: cur })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Hesap güncellenemedi'
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    const upd: Record<string, unknown> = {}
    if (description !== undefined) upd.description = description || null
    if (transaction_date !== undefined) upd.transaction_date = txDateIso(transaction_date)
    if (newAmount !== undefined) upd.amount = newAmount

    const { data: updated, error: uErr } = await supabase
      .from('account_ledger_entries')
      .update(upd)
      .eq('id', parsed.uuid)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()

    if (uErr) {
      if (newAmount !== undefined && newAmount !== oldAmt) {
        let rev = 0
        if (et === 'inflow' || et === 'transfer_in') rev = oldAmt - (newAmount as number)
        else rev = (newAmount as number) - oldAmt
        try {
          await adjustAccountBalance(supabase, { tenantId, accountId: accId, delta: rev, currency: cur })
        } catch {
          /* rollback uyarısı */
        }
      }
      throw uErr
    }

    return NextResponse.json(updated)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/** DELETE: Tek satırı sil ve hesap bakiyesini geri al */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const tenantId = profile.tenant_id
    const { searchParams } = new URL(request.url)
    const lineId = searchParams.get('line_id')
    const parsed = parseLineId(String(lineId ?? ''))
    if (!parsed) return NextResponse.json({ error: 'Geçersiz satır' }, { status: 400 })

    if (parsed.kind === 'ct') {
      const { data: row, error: fErr } = await supabase
        .from('customer_transactions')
        .select('id, type, amount, account_id, payment_method, currency')
        .eq('id', parsed.uuid)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (fErr) throw fErr
      if (!row) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

      const { count: pcCount } = await supabase
        .from('portfolio_checks')
        .select('id', { count: 'exact', head: true })
        .eq('customer_transaction_id', parsed.uuid)
        .eq('tenant_id', tenantId)

      if (pcCount && pcCount > 0) {
        return NextResponse.json(
          { error: 'Bu işlem çek portföyüne bağlı; buradan silinemez' },
          { status: 409 }
        )
      }

      if (row.type === 'payment' && row.account_id && requiresAccountForPayment(row.payment_method as PM)) {
        try {
          await adjustAccountBalance(supabase, {
            tenantId,
            accountId: String(row.account_id),
            delta: -Number(row.amount),
            currency: String(row.currency || 'TRY'),
          })
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Hesap güncellenemedi'
          return NextResponse.json({ error: msg }, { status: 400 })
        }
      }

      const { error: dErr } = await supabase.from('customer_transactions').delete().eq('id', parsed.uuid).eq('tenant_id', tenantId)
      if (dErr) throw dErr
      return NextResponse.json({ ok: true })
    }

    if (parsed.kind === 'st') {
      const { data: row, error: fErr } = await supabase
        .from('supplier_transactions')
        .select('id, type, amount, account_id, payment_method, currency, portfolio_check_id')
        .eq('id', parsed.uuid)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (fErr) throw fErr
      if (!row) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

      if (row.portfolio_check_id) {
        return NextResponse.json(
          { error: 'Bu işlem portföy çekine bağlı; buradan silinemez' },
          { status: 409 }
        )
      }

      if (row.type === 'payment' && row.account_id && requiresAccountForPayment(row.payment_method as PM)) {
        try {
          await adjustAccountBalance(supabase, {
            tenantId,
            accountId: String(row.account_id),
            delta: Number(row.amount),
            currency: String(row.currency || 'TRY'),
          })
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Hesap güncellenemedi'
          return NextResponse.json({ error: msg }, { status: 400 })
        }
      }

      const { error: dErr } = await supabase.from('supplier_transactions').delete().eq('id', parsed.uuid).eq('tenant_id', tenantId)
      if (dErr) throw dErr
      return NextResponse.json({ ok: true })
    }

    const { data: led, error: lErr } = await supabase
      .from('account_ledger_entries')
      .select('*')
      .eq('id', parsed.uuid)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (lErr) throw lErr
    if (!led) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

    const et = String(led.entry_type)
    if (et === 'transfer_in' || et === 'transfer_out') {
      return NextResponse.json(
        { error: 'Virman satırı buradan silinemez; karşı hesap hareketi de vardır' },
        { status: 400 }
      )
    }

    const amt = Number(led.amount)
    const accId = String(led.account_id)
    const cur = String(led.currency || 'TRY')
    let delta = 0
    if (et === 'inflow') delta = -amt
    else if (et === 'outflow') delta = amt
    else return NextResponse.json({ error: 'Geçersiz kayıt tipi' }, { status: 400 })

    try {
      await adjustAccountBalance(supabase, { tenantId, accountId: accId, delta, currency: cur })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Hesap güncellenemedi'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const { error: dErr } = await supabase.from('account_ledger_entries').delete().eq('id', parsed.uuid).eq('tenant_id', tenantId)
    if (dErr) {
      try {
        await adjustAccountBalance(supabase, { tenantId, accountId: accId, delta: -delta, currency: cur })
      } catch {
        /* rollback uyarısı */
      }
      throw dErr
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
