'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Building, CreditCard, FileText, ShoppingCart, DollarSign, Plus, Search, Trash2, Package, X, Check, History, ChevronDown, Calendar, Phone, Mail, MapPin, MoreVertical, Edit2, Scale } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card'
import { TagSelector } from '@/components/admin/TagSelector'
import { CURRENCY_SYMBOLS } from '@/lib/currency'
import ProjectSelect from '@/components/projects/ProjectSelect'
import { groupPaymentAccounts, formatPaymentAccountOptionLabel } from '@/lib/payment-account-options'
import { toast } from 'react-hot-toast'
import TrNumberInput from '@/components/ui/TrNumberInput'
import { looseToTrInputString, parseTrNumberInput, shouldClearTrLineFieldOnFocus } from '@/lib/tr-number-input'

interface Product {
  id: string
  name: string
  sku: string | null
  unit: string
  price: number | null
  tax_rate: number | null
  discount_rate: number | null
  stock?: Array<{
    id: string
    quantity: number
    warehouse_id: string
    warehouses: {
      id: string
      name: string
    }
  }>
}

interface Customer {
  id: string
  company_name: string
  company_logo: string | null
  address: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  tax_number: string | null
  tax_office: string | null
  notes: string | null
  category1: string | null
  category2: string | null
  currency: string
  balance: number
  is_active: boolean
}

interface TransactionItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  tax_rate: number
  discount_rate: number
  total_price: number
}

interface Transaction {
  id: string
  type: 'sale' | 'payment' | 'invoice' | 'purchase' | 'return' | 'balance_fix'
  amount: number
  currency: string
  description: string
  transaction_date: string
  date?: string // Some APIs use date
  payment_method?: 'cash' | 'credit_card' | 'cheque' | 'bank_transfer'
  document_number?: string
  document_no?: string // Some APIs use document_no
  waybill_number?: string
  shipment_date?: string
  order_date?: string
  cheque_due_date?: string | null
  cheque_bank?: string | null
  cheque_serial_number?: string | null
  created_at: string
  customer_transaction_items?: TransactionItem[]
}

interface SelectedItem {
  product_id: string
  product_name: string
  warehouse_id: string
  warehouse_name: string
  quantity: number
  unit_price: number
  tax_rate: number
  discount_rate: number
  tax_amount: number
  discount_amount: number
  total_price: number
}

interface Warehouse {
  id: string
  name: string
}

interface CashAccount {
  id: string
  name: string
  type: string
  currency: string
  balance: number
  is_active?: boolean
}

interface PriceHistory {
  price: number
  date: string
  customer_id: string
  customer_name: string
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Modals state
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showBalanceFixModal, setShowBalanceFixModal] = useState(false)
  const [showLedgerModal, setShowLedgerModal] = useState(false)
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false)
  
  const [, setShowProductModal] = useState(false)
  const [showItemDetailModal, setShowItemDetailModal] = useState(false)
  const [, setShowHistoryModal] = useState(false)
  const [showTxDetailModal, setShowTxDetailModal] = useState(false)
  const [showChequeModal, setShowChequeModal] = useState(false)
  
  // Dropdowns
  const [showPaymentMenu, setShowPaymentMenu] = useState(false)
  const [showOtherMenu, setShowOtherMenu] = useState(false)
  
  const [currentItem, setCurrentItem] = useState<Product | null>(null)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [, setPriceHistory] = useState<PriceHistory[]>([])
  const [, setLoadingHistory] = useState(false)

  const [newProductData, setNewProductData] = useState({ name: '', sku: '', unit: 'adet' })

  const [itemFormData, setItemFormData] = useState({
    quantity: '1',
    unit_price: '0',
    tax_rate: '20',
    discount_rate: '0',
    warehouse_id: ''
  })

  // Cheque Data State
  const [chequeData, setChequeData] = useState({
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    bank: '',
    serial_number: ''
  })

  // Edit Form State
  const [formData, setFormData] = useState({
    company_name: '', company_logo: '', address: '', contact_person: '',
    phone: '', email: '', tax_number: '', tax_office: '', notes: '',
    category1: '', category2: '', currency: 'TRY', is_active: true
  })

  // Transaction Form State
  const [txForm, setTxForm] = useState({
    type: 'sale' as 'sale' | 'payment' | 'offer' | 'balance_fix',
    payment_method: 'cash' as 'cash' | 'credit_card' | 'cheque' | 'bank_transfer',
    payment_account_id: '',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    document_number: '',
    waybill_number: '',
    shipment_date: new Date().toISOString().split('T')[0],
    order_date: new Date().toISOString().split('T')[0],
    project_id: '',
  })

  const [balanceFixForm, setBalanceFixForm] = useState({
    amount: '',
    type: 'increase', // 'increase' means customer owes us more (borçlandır), 'decrease' means customer owes less (alacaklandır)
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Sale Items
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [isProductListVisible, setIsProductListVisible] = useState(false)

  const fetchCashAccounts = async () => {
    try {
      const res = await fetch('/api/accounts')
      if (res.ok) {
        const data = await res.json()
        setCashAccounts(Array.isArray(data) ? data.filter((a: CashAccount) => a.is_active !== false) : [])
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (customerId) {
      fetchCustomerData()
      fetchTransactions()
      fetchProducts()
      fetchWarehouses()
      fetchCashAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- müşteri kimliği değişince veriler yenilenir
  }, [customerId])

  const fetchCustomerData = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`)
      if (!response.ok) throw new Error('Customer not found')
      const current = await response.json()
      if (current) {
        setCustomer(current)
        setFormData({
          company_name: current.company_name, company_logo: current.company_logo || '',
          address: current.address || '', contact_person: current.contact_person || '',
          phone: current.phone || '', email: current.email || '',
          tax_number: current.tax_number || '', tax_office: current.tax_office || '',
          notes: current.notes || '', category1: current.category1 || '',
          category2: current.category2 || '', currency: current.currency || 'TRY',
          is_active: current.is_active
        })
      }
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/customer-transactions?customer_id=${customerId}`)
      const data = await response.json()
      setTransactions(Array.isArray(data) ? data : [])
    } catch (error) { console.error(error) }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) { console.error(error) }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses')
      const data = await response.json()
      setWarehouses(Array.isArray(data) ? data : [])
      if (Array.isArray(data) && data.length > 0) {
        setItemFormData(prev => ({ ...prev, warehouse_id: data[0].id }))
      }
    } catch (error) { console.error(error) }
  }

  const getCurrencySymbol = (code: string = 'TRY') => CURRENCY_SYMBOLS[code] || '₺'
  const customerPaymentAccountGroups = groupPaymentAccounts(cashAccounts, {
    currency: customer?.currency || 'TRY',
  })
  const hasCustomerPaymentAccount = customerPaymentAccountGroups.some((g) => g.items.length > 0)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingLogo(true)
    const uploadData = new FormData(); uploadData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: uploadData })
      const data = await res.json(); setFormData(prev => ({ ...prev, company_logo: data.url }))
      toast.success('Logo başarıyla yüklendi')
    } catch { toast.error('Yükleme başarısız') }
    finally { setUploadingLogo(false) }
  }

  const openItemDetailModal = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    
    setCurrentItem(product)
    setItemFormData({
      quantity: '1',
      unit_price: looseToTrInputString(product.price || 0),
      tax_rate: looseToTrInputString(product.tax_rate ?? 20, 2),
      discount_rate: looseToTrInputString(product.discount_rate ?? 0, 2),
      warehouse_id: warehouses[0]?.id || ''
    })
    setShowItemDetailModal(true)
  }

  const _fetchPriceHistory = async () => {
    if (!currentItem) return
    setLoadingHistory(true)
    setShowHistoryModal(true)
    try {
      const response = await fetch(`/api/products/${currentItem.id}/price-history`)
      const data = await response.json()
      setPriceHistory(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('History fetch error:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleAddItemFromModal = () => {
    if (!currentItem) return

    const quantity = parseTrNumberInput(itemFormData.quantity)
    const unitPrice = parseTrNumberInput(itemFormData.unit_price)
    const taxRate = parseTrNumberInput(itemFormData.tax_rate)
    const discountRate = parseTrNumberInput(itemFormData.discount_rate)
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error('Geçerli miktar ve birim fiyat girin')
      return
    }
    if (!Number.isFinite(taxRate) || !Number.isFinite(discountRate)) {
      toast.error('Geçerli KDV ve iskonto oranı girin')
      return
    }

    const baseAmount = unitPrice * quantity
    const discountAmount = (baseAmount * discountRate) / 100
    const subtotal = baseAmount - discountAmount
    const taxAmount = (subtotal * taxRate) / 100
    const totalPrice = subtotal + taxAmount

    const warehouse = warehouses.find(w => w.id === itemFormData.warehouse_id)

    const newItem: SelectedItem = {
      product_id: currentItem.id,
      product_name: currentItem.name,
      warehouse_id: itemFormData.warehouse_id,
      warehouse_name: warehouse?.name || 'Bilinmeyen Depo',
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      discount_rate: discountRate,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_price: totalPrice
    }

    const newItems = [...selectedItems, newItem]
    setSelectedItems(newItems)
    const total = newItems.reduce((sum, i) => sum + i.total_price, 0)
    setTxForm((prev) => ({
      ...prev,
      amount: total.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
      }),
    }))
    setShowItemDetailModal(false)
    setCurrentItem(null)
  }

  const updateItem = (index: number, field: keyof SelectedItem, value: string) => {
    const newItems = [...selectedItems]
    const n = parseTrNumberInput(value)
    const parsed = Number.isFinite(n) ? n : 0
    const item = {
      ...newItems[index],
      [field]: field === 'quantity' ? Math.max(0, parsed) : parsed,
    }
    const q = Number(item.quantity)
    const p = Number(item.unit_price)
    const tr = Number(item.tax_rate)
    const dr = Number(item.discount_rate)
    const base = p * q; const disc = (base * dr) / 100; const subt = base - disc; const tax = (subt * tr) / 100
    item.discount_amount = disc; item.tax_amount = tax; item.total_price = subt + tax
    newItems[index] = item
    setSelectedItems(newItems)
    const total = newItems.reduce((sum, i) => sum + i.total_price, 0)
    setTxForm((prev) => ({
      ...prev,
      amount: total.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
      }),
    }))
  }

  const removeItem = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index)
    setSelectedItems(newItems)
    const total = newItems.reduce((sum, i) => sum + i.total_price, 0)
    setTxForm((prev) => ({
      ...prev,
      amount: total.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
      }),
    }))
  }

  const _handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProductData, min_stock_level: 0 }),
      })
      if (!res.ok) throw new Error('Ürün eklenemedi')
      const newProd = await res.json()
      setProducts([...products, newProd])
      openItemDetailModal(newProd.id)
      setShowProductModal(false)
      setNewProductData({ name: '', sku: '', unit: 'adet' })
      toast.success('Ürün başarıyla oluşturuldu')
    } catch (err: any) { toast.error(err.message) }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (
        txForm.type === 'payment' &&
        txForm.payment_method !== 'cheque' &&
        !txForm.payment_account_id
      ) {
        toast.error('Tahsilatın yatırılacağı kasa veya banka hesabını seçin')
        setSaving(false)
        return
      }
      const payload = {
        customer_id: customerId,
        type: txForm.type === 'sale' ? 'sale' : txForm.type,
        amount: parseTrNumberInput(txForm.amount),
        currency: customer?.currency || 'TRY',
        description: txForm.description, transaction_date: new Date(txForm.transaction_date).toISOString(),
        payment_method: txForm.type === 'payment' ? txForm.payment_method : null,
        account_id:
          txForm.type === 'payment' && txForm.payment_method !== 'cheque'
            ? txForm.payment_account_id
            : undefined,
        document_number: txForm.type === 'sale' ? txForm.document_number : null,
        waybill_number: txForm.type === 'sale' ? txForm.waybill_number : null,
        shipment_date: txForm.type === 'sale' ? new Date(txForm.shipment_date).toISOString() : null,
        order_date: txForm.type === 'sale' ? new Date(txForm.order_date).toISOString() : null,
        cheque_due_date: txForm.type === 'payment' && txForm.payment_method === 'cheque' ? new Date(chequeData.due_date).toISOString() : null,
        cheque_bank: txForm.type === 'payment' && txForm.payment_method === 'cheque' ? chequeData.bank : null,
        cheque_serial_number: txForm.type === 'payment' && txForm.payment_method === 'cheque' ? chequeData.serial_number : null,
        items: txForm.type === 'sale' ? selectedItems : [],
        project_id: txForm.project_id || undefined,
      }
      const res = await fetch('/api/customer-transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('İşlem kaydedilemedi')
      toast.success('İşlem başarıyla eklendi!')
      
      // Reset forms and close modals
      setTxForm({ 
        ...txForm, amount: '', description: '', document_number: '', waybill_number: '',
        payment_account_id: '',
        transaction_date: new Date().toISOString().split('T')[0], shipment_date: new Date().toISOString().split('T')[0], order_date: new Date().toISOString().split('T')[0],
        project_id: '',
      }); 
      setChequeData({ amount: '', due_date: new Date().toISOString().split('T')[0], bank: '', serial_number: '' });
      setSelectedItems([]); fetchTransactions(); fetchCustomerData();
      setShowSaleModal(false); setShowPaymentModal(false); setShowChequeModal(false);
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleBalanceFix = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      // Increase balance -> sale/invoice (borçlandır), Decrease -> payment (alacaklandır)
      const payload = {
        customer_id: customerId, 
        type: balanceFixForm.type === 'increase' ? 'invoice' : 'payment', 
        amount: parseTrNumberInput(balanceFixForm.amount),
        currency: customer?.currency || 'TRY',
        description: `BAKİYE DÜZELTME: ${balanceFixForm.description}`, 
        transaction_date: new Date(balanceFixForm.date).toISOString(),
        payment_method: null,
      }
      const res = await fetch('/api/customer-transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Bakiye düzeltilemedi')
      toast.success('Bakiye başarıyla düzeltildi!')
      setBalanceFixForm({ amount: '', type: 'increase', description: '', date: new Date().toISOString().split('T')[0] })
      fetchTransactions(); fetchCustomerData();
      setShowBalanceFixModal(false);
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const cleanedData = Object.fromEntries(Object.entries(formData).map(([k, v]) => [k, v === '' ? null : v]))
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cleanedData),
      })
      if (!res.ok) throw new Error('Güncellenemedi')
      toast.success('Müşteri bilgileri güncellendi!'); 
      setShowEditCustomerModal(false); fetchCustomerData()
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDeleteCustomer = async () => {
    if(!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;
    try {
      const response = await fetch(`/api/customers/${customerId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Silinemedi')
      toast.success('Müşteri başarıyla silindi')
      router.push('/dashboard/musteriler')
    } catch (error: any) { toast.error(error.message) }
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!customer) return null

  // Calculate ledger from transactions (kronolojik: eski → yeni; açık bakiye = son totalBalance)
  let totalBalance = 0
  const ledgerData = [...transactions].reverse().map(tx => {
    const isDebt =
      tx.type === 'sale' ||
      tx.type === 'invoice' ||
      (tx.type === 'balance_fix' && (tx.description || '').includes('BORÇ'))
    if (isDebt) totalBalance += Number(tx.amount)
    else totalBalance -= Number(tx.amount)
    return { ...tx, balance: totalBalance, isDebt }
  }).reverse()

  const currentModalBase =
    (parseTrNumberInput(itemFormData.unit_price) || 0) * (parseTrNumberInput(itemFormData.quantity) || 0)
  const currentModalDiscount =
    (currentModalBase * (parseTrNumberInput(itemFormData.discount_rate) || 0)) / 100
  const currentModalSubtotal = currentModalBase - currentModalDiscount
  const currentModalTax =
    (currentModalSubtotal * (parseTrNumberInput(itemFormData.tax_rate) || 0)) / 100
  const currentModalTotal = currentModalSubtotal + currentModalTax

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  )

  const totalStock = currentItem?.stock?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0

  /** Liste API ile aynı mantık: cari işlemlerden; customers.balance alanı kullanılmaz (güncellenmiyor) */
  const acikBakiye = totalBalance
  const cekBakiyesi = transactions.filter(t => t.type === 'payment' && t.payment_method === 'cheque').reduce((sum, t) => sum + Number(t.amount), 0);
  const ciro = transactions.filter(t => t.type === 'sale' || t.type === 'invoice').reduce((sum, t) => sum + Number(t.amount), 0);

  const prevSales = transactions.filter(t => t.type === 'sale' || t.type === 'invoice');
  const prevPayments = transactions.filter(t => t.type === 'payment');
  const prevPurchases = transactions.filter(t => t.type === 'purchase' || t.type === 'return');

  return (
    <div className="space-y-4 max-w-[1600px] w-full mx-auto pb-6">
      {/* Back & Header */}
      <div className="flex items-center justify-between mb-1">
        <button onClick={() => router.push('/dashboard/musteriler')} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-sm font-bold text-gray-400">Müşteri Detayı</div>
      </div>

      {/* 1. Müşteri Bilgileri Kutucuğu */}
      <Card className="bg-white shadow-sm border-gray-200 rounded-2xl overflow-hidden">
        <CardBody className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* Logo */}
            <div className="flex-shrink-0">
              {customer.company_logo ? (
                <img src={customer.company_logo} alt="" className="h-16 w-16 rounded-2xl object-cover border border-gray-100 shadow-sm" />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-700 text-2xl font-black border border-primary-100 shadow-sm">
                  {customer.company_name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info Grid */}
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">{customer.company_name}</h1>
                  <div className="flex gap-2">
                    {customer.category1 && <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">{customer.category1}</span>}
                    {customer.category2 && <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">{customer.category2}</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="p-1.5 bg-gray-50 rounded-lg"><Phone className="h-3.5 w-3.5 text-gray-400" /></div>
                  <span className="font-medium text-sm">{customer.phone || 'Belirtilmemiş'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="p-1.5 bg-gray-50 rounded-lg"><Mail className="h-3.5 w-3.5 text-gray-400" /></div>
                  <span className="font-medium text-sm">{customer.email || 'Belirtilmemiş'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="p-1.5 bg-gray-50 rounded-lg"><Building className="h-3.5 w-3.5 text-gray-400" /></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Vergi Dairesi / No</span>
                    <span className="font-medium text-sm">{customer.tax_office || '-'} / {customer.tax_number || '-'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="p-1.5 bg-gray-50 rounded-lg"><DollarSign className="h-3.5 w-3.5 text-gray-400" /></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Para Birimi</span>
                    <span className="font-bold text-sm text-gray-900">{customer.currency} ({getCurrencySymbol(customer.currency)})</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 lg:col-span-1 md:col-span-2">
                <div className="flex items-start gap-3 text-gray-600">
                  <div className="p-1.5 bg-gray-50 rounded-lg mt-0.5"><MapPin className="h-3.5 w-3.5 text-gray-400" /></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Adres</span>
                    <span className="font-medium text-xs leading-relaxed">{customer.address || 'Adres bilgisi yok'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 2. Three Metric Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg border-0 transform transition-all hover:scale-[1.02]">
          <CardBody className="p-4">
            <div className="flex justify-between items-start">
              <h3 className="text-primary-100 font-bold text-xs uppercase tracking-wider">Açık Bakiye</h3>
              <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-sm"><Scale className="h-4 w-4 text-white" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black tracking-tight">{acikBakiye.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
              <div className="text-primary-200 font-bold text-sm">{getCurrencySymbol(customer.currency)}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200 transform transition-all hover:scale-[1.02]">
          <CardBody className="p-4">
            <div className="flex justify-between items-start">
              <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider">Alınan Çek Toplamı</h3>
              <div className="p-1.5 bg-amber-50 rounded-xl"><FileText className="h-4 w-4 text-amber-500" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-gray-900 tracking-tight">{cekBakiyesi.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
              <div className="text-gray-400 font-bold text-sm">{getCurrencySymbol(customer.currency)}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200 transform transition-all hover:scale-[1.02]">
          <CardBody className="p-4">
            <div className="flex justify-between items-start">
              <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider">Toplam Ciro (Satış)</h3>
              <div className="p-1.5 bg-green-50 rounded-xl"><ShoppingCart className="h-4 w-4 text-green-500" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-gray-900 tracking-tight">{ciro.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
              <div className="text-gray-400 font-bold text-sm">{getCurrencySymbol(customer.currency)}</div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 3. 5 Action Boxes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Satış Yap */}
        <button onClick={() => { setTxForm({...txForm, type: 'sale'}); setShowSaleModal(true); }} className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:bg-primary-50 transition-all group shadow-sm">
          <div className="p-3 bg-primary-100/50 rounded-full group-hover:bg-primary-200/50 transition-colors mb-1"><ShoppingCart className="h-5 w-5 text-primary-600" /></div>
          <span className="font-bold text-[13px] text-gray-900 group-hover:text-primary-700">Satış Yap</span>
        </button>

        {/* Teklif Hazırla */}
        <button onClick={() => router.push(`/dashboard/teklifler/yeni?customerId=${customerId}`)} className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group shadow-sm">
          <div className="p-3 bg-blue-100/50 rounded-full group-hover:bg-blue-200/50 transition-colors mb-1"><FileText className="h-5 w-5 text-blue-600" /></div>
          <span className="font-bold text-[13px] text-gray-900 group-hover:text-blue-700">Teklif Hazırla</span>
        </button>

        {/* Tahsilat/Ödeme (Accordion/Dropdown) */}
        <div className="relative">
          <button onClick={() => { setShowPaymentMenu(!showPaymentMenu); setShowOtherMenu(false); }} className={`w-full h-full flex flex-col items-center justify-center p-3 bg-white rounded-xl border-2 transition-all group shadow-sm ${showPaymentMenu ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 hover:border-emerald-300 hover:bg-emerald-50'}`}>
            <div className={`p-3 rounded-full transition-colors mb-1 ${showPaymentMenu ? 'bg-emerald-200/50' : 'bg-emerald-100/50 group-hover:bg-emerald-200/50'}`}><CreditCard className="h-5 w-5 text-emerald-600" /></div>
            <div className="flex items-center gap-1 font-bold text-[13px] text-gray-900 group-hover:text-emerald-700">Tahsilat / Ödeme <ChevronDown className="h-3.5 w-3.5" /></div>
          </button>
          
          {showPaymentMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPaymentMenu(false)} />
              <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <button onClick={() => { setShowPaymentMenu(false); setTxForm({...txForm, type: 'payment', payment_method: 'cash', payment_account_id: ''}); setShowPaymentModal(true); }} className="w-full text-left px-4 py-3 font-bold text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 border-b border-gray-50 flex items-center gap-3"><DollarSign className="h-4 w-4" /> Nakit - Banka - Kredi Kartı</button>
                <button onClick={() => { setShowPaymentMenu(false); setTxForm({...txForm, type: 'payment', payment_method: 'cheque', payment_account_id: ''}); setShowPaymentModal(true); setShowChequeModal(true); }} className="w-full text-left px-4 py-3 font-bold text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 border-b border-gray-50 flex items-center gap-3"><FileText className="h-4 w-4" /> Çek Girişi</button>
                <button onClick={() => { setShowPaymentMenu(false); setShowBalanceFixModal(true); }} className="w-full text-left px-4 py-3 font-bold text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 flex items-center gap-3"><Scale className="h-4 w-4" /> Bakiye Düzelt</button>
              </div>
            </>
          )}
        </div>

        {/* Hesap Ekstresi */}
        <button onClick={() => setShowLedgerModal(true)} className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition-all group shadow-sm">
          <div className="p-3 bg-purple-100/50 rounded-full group-hover:bg-purple-200/50 transition-colors mb-1"><History className="h-5 w-5 text-purple-600" /></div>
          <span className="font-bold text-[13px] text-gray-900 group-hover:text-purple-700">Hesap Ekstresi</span>
        </button>

        {/* Diğer İşlemler (Accordion/Dropdown) */}
        <div className="relative">
          <button onClick={() => { setShowOtherMenu(!showOtherMenu); setShowPaymentMenu(false); }} className={`w-full h-full flex flex-col items-center justify-center p-3 bg-white rounded-xl border-2 transition-all group shadow-sm ${showOtherMenu ? 'border-gray-300 bg-gray-50' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}>
            <div className={`p-3 rounded-full transition-colors mb-1 ${showOtherMenu ? 'bg-gray-200' : 'bg-gray-100 group-hover:bg-gray-200'}`}><MoreVertical className="h-5 w-5 text-gray-600" /></div>
            <div className="flex items-center gap-1 font-bold text-[13px] text-gray-900 group-hover:text-gray-700">Diğer İşlemler <ChevronDown className="h-3.5 w-3.5" /></div>
          </button>

          {showOtherMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowOtherMenu(false)} />
              <div className="absolute top-full right-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <button onClick={() => { setShowOtherMenu(false); setShowEditCustomerModal(true); }} className="w-full text-left px-4 py-3 font-bold text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50"><Edit2 className="h-4 w-4" /> Bilgileri Düzenle</button>
                <button onClick={() => { setShowOtherMenu(false); router.push('/dashboard/alislar/yeni'); }} className="w-full text-left px-4 py-3 font-bold text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50"><Package className="h-4 w-4" /> Alış Yap</button>
                <button onClick={() => { setShowOtherMenu(false); handleDeleteCustomer(); }} className="w-full text-left px-4 py-3 font-bold text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"><Trash2 className="h-4 w-4" /> Müşteriyi Sil</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Three Lists (Önceki Satışlar, Önceki Ödemeleri, Alışlar/İadeler) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 pt-3">
        
        {/* Önceki Satışlar */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="bg-gray-50/50 border-b py-3">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary-500" /> Önceki Satışlar</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0"><tr><th className="px-4 py-2 text-left text-xs font-black text-gray-400 uppercase">Tarih</th><th className="px-4 py-2 text-left text-xs font-black text-gray-400 uppercase">Belge No</th><th className="px-4 py-2 text-right text-xs font-black text-gray-400 uppercase">Tutar</th></tr></thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {prevSales.length > 0 ? prevSales.slice(0, 20).map(t => (
                    <tr key={t.id} onClick={() => { setSelectedTx(t); setShowTxDetailModal(true); }} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-2.5 text-sm text-gray-600 font-medium">{new Date(t.transaction_date || t.date || '').toLocaleDateString('tr-TR')}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-500">{t.document_number || t.document_no || '-'}</td>
                      <td className="px-4 py-2.5 text-sm font-bold text-right text-gray-900">{Number(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(t.currency)}</td>
                    </tr>
                  )) : <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">Kayıt bulunamadı.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Önceki Ödemeler */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="bg-gray-50/50 border-b py-3">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2"><CreditCard className="h-5 w-5 text-emerald-500" /> Önceki Ödemeleri</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0"><tr><th className="px-4 py-2 text-left text-xs font-black text-gray-400 uppercase">Tarih</th><th className="px-4 py-2 text-left text-xs font-black text-gray-400 uppercase">Yöntem</th><th className="px-4 py-2 text-right text-xs font-black text-gray-400 uppercase">Tutar</th></tr></thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {prevPayments.length > 0 ? prevPayments.slice(0, 20).map(t => (
                    <tr key={t.id} onClick={() => { setSelectedTx(t); setShowTxDetailModal(true); }} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-2.5 text-sm text-gray-600 font-medium">{new Date(t.transaction_date || t.date || '').toLocaleDateString('tr-TR')}</td>
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase">{t.payment_method === 'cash' ? 'Nakit' : t.payment_method === 'cheque' ? 'Çek' : t.payment_method === 'credit_card' ? 'K.Kartı' : 'Diğer'}</td>
                      <td className="px-4 py-2.5 text-sm font-bold text-right text-emerald-600">{Number(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(t.currency)}</td>
                    </tr>
                  )) : <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">Kayıt bulunamadı.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Alışlar / İadeler */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="bg-gray-50/50 border-b py-3">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2"><Package className="h-5 w-5 text-purple-500" /> Alışlar / İadeler</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0"><tr><th className="px-4 py-2 text-left text-xs font-black text-gray-400 uppercase">Tarih</th><th className="px-4 py-2 text-left text-xs font-black text-gray-400 uppercase">Tip</th><th className="px-4 py-2 text-right text-xs font-black text-gray-400 uppercase">Tutar</th></tr></thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {prevPurchases.length > 0 ? prevPurchases.slice(0, 20).map(t => (
                    <tr key={t.id} onClick={() => { setSelectedTx(t); setShowTxDetailModal(true); }} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-2.5 text-sm text-gray-600 font-medium">{new Date(t.transaction_date || t.date || '').toLocaleDateString('tr-TR')}</td>
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase">{t.type === 'purchase' ? 'Alış' : 'İade'}</td>
                      <td className="px-4 py-2.5 text-sm font-bold text-right text-gray-900">{Number(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(t.currency)}</td>
                    </tr>
                  )) : <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">Kayıt bulunamadı.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

      </div>

      {/* --- MODALS --- */}

      {/* Satış Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl rounded-3xl border-0 animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="sticky top-0 z-10 bg-white border-b py-3 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-3"><ShoppingCart className="h-6 w-6 text-primary-600" /> Satış İşlemi</CardTitle>
              <button onClick={() => setShowSaleModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-500" /></button>
            </CardHeader>
            <CardBody className="p-8">
              <form onSubmit={handleAddTransaction} className="space-y-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-center"><h4 className="font-bold text-gray-900 flex items-center gap-2"><Package className="h-5 w-5 text-gray-400" />Satılacak Ürünler</h4><Button type="button" onClick={() => setShowProductModal(true)} size="sm" variant="outline" className="h-8 text-xs"><Plus className="h-3 w-3 mr-1" />Hızlı Ürün Ekle</Button></div>
                  <div className="relative">
                    <div className="relative z-40">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Ürün ara veya seçin..."
                        value={productSearch}
                        onChange={(e) => { setProductSearch(e.target.value); setIsProductListVisible(true); }}
                        onFocus={() => setIsProductListVisible(true)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-primary-50 transition-all"
                      />
                    </div>
                    {isProductListVisible && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsProductListVisible(false)} />
                        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                          {filteredProducts.length > 0 ? filteredProducts.map(p => (
                              <button key={p.id} type="button" onClick={() => { openItemDetailModal(p.id); setProductSearch(''); setIsProductListVisible(false); }} className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0">
                                <div><div className="font-bold text-gray-900">{p.name}</div><div className="text-xs text-gray-500">{p.sku || 'SKU YOK'}</div></div>
                                <div className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">{p.stock?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0} {p.unit}</div>
                              </button>
                            )) : <div className="px-4 py-8 text-center text-gray-500 italic">Ürün bulunamadı.</div>}
                        </div>
                      </>
                    )}
                  </div>

                  {selectedItems.length > 0 && (
                    <div className="border rounded-2xl overflow-hidden bg-white shadow-sm">
                      <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/80">
                          <tr><th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Ürün</th><th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Depo</th><th className="px-4 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Miktar</th><th className="px-4 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">B.Fiyat</th><th className="px-4 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">KDV Tutarı</th><th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Toplam</th><th className="px-4 py-2 w-10"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {selectedItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{item.product_name}</td>
                              <td className="px-4 py-2.5 text-xs font-bold text-primary-600">{item.warehouse_name}</td>
                              <td className="px-4 py-2.5">
                                <TrNumberInput
                                  value={looseToTrInputString(item.quantity)}
                                  onChange={(v) => updateItem(idx, 'quantity', v)}
                                  className="w-20 mx-auto block px-2 py-1.5 border rounded-lg text-center text-sm font-semibold"
                                />
                              </td>
                              <td className="px-4 py-2.5">
                                <TrNumberInput
                                  value={looseToTrInputString(item.unit_price)}
                                  onChange={(v) => updateItem(idx, 'unit_price', v)}
                                  className="w-28 mx-auto block px-2 py-1.5 border rounded-lg text-center text-sm font-semibold"
                                />
                              </td>
                              <td className="px-4 py-2.5 text-xs font-bold text-center text-gray-500">{item.tax_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(customer.currency)} <span className="text-[10px] text-gray-400">(%{item.tax_rate})</span></td>
                              <td className="px-4 py-2.5 text-sm font-bold text-right text-gray-900">{item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(customer.currency)}</td>
                              <td className="px-4 py-2.5 text-right"><button type="button" onClick={() => removeItem(idx)} className="p-2 text-gray-400 hover:text-red-500 transition-all"><Trash2 className="h-4 w-4" /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                  <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase px-1">Belge No</label><input type="text" value={txForm.document_number} onChange={e => setTxForm({...txForm, document_number: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none" /></div>
                  <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase px-1">İrsaliye No</label><input type="text" value={txForm.waybill_number} onChange={e => setTxForm({...txForm, waybill_number: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none" /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                  <div className="space-y-2"><label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">İşlem Tarihi</label><input type="date" value={txForm.transaction_date} onChange={e => setTxForm({...txForm, transaction_date: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-primary-500 outline-none font-bold" /></div>
                  <div className="space-y-2"><label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Genel Toplam</label><input type="text" readOnly value={txForm.amount} className="w-full px-4 py-3 border-2 border-primary-100 rounded-2xl bg-primary-50/30 font-black text-xl text-primary-900 outline-none" /></div>
                </div>
                <div className="pt-2">
                  <ProjectSelect
                    value={txForm.project_id}
                    onChange={(pid) => setTxForm({ ...txForm, project_id: pid })}
                  />
                </div>
                <textarea placeholder="Notlar..." value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none h-24 resize-none shadow-sm" />
                
                <div className="flex justify-end gap-3 pt-4 border-t"><Button type="button" variant="outline" onClick={() => setShowSaleModal(false)}>İptal</Button><Button type="submit" disabled={saving || selectedItems.length === 0}>{saving ? 'Kaydediliyor...' : 'Satışı Tamamla'}</Button></div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tahsilat/Ödeme Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl shadow-2xl rounded-3xl border-0 animate-in zoom-in duration-300">
            <CardHeader className="bg-emerald-600 text-white rounded-t-3xl py-6 px-8 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-3"><CreditCard className="h-6 w-6" /> Tahsilat / Ödeme Girişi</CardTitle>
                <p className="text-xs text-emerald-100 mt-1">Müşteriden alınan ödemeyi kaydedin</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-all"><X className="h-6 w-6 text-white" /></button>
            </CardHeader>
            <CardBody className="p-8">
              <form onSubmit={handleAddTransaction} className="space-y-6">
                  <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Ödeme Yöntemi</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'cash', label: 'Nakit' },
                      { id: 'credit_card', label: 'Kredi Kartı' },
                      { id: 'bank_transfer', label: 'Banka' }
                    ].map(m => (
                      <button key={m.id} type="button" onClick={() => { setTxForm({...txForm, payment_method: m.id as any, payment_account_id: ''}); if (m.id === 'cheque') setShowChequeModal(true); }} className={`p-3 border-2 rounded-xl text-sm font-bold transition-all ${txForm.payment_method === m.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 text-gray-500 hover:border-gray-300'}`}>{m.label}</button>
                    ))}
                  </div>
                </div>

                {txForm.payment_method !== 'cheque' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Paranın yatırılacağı hesap *</label>
                    <select
                      required
                      value={txForm.payment_account_id}
                      onChange={e => setTxForm({ ...txForm, payment_account_id: e.target.value })}
                      className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-emerald-500 outline-none font-semibold text-gray-900 bg-white"
                    >
                      <option value="">Hesap seçin</option>
                      {customerPaymentAccountGroups.map((group) => (
                        <optgroup key={group.title} label={group.title}>
                          {group.items.map((a) => (
                            <option key={a.id} value={a.id}>
                              {formatPaymentAccountOptionLabel(a)}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {!hasCustomerPaymentAccount && (
                      <p className="text-xs text-amber-700 font-medium px-1">Bu para birimi için hesap bulunamadı. Hesaplarım sayfasından kasa veya banka ekleyin.</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">İşlem Tarihi</label>
                    <input type="date" required value={txForm.transaction_date} onChange={e => setTxForm({...txForm, transaction_date: e.target.value})} className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-2xl focus:border-emerald-500 outline-none font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Tutar ({getCurrencySymbol(customer.currency)}) *</label>
                    <TrNumberInput
                      required
                      value={txForm.amount}
                      onChange={(v) => setTxForm({ ...txForm, amount: v })}
                      className="w-full px-4 py-3.5 border-2 border-emerald-100 rounded-2xl bg-emerald-50/30 text-xl font-black text-emerald-900 focus:border-emerald-500 outline-none placeholder-emerald-200"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <ProjectSelect
                  value={txForm.project_id}
                  onChange={(pid) => setTxForm({ ...txForm, project_id: pid })}
                />

                {txForm.payment_method === 'cheque' && (
                   <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                     <div>
                       <h5 className="font-bold text-amber-900">Çek Detayları</h5>
                       <p className="text-xs text-amber-700 mt-1">{chequeData.bank ? `${chequeData.bank} - ${chequeData.amount} ${getCurrencySymbol()}` : 'Çek bilgisi girilmedi'}</p>
                     </div>
                     <Button type="button" onClick={() => setShowChequeModal(true)} variant="outline" className="border-amber-300 text-amber-800">Düzenle</Button>
                   </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Açıklama</label>
                  <textarea placeholder="Örn: Nisan ayı taksidi..." value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl outline-none h-24 resize-none" />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t"><Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)} className="h-12 px-6 rounded-xl font-bold">Vazgeç</Button><Button type="submit" disabled={saving || !txForm.amount || (txForm.payment_method !== 'cheque' && !txForm.payment_account_id)} className="h-12 px-8 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg">{saving ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}</Button></div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Bakiye Düzelt Modal */}
      {showBalanceFixModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg shadow-2xl rounded-3xl border-0 animate-in zoom-in duration-300">
            <CardHeader className="bg-gray-900 text-white rounded-t-3xl py-6 px-8 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-3"><Scale className="h-6 w-6" /> Bakiye Düzeltme</CardTitle>
                <p className="text-xs text-gray-400 mt-1">Müşteri bakiyesine manuel müdahale</p>
              </div>
              <button onClick={() => setShowBalanceFixModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-all"><X className="h-6 w-6 text-white" /></button>
            </CardHeader>
            <CardBody className="p-8">
              <form onSubmit={handleBalanceFix} className="space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setBalanceFixForm({...balanceFixForm, type: 'increase'})} className={`p-4 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${balanceFixForm.type === 'increase' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 text-gray-500 hover:border-gray-300'}`}>
                    <span className="font-black text-lg">+</span><span className="text-xs font-bold uppercase tracking-wider text-center">Müşteriyi<br/>Borçlandır</span>
                  </button>
                  <button type="button" onClick={() => setBalanceFixForm({...balanceFixForm, type: 'decrease'})} className={`p-4 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${balanceFixForm.type === 'decrease' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 text-gray-500 hover:border-gray-300'}`}>
                    <span className="font-black text-lg">-</span><span className="text-xs font-bold uppercase tracking-wider text-center">Müşteriyi<br/>Alacaklandır</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Tutar ({getCurrencySymbol(customer.currency)}) *</label>
                  <TrNumberInput
                    required
                    value={balanceFixForm.amount}
                    onChange={(v) => setBalanceFixForm({ ...balanceFixForm, amount: v })}
                    className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-2xl text-xl font-black text-gray-900 focus:border-gray-500 outline-none"
                    placeholder="0,00"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Açıklama *</label>
                  <input type="text" required placeholder="Açılış bakiyesi, mutabakat farkı vb." value={balanceFixForm.description} onChange={e => setBalanceFixForm({...balanceFixForm, description: e.target.value})} className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-2xl outline-none font-medium" />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Tarih</label>
                  <input type="date" required value={balanceFixForm.date} onChange={e => setBalanceFixForm({...balanceFixForm, date: e.target.value})} className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-2xl outline-none font-medium" />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t"><Button type="button" variant="outline" onClick={() => setShowBalanceFixModal(false)} className="h-12 px-6 rounded-xl font-bold">İptal</Button><Button type="submit" disabled={saving || !balanceFixForm.amount} className="h-12 px-8 rounded-xl font-bold bg-gray-900 hover:bg-black text-white">{saving ? 'Kaydediliyor...' : 'Bakiyeyi Güncelle'}</Button></div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Hesap Ekstresi Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl rounded-3xl border-0 animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="bg-white border-b py-3 px-8 flex flex-row items-center justify-between rounded-t-3xl shrink-0">
              <CardTitle className="text-xl font-bold flex items-center gap-3"><FileText className="h-6 w-6 text-primary-600" /> Hesap Ekstresi</CardTitle>
              <button onClick={() => setShowLedgerModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-500" /></button>
            </CardHeader>
            <CardBody className="p-0 flex-1 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 shadow-sm z-10"><tr><th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Tarih</th><th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Belge No</th><th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Tip</th><th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Açıklama</th><th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Tutar</th><th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Bakiye</th></tr></thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {ledgerData.map(tx => (
                    <tr key={tx.id} onClick={() => { setSelectedTx(tx); setShowTxDetailModal(true); }} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap font-medium group-hover:text-primary-600">{new Date(tx.transaction_date || tx.date || '').toLocaleDateString('tr-TR')}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{tx.document_number || tx.document_no || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`px-3 py-1 rounded-lg text-xs font-bold ${tx.isDebt ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{tx.isDebt ? 'Borçlandırma' : 'Alacaklandırma'}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{tx.description || '-'}</td>
                      <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${tx.isDebt ? 'text-gray-900' : 'text-emerald-600'}`}>{tx.isDebt ? '+' : '-'}{Number(tx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(tx.currency)}</td>
                      <td className="px-6 py-4 text-sm font-black text-right text-gray-900 whitespace-nowrap bg-gray-50/50">{tx.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(customer.currency)}</td>
                    </tr>
                  ))}
                  {ledgerData.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">Kayıt bulunmuyor.</td></tr>}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl rounded-3xl border-0 animate-in zoom-in duration-300">
            <CardHeader className="bg-white border-b py-3 px-8 flex flex-row items-center justify-between sticky top-0 z-10">
              <CardTitle className="text-xl font-bold flex items-center gap-3"><Edit2 className="h-6 w-6 text-primary-600" /> Müşteri Bilgilerini Düzenle</CardTitle>
              <button onClick={() => setShowEditCustomerModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-500" /></button>
            </CardHeader>
            <CardBody className="p-8">
              <form onSubmit={handleUpdateCustomer} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase px-1">Firma Ünvanı *</label><input type="text" required value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-primary-500 outline-none font-medium" /></div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase px-1">Firma Logosu</label>
                      <div className="flex items-center gap-4">
                        <input type="file" onChange={handleLogoUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
                        {uploadingLogo && <span className="text-xs font-bold text-gray-500">Yükleniyor...</span>}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase px-1">Para Birimi</label>
                      <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none font-bold bg-white">
                        {Object.keys(CURRENCY_SYMBOLS).map(code => <option key={code} value={code}>{code} ({CURRENCY_SYMBOLS[code]})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase px-1">Vergi Dairesi</label><input type="text" value={formData.tax_office} onChange={e => setFormData({...formData, tax_office: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none" /></div>
                      <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase px-1">Vergi No</label><input type="text" value={formData.tax_number} onChange={e => setFormData({...formData, tax_number: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none" /></div>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase px-1">İletişim Kişisi</label><input type="text" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none font-medium" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase px-1">Telefon</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none" /></div>
                      <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase px-1">E-Posta</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <TagSelector label="Müşteri Grubu" type="category1" value={formData.category1 || ''} placeholder="Seç/Yaz..." onChange={(val) => setFormData({ ...formData, category1: val })} />
                      <TagSelector label="Özel Etiket" type="category2" value={formData.category2 || ''} placeholder="Seç/Yaz..." onChange={(val) => setFormData({ ...formData, category2: val })} />
                    </div>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase px-1">Adres</label><textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl outline-none h-20 resize-none" /></div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t"><Button type="button" variant="outline" onClick={() => setShowEditCustomerModal(false)} className="h-12 px-6 rounded-xl font-bold border-2">Vazgeç</Button><Button type="submit" disabled={saving} className="h-12 px-8 rounded-xl font-bold bg-primary-600 hover:bg-primary-700 shadow-lg text-white">{saving ? 'Güncelleniyor...' : 'Kaydet'}</Button></div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Diğer modallar (Item detail, Tx Detail, Cheque) buraya eklendi (Kısa halleriyle, mevcut mantık korundu) */}
      {/* Tx Detail Modal */}
      {showTxDetailModal && selectedTx && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[130] p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-3xl shadow-2xl animate-in zoom-in duration-300 rounded-3xl overflow-hidden border-0">
            <CardHeader className={`${selectedTx.type === 'sale' || selectedTx.type === 'invoice' ? 'bg-gradient-to-r from-primary-600 to-primary-700' : 'bg-gradient-to-r from-emerald-600 to-emerald-700'} text-white flex flex-row items-center justify-between py-6 px-8 border-0`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  {selectedTx.type === 'sale' || selectedTx.type === 'invoice' ? <ShoppingCart className="h-6 w-6 text-white" /> : <CreditCard className="h-6 w-6 text-white" />}
                </div>
                <div>
                  <CardTitle className="text-2xl text-white font-black">{selectedTx.type === 'sale' || selectedTx.type === 'invoice' ? 'Satış İşlemi' : selectedTx.type === 'balance_fix' ? 'Bakiye Düzeltme' : 'Tahsilat İşlemi'}</CardTitle>
                  <p className="text-xs text-white/80 font-bold tracking-widest uppercase mt-1">İşlem ID: #{selectedTx.id.slice(0,8)}</p>
                </div>
              </div>
              <button onClick={() => setShowTxDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X className="h-7 w-7 text-white" /></button>
            </CardHeader>
            <CardBody className="p-0 bg-white">
              <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50/50 border-b">
                <div className="p-6 text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">İşlem Tarihi</p><p className="text-sm font-bold text-gray-900 flex items-center justify-center gap-2"><Calendar className="h-4 w-4 text-primary-500" /> {new Date(selectedTx.transaction_date || selectedTx.date || '').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                <div className="p-6 text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Açıklama</p><p className="text-sm font-bold text-gray-900 truncate px-2">{selectedTx.description || '-'}</p></div>
                <div className="p-6 text-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ödeme Yöntemi</p><p className="text-sm font-bold text-gray-900 flex items-center justify-center gap-2"><CreditCard className="h-4 w-4 text-primary-500" /> {selectedTx.payment_method === 'cash' ? 'Nakit' : selectedTx.payment_method === 'credit_card' ? 'Kredi Kartı' : selectedTx.payment_method === 'cheque' ? 'Çek / Senet' : selectedTx.payment_method === 'bank_transfer' ? 'Banka' : 'Tanımsız'}</p></div>
              </div>
              <div className="p-8">
                {selectedTx.type === 'payment' && selectedTx.payment_method === 'cheque' && (selectedTx.cheque_bank || selectedTx.cheque_serial_number) && (
                  <div className="mb-8 grid grid-cols-3 gap-4 bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm">
                    {selectedTx.cheque_bank && <div><p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Banka Adı</p><p className="text-sm font-bold text-amber-900">{selectedTx.cheque_bank}</p></div>}
                    {selectedTx.cheque_serial_number && <div><p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Seri Numarası</p><p className="text-sm font-bold text-amber-900 uppercase">{selectedTx.cheque_serial_number}</p></div>}
                    {selectedTx.cheque_due_date && <div><p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Vade Tarihi</p><p className="text-sm font-bold text-amber-900">{new Date(selectedTx.cheque_due_date).toLocaleDateString('tr-TR')}</p></div>}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between p-8 bg-gradient-to-br from-primary-800 to-primary-950 rounded-[2.5rem] text-white shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-white/10 rounded-3xl"><DollarSign className="h-8 w-8 text-primary-300" /></div>
                    <div><p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">İşlem Toplamı</p><p className="text-3xl font-black tracking-tight">{Number(selectedTx.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(selectedTx.currency)}</p></div>
                  </div>
                  <Button onClick={() => setShowTxDetailModal(false)} className="h-14 px-10 rounded-2xl font-black bg-white text-primary-900 hover:bg-primary-50 transition-all shadow-lg active:scale-95 border-0">KAPAT</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Cheque Modal (Eğer işlem esnasında eklenirse) */}
      {showChequeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[140] p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in duration-300 rounded-3xl overflow-hidden border-0">
            <CardHeader className="bg-amber-600 text-white py-3 px-6"><CardTitle className="text-xl font-bold">Çek Bilgileri</CardTitle></CardHeader>
            <CardBody className="p-8 space-y-4">
               <div className="space-y-2"><label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Banka Adı</label><input type="text" value={chequeData.bank} onChange={e => setChequeData({...chequeData, bank: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl outline-none" /></div>
               <div className="space-y-2"><label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Seri No</label><input type="text" value={chequeData.serial_number} onChange={e => setChequeData({...chequeData, serial_number: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl outline-none" /></div>
               <div className="space-y-2"><label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Vade Tarihi</label><input type="date" value={chequeData.due_date} onChange={e => setChequeData({...chequeData, due_date: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl outline-none" /></div>
               <div className="pt-4"><Button onClick={() => setShowChequeModal(false)} className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-xl">Kaydet</Button></div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Item Detail Modal */}
      {showItemDetailModal && currentItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 overflow-hidden border-0 rounded-3xl">
            <CardHeader className="bg-primary-600 text-white flex flex-row items-center justify-between py-3 px-6 border-0">
              <div>
                <CardTitle className="text-xl font-bold">{currentItem.name}</CardTitle>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-primary-100 font-medium">{currentItem.sku || 'SKU YOK'}</p>
                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                  <p className="text-xs text-white font-bold flex items-center gap-1"><Package className="h-3 w-3" /> Toplam Stok: {totalStock} {currentItem.unit}</p>
                </div>
              </div>
              <button onClick={() => setShowItemDetailModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X className="h-6 w-6 text-white" /></button>
            </CardHeader>
            <CardBody className="p-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="sale-line-unit-price" className="block text-xs font-black text-gray-400 uppercase cursor-pointer">
                    Birim Fiyat ({getCurrencySymbol(customer.currency)})
                  </label>
                  <TrNumberInput
                    id="sale-line-unit-price"
                    value={itemFormData.unit_price}
                    onChange={(v) => setItemFormData({ ...itemFormData, unit_price: v })}
                    onFocus={(e) => {
                      if (shouldClearTrLineFieldOnFocus(itemFormData.unit_price, 'unit_price')) {
                        setItemFormData((f) => ({ ...f, unit_price: '' }))
                      } else {
                        e.currentTarget.select()
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl font-bold focus:border-primary-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="sale-line-qty" className="block text-xs font-black text-gray-400 uppercase cursor-pointer">
                    Miktar ({currentItem.unit})
                  </label>
                  <TrNumberInput
                    id="sale-line-qty"
                    value={itemFormData.quantity}
                    onChange={(v) => setItemFormData({ ...itemFormData, quantity: v })}
                    onFocus={(e) => {
                      if (shouldClearTrLineFieldOnFocus(itemFormData.quantity, 'quantity')) {
                        setItemFormData((f) => ({ ...f, quantity: '' }))
                      } else {
                        e.currentTarget.select()
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl font-bold focus:border-primary-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="sale-line-tax" className="block text-xs font-black text-gray-400 uppercase cursor-pointer">
                    KDV Oranı (%)
                  </label>
                  <TrNumberInput
                    id="sale-line-tax"
                    value={itemFormData.tax_rate}
                    onChange={(v) => setItemFormData({ ...itemFormData, tax_rate: v })}
                    onFocus={(e) => {
                      if (shouldClearTrLineFieldOnFocus(itemFormData.tax_rate, 'tax_rate')) {
                        setItemFormData((f) => ({ ...f, tax_rate: '' }))
                      } else {
                        e.currentTarget.select()
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl font-bold focus:border-primary-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="sale-line-discount" className="block text-xs font-black text-gray-400 uppercase cursor-pointer">
                    İskonto (%)
                  </label>
                  <TrNumberInput
                    id="sale-line-discount"
                    value={itemFormData.discount_rate}
                    onChange={(v) => setItemFormData({ ...itemFormData, discount_rate: v })}
                    onFocus={(e) => {
                      if (shouldClearTrLineFieldOnFocus(itemFormData.discount_rate, 'discount_rate')) {
                        setItemFormData((f) => ({ ...f, discount_rate: '' }))
                      } else {
                        e.currentTarget.select()
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl font-bold focus:border-primary-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <div className="flex justify-between items-end px-1">
                  <label className="block text-xs font-black text-gray-400 uppercase">Çıkış Yapılacak Depo *</label>
                  {itemFormData.warehouse_id && (
                    <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      Depo Mevcudu: {currentItem.stock?.find(s => s.warehouse_id === itemFormData.warehouse_id)?.quantity || 0} {currentItem.unit}
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <select 
                    value={itemFormData.warehouse_id} 
                    onChange={e => setItemFormData({...itemFormData, warehouse_id: e.target.value})} 
                    className="w-full pl-10 pr-10 py-3.5 border-2 border-gray-100 rounded-2xl font-bold focus:border-primary-500 outline-none transition-all bg-white appearance-none cursor-pointer"
                  >
                    {warehouses.map(w => {
                      const stock = currentItem.stock?.find(s => s.warehouse_id === w.id)?.quantity || 0;
                      return (
                        <option key={w.id} value={w.id} className={stock <= 0 ? "text-red-600" : "text-gray-900"}>
                          {w.name} (Stok: {stock} {currentItem.unit})
                        </option>
                      )
                    })}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-gray-50/80 border border-gray-100 rounded-3xl p-6 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full -mr-12 -mt-12" />
                <div className="flex justify-between text-sm text-gray-500 font-medium"><span>Ara Toplam (KDV&apos;siz):</span><span className="text-gray-900">{currentModalBase.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(customer.currency)}</span></div>
                {currentModalDiscount > 0 && <div className="flex justify-between text-sm text-red-600 font-bold"><span>İskonto (%{itemFormData.discount_rate}):</span><span>-{currentModalDiscount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(customer.currency)}</span></div>}
                <div className="flex justify-between text-sm text-gray-500 font-medium"><span>Hesaplanan KDV (%{itemFormData.tax_rate}):</span><span className="text-gray-900">+{currentModalTax.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(customer.currency)}</span></div>
                <div className="pt-4 mt-2 border-t border-dashed border-gray-200 flex justify-between items-center">
                  <span className="font-black text-gray-900 uppercase tracking-wider text-xs">GENEL TOPLAM:</span>
                  <span className="text-3xl font-black text-primary-600 tracking-tight">{currentModalTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencySymbol(customer.currency)}</span>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <Button type="button" variant="outline" onClick={() => setShowItemDetailModal(false)} className="flex-1 h-14 rounded-2xl font-bold border-2 text-gray-500">Vazgeç</Button>
                <Button type="button" onClick={handleAddItemFromModal} className="flex-[1.5] h-14 rounded-2xl font-bold text-lg bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-100 transition-all active:scale-95 text-white">
                  <Check className="h-5 w-5 mr-2" /> Listeye Ekle
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

    </div>
  )
}
