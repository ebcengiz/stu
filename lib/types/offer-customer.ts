/** Teklif API içindeki customers ilişkisi — müşteri detay sayfasındaki tabloyla uyumlu alanlar */
export interface OfferCustomerEmbed {
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
  currency: string | null
  is_active: boolean | null
}
