/**
 * Currency/Pricing Feature Test Examples
 * 
 * This file demonstrates how to use the new currency conversion
 * and multi-country pricing features.
 */

// Example 1: Fetch Exchange Rates from the API
async function getExchangeRates() {
  const response = await fetch('/api/pricing/rates?currencies=USD,INR,EUR,GBP,JPY');
  const data = await response.json();
  
  console.log('Exchange Rates:', data);
  return data;
}

// Example 2: Get Pricing for a Model Across Different Countries
async function getCountryPricing(modelName: string) {
  const response = await fetch('/api/pricing/countries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelName: modelName || 'GPT-5.2',
      provider: 'openai',
      currencies: ['USD', 'INR', 'EUR', 'GBP', 'JPY'],
    }),
  });
  
  const data = await response.json();
  console.log('Country Pricing:', data);
  return data;
}

// Example 3: Use Currency Service Directly (Server-side)
async function useServerSideCurrencyService() {
  // This would typically be in a server action or API route
  // Import the currency service and use it directly
  
  // const { currencyService, POPULAR_CURRENCIES } = await import('@/lib/currency-service');
  
  // Get exchange rates for specific currencies
  // const rates = await currencyService.fetchExchangeRates('USD', POPULAR_CURRENCIES);
  
  // Convert a price from USD to multiple currencies
  // const convertedPrices = await currencyService.convertPrice(10.5, ['INR', 'EUR']);
  
  // Calculate pricing for a model across countries
  // const pricing = await currencyService.calculatePricingByCountry(1.75, 14.0, POPULAR_CURRENCIES);
}

// Example 4: Display Formatted Currency
async function displayFormattedPrices() {
  const response = await fetch('/api/pricing/countries', {
    method: 'POST',
    body: JSON.stringify({
      modelName: 'GPT-5.2',
      provider: 'openai',
    }),
  });
  
  const { prices } = await response.json();
  
  // Each price includes formatted strings
  prices.forEach((price: any) => {
    console.log(`${price.country}: Input = ${price.inputPrice} ${price.symbol}`);
  });
}

// Example 5: Fetch Status and Details (Free Currency API)
async function getAPIStatus() {
  // Check if the API key is working
  const apiKey = process.env.CURRENCY_API_KEY;
  const response = await fetch(
    `https://api.freecurrencyapi.com/v1/status?apikey=${apiKey}`
  );
  const status = await response.json();
  
  console.log('API Status:', status);
  return status;
}

// Example 6: Get Latest Exchange Rates for Multiple Currencies
async function getLatestRates() {
  const apiKey = process.env.CURRENCY_API_KEY;
  const currencies = 'INR,EUR,GBP,JPY,AUD,CAD';
  
  const response = await fetch(
    `https://api.freecurrencyapi.com/v1/latest?apikey=${apiKey}&base_currency=USD&currencies=${currencies}`
  );
  const data = await response.json();
  
  console.log('Latest Rates:', data.data);
  return data.data;
}

// Example 7: Price Calculation with Real-time Rates
async function calculateWithRealRates() {
  // Get the pricing for GPT-5.2
  const response = await fetch('/api/pricing/countries', {
    method: 'POST',
    body: JSON.stringify({
      modelName: 'GPT-5.2',
      provider: 'openai',
    }),
  });
  
  const { prices } = await response.json();
  
  // Find pricing for India
  const indiaPrice = prices.find((p: any) => p.currency === 'INR');
  
  if (indiaPrice) {
    console.log(`
      GPT-5.2 Pricing in India:
      - Input: ${indiaPrice.symbol}${indiaPrice.inputPrice.toFixed(2)} per 1M tokens
      - Output: ${indiaPrice.symbol}${indiaPrice.outputPrice.toFixed(2)} per 1M tokens
      - Exchange Rate: 1 USD = ${indiaPrice.rate.toFixed(2)} INR
    `);
  }
}

// Export for testing
export {
  getExchangeRates,
  getCountryPricing,
  useServerSideCurrencyService,
  displayFormattedPrices,
  getAPIStatus,
  getLatestRates,
  calculateWithRealRates,
};
