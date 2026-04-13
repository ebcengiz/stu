import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { adjustAccountBalance } from '@/lib/account-balance'

type Action =
  | 'collect'
  | 'to_bank'
  | 'recall_from_bank'
  | 'factoring'
  | 'cancel'
  | 'bounce'
  | 'cancel_collection'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const { data: row, error: fetchErr } = await supabase
      .from('portfolio_checks')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!row) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

    const body = await request.json()
    const action = body.action as Action

    const now = new Date().toISOString()

    if (action === 'cancel') {
      if (row.status !== 'portfolio' && row.status !== 'to_bank') {
        return NextResponse.json({ error: 'Bu durumdaki çek iptal edilemez' }, { status: 400 })
      }
      const { data, error } = await supabase
        .from('portfolio_checks')
        .update({ status: 'cancelled', updated_at: now })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }

    if (action === 'bounce') {
      if (row.status !== 'portfolio' && row.status !== 'to_bank') {
        return NextResponse.json({ error: 'Sadece portföy veya bankadaki çek karşılıksız işaretlenebilir' }, { status: 400 })
      }
      const { data, error } = await supabase
        .from('portfolio_checks')
        .update({ status: 'bounced', updated_at: now })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }

    if (action === 'to_bank') {
      if (row.status !== 'portfolio') {
        return NextResponse.json({ error: 'Sadece portföydeki çek bankaya gönderilebilir' }, { status: 400 })
      }
      const bankName = String(body.bank_send_bank_name ?? '').trim()
      if (!bankName) return NextResponse.json({ error: 'Banka adı zorunludur' }, { status: 400 })
      const sendDate = body.bank_send_date
        ? String(body.bank_send_date).slice(0, 10)
        : new Date().toISOString().slice(0, 10)
      const notes = body.bank_send_notes != null ? String(body.bank_send_notes).trim() : null

      const { data, error } = await supabase
        .from('portfolio_checks')
        .update({
          status: 'to_bank',
          bank_send_bank_name: bankName,
          bank_send_notes: notes,
          bank_send_date: sendDate,
          updated_at: now,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }

    /** Bankaya verilen çek tekrar portföye (çeki geri al) */
    if (action === 'recall_from_bank') {
      if (row.status !== 'to_bank') {
        return NextResponse.json({ error: 'Sadece bankaya verilmiş çek geri alınabilir' }, { status: 400 })
      }
      const { data, error } = await supabase
        .from('portfolio_checks')
        .update({
          status: 'portfolio',
          bank_send_bank_name: null,
          bank_send_notes: null,
          bank_send_date: null,
          updated_at: now,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json(data)
    }

    if (action === 'collect') {
      if (row.status !== 'portfolio' && row.status !== 'to_bank') {
        return NextResponse.json({ error: 'Tahsilat için çek portföyde veya bankada olmalıdır' }, { status: 400 })
      }
      const accountId = String(body.collection_account_id ?? '').trim()
      if (!accountId) return NextResponse.json({ error: 'Tahsilat hesabı seçin' }, { status: 400 })
      const collectionDate = body.collection_date
        ? String(body.collection_date).slice(0, 10)
        : new Date().toISOString().slice(0, 10)
      const collectionNotes = body.collection_notes != null ? String(body.collection_notes).trim() : null

      try {
        await adjustAccountBalance(supabase, {
          tenantId: profile.tenant_id,
          accountId: accountId,
          delta: Number(row.amount),
          currency: row.currency || 'TRY',
        })
      } catch (balErr: unknown) {
        const msg = balErr instanceof Error ? balErr.message : 'Hesap güncellenemedi'
        return NextResponse.json({ error: msg }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('portfolio_checks')
        .update({
          status: 'paid',
          collection_account_id: accountId,
          collection_date: collectionDate,
          collection_notes: collectionNotes,
          updated_at: now,
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    if (action === 'factoring') {
      if (row.status !== 'portfolio' && row.status !== 'to_bank') {
        return NextResponse.json({ error: 'Faktoring için çek portföyde veya bankada olmalıdır' }, { status: 400 })
      }
      const accountId = String(body.collection_account_id ?? '').trim()
      if (!accountId) return NextResponse.json({ error: 'Tahsilatın yatacağı hesabı seçin' }, { status: 400 })

      const tlAmount = Number(body.factoring_tl_amount)
      const expense = Number(body.factoring_expense ?? 0)
      if (!Number.isFinite(tlAmount) || tlAmount <= 0) {
        return NextResponse.json({ error: 'Geçerli TL karşılığı girin' }, { status: 400 })
      }
      const net = Math.max(0, tlAmount - (Number.isFinite(expense) && expense > 0 ? expense : 0))

      try {
        await adjustAccountBalance(supabase, {
          tenantId: profile.tenant_id,
          accountId: accountId,
          delta: net,
          currency: row.currency || 'TRY',
        })
      } catch (balErr: unknown) {
        const msg = balErr instanceof Error ? balErr.message : 'Hesap güncellenemedi'
        return NextResponse.json({ error: msg }, { status: 400 })
      }

      const expenseAccountId =
        body.factoring_expense_account_id && String(body.factoring_expense_account_id).trim()
          ? String(body.factoring_expense_account_id).trim()
          : null

      const collectionDate = body.collection_date
        ? String(body.collection_date).slice(0, 10)
        : new Date().toISOString().slice(0, 10)
      const factoringNotes = body.factoring_notes != null ? String(body.factoring_notes).trim() : null

      const { data, error } = await supabase
        .from('portfolio_checks')
        .update({
          status: 'paid',
          collection_account_id: accountId,
          collection_date: collectionDate,
          factoring_tl_amount: tlAmount,
          factoring_expense: expense > 0 ? expense : null,
          factoring_expense_account_id: expense > 0 ? expenseAccountId : null,
          factoring_notes: factoringNotes,
          updated_at: now,
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    /** Tahsilat iptali: hesaptan yatırılan tutar kadar düşülür, çek tekrar portföyde (veya bankadaydıysa bankada) */
    if (action === 'cancel_collection') {
      if (row.status !== 'paid') {
        return NextResponse.json(
          { error: 'Sadece tahsil edilmiş çeklerde tahsilat iptal edilebilir' },
          { status: 400 }
        )
      }
      const accountId = row.collection_account_id as string | null
      if (!accountId) {
        return NextResponse.json({ error: 'Tahsilat hesabı kaydı bulunamadı; iptal edilemez' }, { status: 400 })
      }

      let reverse: number
      if (row.factoring_tl_amount != null && row.factoring_tl_amount !== '') {
        const tl = Number(row.factoring_tl_amount)
        const exp = Number(row.factoring_expense ?? 0)
        reverse = Math.max(0, tl - (Number.isFinite(exp) && exp > 0 ? exp : 0))
      } else {
        reverse = Number(row.amount)
      }
      if (!Number.isFinite(reverse) || reverse <= 0) {
        return NextResponse.json({ error: 'Geri alınacak tutar hesaplanamadı' }, { status: 400 })
      }

      try {
        await adjustAccountBalance(supabase, {
          tenantId: profile.tenant_id,
          accountId,
          delta: -reverse,
          currency: row.currency || 'TRY',
        })
      } catch (balErr: unknown) {
        const msg = balErr instanceof Error ? balErr.message : 'Hesap güncellenemedi'
        return NextResponse.json({ error: msg }, { status: 400 })
      }

      const wasAtBank = Boolean(row.bank_send_date)
      const nextStatus = wasAtBank ? 'to_bank' : 'portfolio'

      const { data, error } = await supabase
        .from('portfolio_checks')
        .update({
          status: nextStatus,
          collection_account_id: null,
          collection_date: null,
          collection_notes: null,
          factoring_tl_amount: null,
          factoring_expense: null,
          factoring_expense_account_id: null,
          factoring_notes: null,
          updated_at: now,
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
