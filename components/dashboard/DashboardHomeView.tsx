import Link from 'next/link'
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Landmark,
  LineChart,
  Package,
  PiggyBank,
  Receipt,
  RefreshCw,
  Scale,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import type { DashboardHomePayload } from '@/lib/dashboard-home-data'
import { CURRENCY_SYMBOLS } from '@/lib/currency'

function fmtTry(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const kindStyles: Record<string, string> = {
  sale: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  customer: 'bg-sky-50 text-sky-700 border-sky-200',
  supplier: 'bg-amber-50 text-amber-700 border-amber-200',
  stock: 'bg-violet-50 text-violet-700 border-violet-200',
}

export default function DashboardHomeView({ data }: { data: DashboardHomePayload }) {
  const sym = CURRENCY_SYMBOLS.TRY || '₺'
  const maxWeek = Math.max(...data.weekSales.map((w) => w.total_try), 1)
  const max6 = Math.max(...data.chart6m.revenue, ...data.chart6m.expense, 1)

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">Anasayfa</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-800 sm:text-3xl">
            {data.meta.weekday}, {data.meta.dateLabel}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-gray-500">
            Günlük özet, varlıklar ve yaklaşan yükümlülükler tek ekranda. Veriler hesabınıza göre filtrelenir.
          </p>
        </div>
        <div className="flex flex-wrap items-stretch gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
              <Landmark className="h-4 w-4 text-amber-500" />
              TCMB döviz (Alış)
            </div>
            {data.tcmb.ok ? (
              <div className="mt-2 space-y-1 font-mono text-sm">
                <div className="flex justify-between gap-8">
                  <span className="text-gray-400">USD</span>
                  <span className="font-bold text-gray-800">{fmtTry(data.tcmb.rates.usdTry)} ₺</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-gray-400">EUR</span>
                  <span className="font-bold text-gray-800">{fmtTry(data.tcmb.rates.eurTry)} ₺</span>
                </div>
                <p className="pt-1 text-[10px] text-gray-500">Bülten: {data.tcmb.rates.bulletinDate || '—'}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-amber-600">Kur alınamadı ({data.tcmb.error}). Sayfayı yenileyin.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 p-5 text-white shadow-md">
          <div className="flex items-center gap-2 text-primary-100">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wide">Bugünkü satış</span>
          </div>
          <p className="mt-3 text-3xl font-black tabular-nums">{fmtTry(data.todaySalesTry)} {sym}</p>
          <Link href="/dashboard/satislar" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-200 hover:text-white transition-colors">
            Satışlar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 p-5 text-white shadow-md">
          <div className="flex items-center gap-2 text-sky-100">
            <Wallet className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wide">Bugünkü tahsilat</span>
          </div>
          <p className="mt-3 text-3xl font-black tabular-nums">{fmtTry(data.todayCollectionsTry)} {sym}</p>
          <Link href="/dashboard/musteriler" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-200 hover:text-white transition-colors">
            Müşteriler <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
            <CalendarDays className="h-4 w-4 text-primary-500" />
            Ay cirosu
          </div>
          <p className="mt-3 text-2xl font-black tabular-nums text-gray-800">{fmtTry(data.monthRevenueTry)} {sym}</p>
          <p className="mt-1 text-xs text-gray-400">Bu ayki satışlar (TRY)</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
            <Receipt className="h-4 w-4 text-red-400" />
            Ay masrafları
          </div>
          <p className="mt-3 text-2xl font-black tabular-nums text-gray-800">{fmtTry(data.monthExpensesTry)} {sym}</p>
          <Link href="/dashboard/hesaplarim/masraflar" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors">
            Masraflar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {data.assets.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-800">Varlık özeti</h2>
            <span className="text-xs text-gray-400">Yalnızca bakiye / tutar olan kalemler</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.assets.map((a) => (
              <Link key={a.id} href={a.href} className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-primary-300 hover:shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                    {a.id === 'kasa' && <Banknote className="h-5 w-5" />}
                    {a.id === 'pos' && <CreditCard className="h-5 w-5" />}
                    {a.id === 'banka' && <Building2 className="h-5 w-5" />}
                    {a.id === 'cek' && <FileText className="h-5 w-5" />}
                    {a.id === 'stok' && <Package className="h-5 w-5" />}
                    {a.id === 'alacak' && <Users className="h-5 w-5" />}
                    {a.id === 'borc' && <Scale className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-700">{a.label}</p>
                    <p className="text-xs text-gray-400">Detay</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-black tabular-nums text-gray-800">{fmtTry(a.valueTry)} {sym}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary-500" />
            <h3 className="font-bold text-gray-800">Son 7 gün satış (TRY)</h3>
          </div>
          <div className="flex h-40 items-end gap-1.5">
            {data.weekSales.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-primary-600 to-primary-400 transition-all"
                  style={{ height: `${Math.max(8, (d.total_try / maxWeek) * 100)}%` }}
                  title={`${d.label}: ${fmtTry(d.total_try)}`}
                />
                <span className="text-[10px] font-medium text-gray-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-gray-800">6 aylık ciro vs masraf</h3>
          </div>
          <div className="space-y-3">
            {data.chart6m.labels.map((label, i) => {
              const rev = data.chart6m.revenue[i] || 0
              const exp = data.chart6m.expense[i] || 0
              return (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs font-medium text-gray-500"><span>{label}</span></div>
                  <div className="mb-1 flex justify-between text-[11px] tabular-nums text-gray-400">
                    <span className="text-emerald-600">Ciro {fmtTry(rev)}</span>
                    <span className="text-red-500">Masraf {fmtTry(exp)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${max6 ? (rev / max6) * 100 : 0}%` }} />
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-red-400" style={{ width: `${max6 ? (exp / max6) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex gap-4 text-[10px] font-semibold text-gray-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Ciro</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Masraf</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-amber-800"><FileText className="h-5 w-5" />Vadesi yaklaşan çekler</h3>
            <Link href="/dashboard/hesaplarim/cek-portfoyu" className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors">Portföy</Link>
          </div>
          {data.upcomingChecks.length === 0 ? (
            <p className="text-sm text-amber-600/60">Önümüzdeki 30 gün için kayıt yok.</p>
          ) : (
            <ul className="space-y-2">
              {data.upcomingChecks.map((c) => (
                <li key={c.id} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm">
                  <div className="flex justify-between gap-2 font-semibold text-gray-800">
                    <span className="truncate">{c.debtor_name}</span>
                    <span className="shrink-0 tabular-nums">{fmtTry(c.amount)} {CURRENCY_SYMBOLS[c.currency] || c.currency}</span>
                  </div>
                  <div className="mt-0.5 flex justify-between text-xs text-amber-600">
                    <span>Vade {new Date(c.due_date + 'T12:00:00').toLocaleDateString('tr-TR')}</span>
                    <span>{c.daysLeft === 0 ? 'Bugün' : `${c.daysLeft} gün`}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-gray-800"><Receipt className="h-5 w-5 text-red-500" />Yaklaşan masraf ödemeleri</h3>
            <Link href="/dashboard/hesaplarim/masraflar" className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors">Liste</Link>
          </div>
          {data.upcomingExpenses.length === 0 ? (
            <p className="text-sm text-gray-400">Planlanmış ödeme tarihi yakın masraf yok.</p>
          ) : (
            <ul className="space-y-2">
              {data.upcomingExpenses.map((e) => (
                <li key={e.id} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm">
                  <div className="flex justify-between gap-2 font-semibold text-gray-800">
                    <span className="truncate">{e.description || 'Masraf'}</span>
                    <span className="shrink-0 tabular-nums">{fmtTry(e.amount_gross)} {CURRENCY_SYMBOLS[e.currency] || e.currency}</span>
                  </div>
                  <p className="text-xs text-red-500">Ödeme {new Date(e.payment_date + 'T12:00:00').toLocaleDateString('tr-TR')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-gray-800"><Landmark className="h-5 w-5 text-primary-600" />Yaklaşan kredi taksitleri</h3>
            <Link href="/dashboard/hesaplarim/krediler" className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors">Krediler</Link>
          </div>
          {data.upcomingLoanInstallments.length === 0 ? (
            <p className="text-sm text-gray-400">90 gün içinde ödenmemiş taksit yok.</p>
          ) : (
            <ul className="space-y-2">
              {data.upcomingLoanInstallments.map((x) => (
                <li key={x.id} className="rounded-xl border border-primary-200 bg-white px-3 py-2 text-sm">
                  <div className="flex justify-between gap-2 font-semibold text-gray-800">
                    <span className="truncate">{x.loan_name}</span>
                    <span className="shrink-0 tabular-nums">{fmtTry(x.due_try)} {sym}</span>
                  </div>
                  <p className="text-xs text-primary-600">Vade {new Date(x.due_date + 'T12:00:00').toLocaleDateString('tr-TR')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800"><RefreshCw className="h-5 w-5 text-gray-400" />Son işlemler</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {data.recentActivity.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">Henüz işlem yok.</p>
          ) : (
            data.recentActivity.map((row) => (
              <Link key={row.id} href={row.href} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50">
                <span className={`mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${kindStyles[row.kind] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>{row.kind}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-700">{row.title}</p>
                  {row.subtitle ? <p className="truncate text-xs text-gray-400">{row.subtitle}</p> : null}
                  <p className="text-[11px] text-gray-500">{fmtShortDate(row.date)}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-500" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
