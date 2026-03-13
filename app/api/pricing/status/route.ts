import { NextRequest, NextResponse } from 'next/server';

interface StatusCheck {
  apiKey: string;
  configured: boolean;
  ratesEndpoint: string;
  countriesEndpoint: string;
  supportedCurrencies: number;
  cacheDuration: string;
  timestamp: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'error';
  message: string;
  details: {
    currencyApiKey: boolean;
    ratesEndpoint: boolean;
    countriesEndpoint: boolean;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<HealthResponse | StatusCheck>> {
  try {
    const { searchParams } = new URL(request.url);
    const health = searchParams.get('health') === 'true';

    if (health) {
      // Health check mode
      const apiKey = process.env.CURRENCY_API_KEY ? true : false;

      const response: HealthResponse = {
        status: apiKey ? 'healthy' : 'degraded',
        message: apiKey
          ? 'Currency API is properly configured'
          : 'Currency API key not found - using fallback rates',
        details: {
          currencyApiKey: apiKey,
          ratesEndpoint: true,
          countriesEndpoint: true,
        },
      };

      return NextResponse.json(response, {
        status: apiKey ? 200 : 206,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Detailed status check
    const supportedCurrencies = [
      'USD', 'INR', 'EUR', 'GBP', 'JPY',
      'AUD', 'CAD', 'CHF', 'CNY', 'MXN',
      'BRL', 'ZAR', 'SGD', 'HKD', 'KRW',
    ];

    const hasApiKey = !!process.env.CURRENCY_API_KEY;
    const maskKey = hasApiKey
      ? process.env.CURRENCY_API_KEY!.substring(0, 10) + '...'
      : 'NOT_CONFIGURED';

    const status: StatusCheck = {
      apiKey: maskKey,
      configured: hasApiKey,
      ratesEndpoint: '/api/pricing/rates',
      countriesEndpoint: '/api/pricing/countries',
      supportedCurrencies: supportedCurrencies.length,
      cacheDuration: '1 hour (3600 seconds)',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('Status check error:', error);

    const response: HealthResponse = {
      status: 'error',
      message: 'Failed to check pricing system status',
      details: {
        currencyApiKey: false,
        ratesEndpoint: false,
        countriesEndpoint: false,
      },
    };

    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { test, currency = 'USD', amount = 1.75 } = body;

    if (test === 'convert') {
      // Test currency conversion
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/pricing/rates?currencies=${currency}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch rates' },
          { status: 500 }
        );
      }

      const { data: rates } = await response.json();
      const rate = rates[currency] || 1;
      const converted = amount * rate;

      return NextResponse.json({
        test: 'convert',
        input: {
          amount,
          currency: 'USD',
        },
        output: {
          amount: Number(converted.toFixed(2)),
          currency,
          rate: Number(rate),
          formatted: `${currency} ${converted.toFixed(2)}`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (test === 'pricing') {
      // Test model pricing
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/pricing/countries`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelName: 'GPT-5.2',
            provider: 'openai',
          }),
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch pricing' },
          { status: 500 }
        );
      }

      const data = await response.json();
      return NextResponse.json({
        test: 'pricing',
        model: data.model,
        priceCount: data.prices.length,
        sample: data.prices.slice(0, 3),
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Unknown test type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { error: 'Test failed' },
      { status: 500 }
    );
  }
}
