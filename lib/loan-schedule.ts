/** Ödeme takvimine göre bir sonraki taksit için ay adımı */
export function scheduleToMonthStep(schedule: string): number {
  switch (schedule) {
    case 'monthly':
      return 1
    case 'every_2_months':
      return 2
    case 'every_3_months':
      return 3
    case 'every_4_months':
      return 4
    case 'every_6_months':
      return 6
    case 'yearly':
      return 12
    default:
      return 1
  }
}

export function addMonthsIso(isoDate: string, monthsToAdd: number): string {
  const d = new Date(isoDate.slice(0, 10) + 'T12:00:00')
  const day = d.getDate()
  d.setMonth(d.getMonth() + monthsToAdd)
  if (d.getDate() < day) {
    d.setDate(0)
  }
  return d.toISOString().slice(0, 10)
}

export type InstallmentSeed = {
  sort_order: number
  due_date: string
  amount: number
  paid_amount: number
}

/** Eşit taksitler; son taksitte kalan tutar dengelenir */
export function buildInstallmentPlan(params: {
  remaining_debt: number
  remaining_installments: number
  next_installment_date: string
  payment_schedule: string
}): InstallmentSeed[] {
  const n = params.remaining_installments
  if (n <= 0 || !params.next_installment_date) return []

  const totalCents = Math.round(Number(params.remaining_debt) * 100)
  if (totalCents < 0) return []

  const step = scheduleToMonthStep(params.payment_schedule)
  const baseCents = Math.floor(totalCents / n)
  const rows: InstallmentSeed[] = []
  let allocated = 0

  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1
    const cents = isLast ? totalCents - allocated : baseCents
    allocated += cents
    rows.push({
      sort_order: i + 1,
      due_date: addMonthsIso(params.next_installment_date, step * i),
      amount: cents / 100,
      paid_amount: 0,
    })
  }

  return rows
}
