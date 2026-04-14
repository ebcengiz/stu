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
  sale: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  customer: 'bg-sky-50 text-sky-800 border-sky-100',
  supplier: 'bg-amber-50 text-amber-900 border-amber-100',
  stock: 'bg-violet-50 text-violet-800 border-violet-100',
}

export default function DashboardHomeView({ data }: { data: DashboardHomePayload }) {
  const sym = CURRENCY_SYMBOLS.TRY || '₺'
  const maxWeek = Math.max(...data.weekSales.map((w) => w.total_try), 1)
  const max6 = Math.max(
    ...data.chart6m.revenue,
    ...data.chart6m.expense,
    1
  )

  return (
    <div className="space-y-8 pb-10">
      {/* Üst: tarih + döviz */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Anasayfa</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {data.meta.weekday}, {data.meta.dateLabel}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Günlük özet, varlıklar ve yaklaşan yükümlülükler tek ekranda. Veriler hesabınıza göre filtrelenir.
          </p>
        </div>
        <div className="flex flex-wrap items-stretch gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Landmark className="h-4 w-4 text-amber-600" />
              TCMB döviz (Alış)
            </div>
            {data.tcmb.ok ? (
              <div className="mt-2 space-y-1 font-mono text-sm">
                <div className="flex justify-between gap-8">
                  <span className="text-slate-500">USD</span>
                  <span className="font-bold text-slate-900">{fmtTry(data.tcmb.rates.usdTry)} ₺</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-slate-500">EUR</span>
                  <span className="font-bold text-slate-900">{fmtTry(data.tcmb.rates.eurTry)} ₺</span>
                </div>
                <p className="pt-1 text-[10px] text-slate-400">Bülten: {data.tcmb.rates.bulletinDate || '—'}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-amber-800">Kur alınamadı ({data.tcmb.error}). Sayfayı yenileyin.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bugün + ay özeti */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-900/10">
          <div className="flex items-center gap-2 text-emerald-100">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wide">Bugünkü satış</span>
          </div>
          <p className="mt-3 text-3xl font-black tabular-nums">{fmtTry(data.todaySalesTry)} {sym}</p>
          <Link href="/dashboard/satislar" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-100 hover:text-white">
            Satışlar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-600 to-indigo-700 p-5 text-white shadow-lg shadow-sky-900/10">
          <div className="flex items-center gap-2 text-sky-100">
            <Wallet className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wide">Bugünkü tahsilat</span>
          </div>
          <p className="mt-3 text-3xl font-black tabular-nums">{fmtTry(data.todayCollectionsTry)} {sym}</p>
          <Link href="/dashboard/musteriler" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-100 hover:text-white">
            Müşteriler <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <CalendarDays className="h-4 w-4 text-primary-600" />
            Ay cirosu
          </div>
          <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">{fmtTry(data.monthRevenueTry)} {sym}</p>
          <p className="mt-1 text-xs text-slate-500">Bu ayki satışlar (TRY)</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Receipt className="h-4 w-4 text-rose-600" />
            Ay masrafları
          </div>
          <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">{fmtTry(data.monthExpensesTry)} {sym}</p>
          <Link href="/dashboard/hesaplarim/masraflar" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline">
            Masraflar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Varlıklar */}
      {data.assets.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Varlık özeti</h2>
            <span className="text-xs text-slate-500">Yalnızca bakiye / tutar olan kalemler</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.assets.map((a) => (
              <Link
                key={a.id}
                href={a.href}
                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 group-hover:bg-primary-50 group-hover:text-primary-700">
                    {a.id === 'kasa' && <Banknote className="h-5 w-5" />}
                    {a.id === 'pos' && <CreditCard className="h-5 w-5" />}
                    {a.id === 'banka' && <Building2 className="h-5 w-5" />}
                    {a.id === 'cek' && <FileText className="h-5 w-5" />}
                    {a.id === 'stok' && <Package className="h-5 w-5" />}
                    {a.id === 'alacak' && <Users className="h-5 w-5" />}
                    {a.id === 'borc' && <Scale className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{a.label}</p>
                    <p className="text-xs text-slate-500">Detay</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-black tabular-nums text-slate-900">{fmtTry(a.valueTry)} {sym}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Grafikler */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <LineChart className="h-5 w-5 text-primary-600" />
            <h3 className="font-bold text-slate-900">Son 7 gün satış (TRY)</h3>
          </div>
          <div className="flex h-40 items-end gap-1.5">
            {data.weekSales.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-primary-600 to-primary-400 transition-all"
                  style={{ height: `${Math.max(8, (d.total_try / maxWeek) * 100)}%` }}
                  title={`${d.label}: ${fmtTry(d.total_try)}`}
                />
                <span className="text-[10px] font-medium text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900">6 aylık ciro vs masraf</h3>
          </div>
          <div className="space-y-3">
            {data.chart6m.labels.map((label, i) => {
              const rev = data.chart6m.revenue[i] || 0
              const exp = data.chart6m.expense[i] || 0
              return (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
                    <span>{label}</span>
                  </div>
                  <div className="mb-1 flex justify-between text-[11px] tabular-nums text-slate-500">
                    <span className="text-emerald-700">Ciro {fmtTry(rev)}</span>
                    <span className="text-rose-700">Masraf {fmtTry(exp)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${max6 ? (rev / max6) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-rose-400"
                        style={{ width: `${max6 ? (exp / max6) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex gap-4 text-[10px] font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ciro
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> Masraf
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Yaklaşan çekler */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-amber-950">
              <FileText className="h-5 w-5" />
              Vadesi yaklaşan çekler
            </h3>
            <Link href="/dashboard/hesaplarim/cek-portfoyu" className="text-xs font-bold text-amber-800 hover:underline">
              Portföy
            </Link>
          </div>
          {data.upcomingChecks.length === 0 ? (
            <p className="text-sm text-amber-900/70">Önümüzdeki 30 gün için kayıt yok.</p>
          ) : (
            <ul className="space-y-2">
              {data.upcomingChecks.map((c) => (
                <li key={c.id} className="rounded-xl border border-amber-100 bg-white/80 px-3 py-2 text-sm">
                  <div className="flex justify-between gap-2 font-semibold text-slate-900">
                    <span className="truncate">{c.debtor_name}</span>
                    <span className="shrink-0 tabular-nums">
                      {fmtTry(c.amount)} {CURRENCY_SYMBOLS[c.currency] || c.currency}
                    </span>
                  </div>
                  <div className="mt-0.5 flex justify-between text-xs text-amber-800/80">
                    <span>Vade {new Date(c.due_date + 'T12:00:00').toLocaleDateString('tr-TR')}</span>
                    <span>{c.daysLeft === 0 ? 'Bugün' : `${c.daysLeft} gün`}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Yaklaşan masraflar */}
        <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <Receipt className="h-5 w-5 text-rose-600" />
              Yaklaşan masraf ödemeleri
            </h3>
            <Link href="/dashboard/hesaplarim/masraflar" className="text-xs font-bold text-primary-600 hover:underline">
              Liste
            </Link>
          </div>
          {data.upcomingExpenses.length === 0 ? (
            <p className="text-sm text-slate-600">Planlanmış ödeme tarihi yakın masraf yok.</p>
          ) : (
            <ul className="space-y-2">
              {data.upcomingExpenses.map((e) => (
                <li key={e.id} className="rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm">
                  <div className="flex justify-between gap-2 font-semibold text-slate-900">
                    <span className="truncate">{e.description || 'Masraf'}</span>
                    <span className="shrink-0 tabular-nums">
                      {fmtTry(e.amount_gross)} {CURRENCY_SYMBOLS[e.currency] || e.currency}
                    </span>
                  </div>
                  <p className="text-xs text-rose-700">
                    Ödeme {new Date(e.payment_date + 'T12:00:00').toLocaleDateString('tr-TR')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Yaklaşan kredi taksitleri */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <Landmark className="h-5 w-5 text-indigo-600" />
              Yaklaşan kredi taksitleri
            </h3>
            <Link href="/dashboard/hesaplarim/krediler" className="text-xs font-bold text-primary-600 hover:underline">
              Krediler
            </Link>
          </div>
          {data.upcomingLoanInstallments.length === 0 ? (
            <p className="text-sm text-slate-600">90 gün içinde ödenmemiş taksit yok.</p>
          ) : (
            <ul className="space-y-2">
              {data.upcomingLoanInstallments.map((x) => (
                <li key={x.id} className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm">
                  <div className="flex justify-between gap-2 font-semibold text-slate-900">
                    <span className="truncate">{x.loan_name}</span>
                    <span className="shrink-0 tabular-nums">{fmtTry(x.due_try)} {sym}</span>
                  </div>
                  <p className="text-xs text-indigo-800">
                    Vade {new Date(x.due_date + 'T12:00:00').toLocaleDateString('tr-TR')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Son işlemler */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <RefreshCw className="h-5 w-5 text-slate-500" />
            Son işlemler
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {data.recentActivity.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Henüz işlem yok.</p>
          ) : (
            data.recentActivity.map((row) => (
              <Link
                key={row.id}
                href={row.href}
                className="flex items-start gap-3 px-5 py-3 transition hover:bg-slate-50"
              >
                <span
                  className={`mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${kindStyles[row.kind] || 'bg-slate-50 text-slate-700 border-slate-100'}`}
                >
                  {row.kind}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{row.title}</p>
                  {row.subtitle ? <p className="truncate text-xs text-slate-500">{row.subtitle}</p> : null}
                  <p className="text-[11px] text-slate-400">{fmtShortDate(row.date)}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
