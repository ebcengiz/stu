// Free API source for exchange rates (European Central Bank data)
const API_URL = 'https://api.frankfurter.app/latest'

export type CurrencyCode = 'TRY' | 'USD' | 'EUR' | 'GBP'

export interface ExchangeRates {
  [key: string]: number
}

// Cache rates for 1 hour to avoid spamming the API
let cachedRates: ExchangeRates | null = null
let lastFetchTime = 0
const CACHE_DURATION = 3600000 // 1 hour in ms

export async function getExchangeRates(base: CurrencyCode = 'TRY'): Promise<ExchangeRates> {
  const now = Date.now()
  
  // Return cached rates if valid
  if (cachedRates && (now - lastFetchTime < CACHE_DURATION)) {
    return cachedRates
  }

  try {
    // Frankfurter base is usually EUR. To get TRY based rates, we fetch from TRY
    // Targets: USD, EUR, GBP
    const response = await fetch(`${API_URL}?from=${base}&to=USD,EUR,GBP`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch rates')
    }

    const data = await response.json()
    
    // Add the base currency itself
    const rates = {
      ...data.rates,
      [base]: 1
    }

    cachedRates = rates
    lastFetchTime = now
    
    return rates
  } catch (error) {
    console.error('Currency fetch error:', error)
    // Fallback: return 1 for everything to prevent crash
    return { TRY: 1, USD: 1, EUR: 1, GBP: 1 }
  }
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
  GBP: '£'
}
