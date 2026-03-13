'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const SUPPORTED_CURRENCIES = {
  'USD': { name: 'US Dollar', symbol: '$', country: 'United States' },
  'INR': { name: 'Indian Rupee', symbol: '₹', country: 'India' },
  'EUR': { name: 'Euro', symbol: '€', country: 'Eurozone' },
  'GBP': { name: 'British Pound', symbol: '£', country: 'United Kingdom' },
  'JPY': { name: 'Japanese Yen', symbol: '¥', country: 'Japan' },
  'AUD': { name: 'Australian Dollar', symbol: 'A$', country: 'Australia' },
  'CAD': { name: 'Canadian Dollar', symbol: 'C$', country: 'Canada' },
  'CHF': { name: 'Swiss Franc', symbol: 'CHF', country: 'Switzerland' },
  'CNY': { name: 'Chinese Yuan', symbol: '¥', country: 'China' },
  'MXN': { name: 'Mexican Peso', symbol: '$', country: 'Mexico' },
  'BRL': { name: 'Brazilian Real', symbol: 'R$', country: 'Brazil' },
  'ZAR': { name: 'South African Rand', symbol: 'R', country: 'South Africa' },
  'SGD': { name: 'Singapore Dollar', symbol: 'S$', country: 'Singapore' },
  'HKD': { name: 'Hong Kong Dollar', symbol: 'HK$', country: 'Hong Kong' },
  'KRW': { name: 'South Korean Won', symbol: '₩', country: 'South Korea' },
} as const;

export type Currency = keyof typeof SUPPORTED_CURRENCIES;

interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  label?: string;
}

export function CurrencySelector({ value, onChange, label = 'Currency' }: CurrencySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={(val) => onChange(val as Currency)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
            <SelectItem key={code} value={code}>
              {info.symbol} {code} - {info.country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export async function fetchExchangeRates(currencies: Currency[]): Promise<Record<Currency, number>> {
  try {
    const response = await fetch(
      `/api/pricing/rates?currencies=${currencies.join(',')}`,
      { method: 'GET' }
    );

    if (response.ok) {
      const { data } = await response.json();
      return data;
    }
  } catch (error) {
    console.warn('Failed to fetch rates:', error);
  }

  // Fallback rates
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
  } as Record<Currency, number>;
}

export function convertPrice(usdAmount: number, currency: Currency, rate: number): string {
  const amount = usdAmount * rate;
  const info = SUPPORTED_CURRENCIES[currency];
  
  // Skip decimals for JPY and KRW
  if (currency === 'JPY' || currency === 'KRW') {
    return `${info.symbol}${Math.round(amount).toLocaleString()}`;
  }
  
  return `${info.symbol}${amount.toFixed(2)}`;
}
