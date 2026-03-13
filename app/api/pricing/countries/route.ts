import { NextRequest, NextResponse } from 'next/server';
import { MODELS } from '@/lib/pricing-data';

interface CountryPrice {
  country: string;
  currency: string;
  symbol: string;
  inputPrice: number;
  outputPrice: number;
  cachedInputPrice?: number;
  rate: number;
}

interface ModelCountryPrices {
  model: string;
  provider: string;
  description?: string;
  prices: CountryPrice[];
}

// Mapping of currencies to countries for display
const CURRENCY_MAP = {
  'USD': { country: 'United States', symbol: '$' },
  'INR': { country: 'India', symbol: '₹' },
  'EUR': { country: 'Europe', symbol: '€' },
  'GBP': { country: 'United Kingdom', symbol: '£' },
  'JPY': { country: 'Japan', symbol: '¥' },
  'AUD': { country: 'Australia', symbol: 'A$' },
  'CAD': { country: 'Canada', symbol: 'C$' },
  'CHF': { country: 'Switzerland', symbol: 'CHF' },
  'CNY': { country: 'China', symbol: '¥' },
  'MXN': { country: 'Mexico', symbol: '$' },
  'BRL': { country: 'Brazil', symbol: 'R$' },
  'ZAR': { country: 'South Africa', symbol: 'R' },
  'SGD': { country: 'Singapore', symbol: 'S$' },
  'HKD': { country: 'Hong Kong', symbol: 'HK$' },
  'KRW': { country: 'South Korea', symbol: '₩' },
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelName, provider = 'openai', currencies, selectedCurrency } = body;

    // If only converting to one currency, use simple conversion
    if (selectedCurrency && !modelName) {
      const ratesResponse = await fetch(
        `${request.nextUrl.protocol}//${request.nextUrl.host}/api/pricing/rates?currencies=${selectedCurrency}`,
        { method: 'GET' }
      );
      
      if (ratesResponse.ok) {
        const { data: rates } = await ratesResponse.json();
        return NextResponse.json({
          rates,
          currency: selectedCurrency,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Fetch live exchange rates with fallback
    const currenciesParam = currencies?.join(',') || Object.keys(CURRENCY_MAP).join(',');
    const ratesResponse = await fetch(
      `${request.nextUrl.protocol}//${request.nextUrl.host}/api/pricing/rates?currencies=${currenciesParam}`,
      { method: 'GET' }
    );

    let rates: Record<string, number> = {};
    
    if (ratesResponse.ok) {
      const ratesData = await ratesResponse.json();
      rates = ratesData.data || {};
    } else {
      // Fallback rates
      rates = {
        USD: 1, INR: 83.5, EUR: 0.95, GBP: 0.79, JPY: 149.5,
        AUD: 1.58, CAD: 1.38, CHF: 0.88, CNY: 7.28, MXN: 20.5,
      };
    }

    // Get pricing data for the model
    const modelList = provider && MODELS[provider] ? MODELS[provider] : 
                      Object.values(MODELS).flat();
    
    const selectedModel = modelName 
      ? modelList.find(m => m.name === modelName)
      : modelList[0];

    if (!selectedModel) {
      return NextResponse.json(
        { error: `Model "${modelName}" not found` },
        { status: 404 }
      );
    }

    // Convert pricing to multiple currencies
    const countryPrices: CountryPrice[] = Object.entries(rates).map(([currency, rate]) => {
      const countryInfo = CURRENCY_MAP[currency as keyof typeof CURRENCY_MAP] || {
        country: currency,
        symbol: currency,
      };

      return {
        country: countryInfo.country,
        currency,
        symbol: countryInfo.symbol,
        inputPrice: Number((selectedModel.inputPrice * (rate as number)).toFixed(4)),
        outputPrice: Number((selectedModel.outputPrice * (rate as number)).toFixed(4)),
        ...(selectedModel.cachedInputPrice && {
          cachedInputPrice: Number((selectedModel.cachedInputPrice * (rate as number)).toFixed(4)),
        }),
        rate: Number(rate),
      };
    });

    const response: ModelCountryPrices = {
      model: selectedModel.name,
      provider: selectedModel.provider,
      description: selectedModel.description,
      prices: countryPrices.sort((a, b) => a.country.localeCompare(b.country)),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Country pricing endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate country pricing' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelName = searchParams.get('model');
    const provider = searchParams.get('provider') || 'openai';
    const currencies = searchParams.get('currencies')?.split(',');

    // Reuse POST logic for GET request
    return POST(
      new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ modelName, provider, currencies }),
      })
    );
  } catch (error) {
    console.error('GET country pricing error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch country pricing' },
      { status: 500 }
    );
  }
}
