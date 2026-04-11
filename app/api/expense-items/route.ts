import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureDefaultExpenseItems } from '@/lib/expense-item-seed'
import {
  expenseDefinitionsToGroups,
  slugifyExpenseItemKey,
  type ExpenseItemDefinitionRow,
} from '@/lib/masraf-kalemleri'

async function allocateUniqueItemKey(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  base: string
): Promise<string> {
  let key = base
  let n = 2
  for (;;) {
    const { data } = await supabase
      .from('expense_item_definitions')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('item_key', key)
      .maybeSingle()
    if (!data) return key
    key = `${base}_${n}`
    n += 1
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    await ensureDefaultExpenseItems(supabase, profile.tenant_id)

    const { data, error } = await supabase
      .from('expense_item_definitions')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('group_name', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) throw error

    const items = (data ?? []) as ExpenseItemDefinitionRow[]
    const groups = expenseDefinitionsToGroups(items)

    return NextResponse.json({ items, groups })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
    }

    await ensureDefaultExpenseItems(supabase, profile.tenant_id)

    const body = await request.json()
    const group_name = String(body.group_name ?? '').trim()
    const label = String(body.label ?? '').trim()
    if (!group_name) return NextResponse.json({ error: 'Grup adı zorunludur' }, { status: 400 })
    if (!label) return NextResponse.json({ error: 'Kalem adı zorunludur' }, { status: 400 })

    let baseKey = String(body.item_key ?? '').trim()
    if (!baseKey) baseKey = slugifyExpenseItemKey(label)
    if (!baseKey) baseKey = 'kalem'
    const item_key = await allocateUniqueItemKey(supabase, profile.tenant_id, baseKey)

    const { data: inGroup } = await supabase
      .from('expense_item_definitions')
      .select('sort_order')
      .eq('tenant_id', profile.tenant_id)
      .eq('group_name', group_name)

    const sort_order =
      (inGroup?.length ? Math.max(...inGroup.map((r) => Number(r.sort_order) || 0)) : -1) + 1

    const row = {
      tenant_id: profile.tenant_id,
      group_name,
      item_key,
      label,
      sort_order,
    }

    const { data: inserted, error } = await supabase
      .from('expense_item_definitions')
      .insert(row)
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Bu teknik anahtar zaten kullanılıyor' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json(inserted)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
