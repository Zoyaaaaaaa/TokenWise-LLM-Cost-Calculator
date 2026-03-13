/**
 * Currency Exchange Rate Service
 * Fetches live exchange rates and converts prices across multiple currencies
 */

export interface ExchangeRateData {
  rates: Record<string, number>;
  timestamp: string;
  status: 'success' | 'error';
}

export interface ConvertedPrice {
  currency: string;
  symbol: string;
  amount: number;
  formatted: string;
}

export interface PricingByCountry {
  country: string;
  currency: string;
  symbol: string;
  inputPrice: number;
  outputPrice: number;
  inputFormatted: string;
  outputFormatted: string;
}

class CurrencyService {
  private apiKey: string;
  private baseUrl = 'https://api.freecurrencyapi.com/v1';
  private cacheTime = 3600000; // 1 hour
  private cache: Map<string, { data: ExchangeRateData; timestamp: number }> = new Map();

  constructor(apiKey: string = '') {
    this.apiKey = apiKey || process.env.CURRENCY_API_KEY || '';
  }

  /**
   * Fetch fresh exchange rates from Free Currency API
   */
  async fetchExchangeRates(baseCurrency: string = 'USD', currencies: string[] = []): Promise<Record<string, number>> {
    try {
      const cacheKey = `${baseCurrency}_${currencies.join(',')}`;
      
      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTime) {
        return cached.data.rates;
      }

      if (!this.apiKey) {
        console.warn('CURRENCY_API_KEY not set, using fallback rates');
        return this.getFallbackRates();
      }

      const currencyParam = currencies.length > 0 ? currencies.join(',') : '';
      const url = currencyParam
        ? `${this.baseUrl}/latest?apikey=${this.apiKey}&base_currency=${baseCurrency}&currencies=${currencyParam}`
        : `${this.baseUrl}/latest?apikey=${this.apiKey}&base_currency=${baseCurrency}`;

      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 3600 },
      });

      if (!response.ok) {
        console.error(`Free Currency API error: ${response.statusText}`);
        return this.getFallbackRates();
      }

      const data = await response.json();
      const rates = {
        [baseCurrency]: 1,
        ...data.data,
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: { rates, timestamp: new Date().toISOString(), status: 'success' },
        timestamp: Date.now(),
      });

      return rates;
    } catch (error) {
      console.error('Currency fetch error:', error);
      return this.getFallbackRates();
    }
  }

  /**
   * Convert a price from USD to multiple currencies
   */
  async convertPrice(usdAmount: number, currencies: string[] = ['INR']): Promise<ConvertedPrice[]> {
    const rates = await this.fetchExchangeRates('USD', currencies);
    
    return currencies.map(currency => ({
      currency,
      symbol: this.getCurrencySymbol(currency),
      amount: usdAmount * (rates[currency] || 1),
      formatted: this.formatCurrency(usdAmount * (rates[currency] || 1), currency),
    }));
  }

  /**
   * Calculate pricing for a model across multiple countries
   */
  async calculatePricingByCountry(
    inputPriceUSD: number,
    outputPriceUSD: number,
    countries: string[] = ['USD', 'INR', 'EUR', 'GBP', 'JPY']
  ): Promise<PricingByCountry[]> {
    const rates = await this.fetchExchangeRates('USD', countries);

    return countries.map(currency => {
      const rate = rates[currency] || 1;
      const inputPrice = inputPriceUSD * rate;
      const outputPrice = outputPriceUSD * rate;

      return {
        country: this.getCountryName(currency),
        currency,
        symbol: this.getCurrencySymbol(currency),
        inputPrice: Number(inputPrice.toFixed(4)),
        outputPrice: Number(outputPrice.toFixed(4)),
        inputFormatted: this.formatCurrency(inputPrice, currency),
        outputFormatted: this.formatCurrency(outputPrice, currency),
      };
    });
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      INR: '₹',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      AUD: 'A$',
      CAD: 'C$',
      CHF: 'CHF',
      CNY: '¥',
      MXN: '$',
      BRL: 'R$',
      ZAR: 'R',
      SGD: 'S$',
      HKD: 'HK$',
      KRW: '₩',
    };
    return symbols[currency] || currency;
  }

  /**
   * Format currency with proper decimal places
   */
  formatCurrency(amount: number, currency: string): string {
    const symbol = this.getCurrencySymbol(currency);
    
    // JPY and KRW typically don't use decimals
    if (['JPY', 'KRW'].includes(currency)) {
      return `${symbol}${Math.round(amount).toLocaleString()}`;
    }

    return `${symbol}${amount.toFixed(2).toLocaleString()}`;
  }

  /**
   * Get country name from currency code
   */
  getCountryName(currency: string): string {
    const countries: Record<string, string> = {
      USD: 'United States',
      INR: 'India',
      EUR: 'Eurozone',
      GBP: 'United Kingdom',
      JPY: 'Japan',
      AUD: 'Australia',
      CAD: 'Canada',
      CHF: 'Switzerland',
      CNY: 'China',
      MXN: 'Mexico',
      BRL: 'Brazil',
      ZAR: 'South Africa',
      SGD: 'Singapore',
      HKD: 'Hong Kong',
      KRW: 'South Korea',
    };
    return countries[currency] || currency;
  }

  /**
   * Fallback rates if API fails (hardcoded approximate rates)
   */
  private getFallbackRates(): Record<string, number> {
    return {
      USD: 1.0,
      INR: 83.5,
      EUR: 0.95,
      GBP: 0.79,
      JPY: 149.5,
      AUD: 1.58,
      CAD: 1.38,
      CHF: 0.88,
      CNY: 7.28,
      MXN: 20.5,
      BRL: 5.15,
      ZAR: 18.2,
      SGD: 1.35,
      HKD: 7.82,
      KRW: 1310,
    };
  }
}

// Create singleton instance
export const currencyService = new CurrencyService();

// Export common currency lists
export const POPULAR_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY'];
export const ALL_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'MXN', 'BRL', 'ZAR', 'SGD', 'HKD', 'KRW'];
