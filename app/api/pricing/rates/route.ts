import { NextRequest, NextResponse } from 'next/server';

interface ExchangeRates {
  [currency: string]: number;
}

interface CurrencyResponse {
  data: ExchangeRates;
  timestamp: string;
}

// List of countries and their currency codes
const COUNTRIES = {
  'USD': { name: 'United States', code: 'USD', symbol: '$' },
  'INR': { name: 'India', code: 'INR', symbol: '₹' },
  'EUR': { name: 'Europe', code: 'EUR', symbol: '€' },
  'GBP': { name: 'United Kingdom', code: 'GBP', symbol: '£' },
  'JPY': { name: 'Japan', code: 'JPY', symbol: '¥' },
  'AUD': { name: 'Australia', code: 'AUD', symbol: 'A$' },
  'CAD': { name: 'Canada', code: 'CAD', symbol: 'C$' },
  'CHF': { name: 'Switzerland', code: 'CHF', symbol: 'CHF' },
  'CNY': { name: 'China', code: 'CNY', symbol: '¥' },
  'MXN': { name: 'Mexico', code: 'MXN', symbol: '$' },
  'BRL': { name: 'Brazil', code: 'BRL', symbol: 'R$' },
  'ZAR': { name: 'South Africa', code: 'ZAR', symbol: 'R' },
  'SGD': { name: 'Singapore', code: 'SGD', symbol: 'S$' },
  'HKD': { name: 'Hong Kong', code: 'HKD', symbol: 'HK$' },
  'KRW': { name: 'South Korea', code: 'KRW', symbol: '₩' },
} as const;

// Fallback rates if API fails
const FALLBACK_RATES: ExchangeRates = {
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

export async function GET(request: NextRequest) {
  try {
    const currencyApiKey = process.env.CURRENCY_API_KEY;
    
    // Get query parameter for specific currencies
    const { searchParams } = new URL(request.url);
    const currenciesParam = searchParams.get('currencies');
    
    // Default to popular currencies for pricing
    const currencies = currenciesParam 
      ? currenciesParam.split(',')
      : Object.keys(COUNTRIES).slice(0, 10);

    // If no API key, return fallback rates immediately
    if (!currencyApiKey) {
      const fallbackRates: ExchangeRates = {};
      currencies.forEach(curr => {
        fallbackRates[curr] = FALLBACK_RATES[curr] || 1;
      });

      return NextResponse.json({
        data: fallbackRates,
        timestamp: new Date().toISOString(),
        status: 'success',
        source: 'fallback',
      });
    }

    try {
      const currencyString = currencies.join(',');

      // Fetch from Free Currency API
      const response = await fetch(
        `https://api.freecurrencyapi.com/v1/latest?apikey=${currencyApiKey}&base_currency=USD&currencies=${currencyString}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rates: ExchangeRates = {
          USD: 1,
          ...(data.data || {}),
        };

        return NextResponse.json({
          data: rates,
          timestamp: new Date().toISOString(),
          status: 'success',
          source: 'live',
        });
      }
    } catch (fetchError) {
      console.warn('Free Currency API fetch failed, using fallback rates:', fetchError);
    }

    // Return fallback rates on API failure
    const fallbackRates: ExchangeRates = {};
    currencies.forEach(curr => {
      fallbackRates[curr] = FALLBACK_RATES[curr] || 1;
    });

    return NextResponse.json({
      data: fallbackRates,
      timestamp: new Date().toISOString(),
      status: 'success',
      source: 'fallback',
    });

  } catch (error) {
    console.error('Currency rates endpoint error:', error);
    
    // Even in error, return fallback rates
    return NextResponse.json({
      data: FALLBACK_RATES,
      timestamp: new Date().toISOString(),
      status: 'success',
      source: 'fallback',
    });
  }
}
