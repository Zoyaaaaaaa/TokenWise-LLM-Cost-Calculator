'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
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

export function CountryPricingMode() {
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [pricing, setPricing] = useState<ModelCountryPrices | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get all models
  const allModels = Object.entries(MODELS).flatMap(([provider, models]) =>
    models.map(m => ({ ...m, providerKey: provider }))
  );

  // Filter models by provider
  const filteredModels = selectedProvider
    ? allModels.filter(m => m.providerKey === selectedProvider)
    : allModels;

  // Set default model on provider change
  useEffect(() => {
    if (filteredModels.length > 0 && !selectedModel) {
      setSelectedModel(filteredModels[0].name);
    }
  }, [selectedProvider, filteredModels, selectedModel]);

  const fetchCountryPricing = async () => {
    if (!selectedModel) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pricing/countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: selectedModel,
          provider: selectedProvider,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pricing');
      }

      const data = await response.json();
      setPricing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pricing');
      setPricing(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedModel) {
      fetchCountryPricing();
    }
  }, [selectedModel, selectedProvider]);

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Global Pricing Calculator</CardTitle>
          <CardDescription>
            View pricing across different countries and currencies (updated via Free Currency API)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">AI Provider</label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(MODELS).map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {filteredModels.map(model => (
                  <SelectItem key={model.name} value={model.name}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Description */}
          {pricing && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">{pricing.model}</p>
              {pricing.description && <p className="text-muted-foreground">{pricing.description}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {/* Pricing Table */}
      {pricing && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Pricing for {pricing.model}
            </CardTitle>
            <CardDescription>
              Per 1 million tokens (Live exchange rates)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Country</th>
                    <th className="text-right py-3 px-4 font-medium">Currency</th>
                    <th className="text-right py-3 px-4 font-medium">Input Price</th>
                    <th className="text-right py-3 px-4 font-medium">Output Price</th>
                    {pricing.prices[0]?.cachedInputPrice !== undefined && (
                      <th className="text-right py-3 px-4 font-medium">Cached Input</th>
                    )}
                    <th className="text-right py-3 px-4 font-medium">Exchange Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.prices.map((price, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{price.country}</p>
                          <Badge variant="outline" className="mt-1">
                            {price.currency}
                          </Badge>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">
                        {price.symbol}
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-mono">
                          {price.symbol}{price.inputPrice.toFixed(2)}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-mono">
                          {price.symbol}{price.outputPrice.toFixed(2)}
                        </span>
                      </td>
                      {price.cachedInputPrice !== undefined && (
                        <td className="text-right py-3 px-4 text-xs text-muted-foreground">
                          <span className="font-mono">
                            {price.symbol}{price.cachedInputPrice.toFixed(4)}
                          </span>
                        </td>
                      )}
                      <td className="text-right py-3 px-4 text-xs text-muted-foreground">
                        <span className="font-mono">{price.rate.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Currency Data Legend */}
            <div className="mt-6 border-t pt-4 text-xs text-muted-foreground">
              <p className="font-medium mb-2">Legend:</p>
              <ul className="space-y-1">
                <li>• <strong>Input Price:</strong> Cost per 1M input tokens</li>
                <li>• <strong>Output Price:</strong> Cost per 1M output tokens</li>
                <li>• <strong>Cached Input:</strong> Discounted rate for cached input tokens (if available)</li>
                <li>• <strong>Exchange Rate:</strong> USD to selected currency conversion rate</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
