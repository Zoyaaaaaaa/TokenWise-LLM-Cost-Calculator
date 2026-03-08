'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { compareModels, convertToINR, formatCurrency, formatCurrencyCompact, type PricingResult, type Currency } from '@/lib/pricing-data';
import { BarChart3, ArrowRight, Trophy, TrendingDown } from 'lucide-react';

export function ComparisonMode() {
  const [inputTokens, setInputTokens] = useState<number>(4000);
  const [outputTokens, setOutputTokens] = useState<number>(2000);
  const [results, setResults] = useState<PricingResult[] | null>(null);
  const [currency, setCurrency] = useState<Currency>('USD');

  const handleCompare = () => {
    const comparisons = compareModels(inputTokens, outputTokens);
    const sorted = comparisons.sort((a, b) => a.totalCost - b.totalCost);
    setResults(sorted);
  };

  const maxCost = results ? Math.max(...results.map((r) => r.totalCost)) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4.5 w-4.5 text-primary flex-shrink-0" size={18} />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Model Comparison</h2>
            <p className="text-xs text-muted-foreground">
              Compare costs across all available models for a given token count.
            </p>
          </div>
        </div>
        {/* Currency Toggle */}
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-1 self-start sm:self-auto">
          <button
            onClick={() => setCurrency('USD')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
              currency === 'USD'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            USD ($)
          </button>
          <button
            onClick={() => setCurrency('INR')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
              currency === 'INR'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            INR (₹)
          </button>
        </div>
      </div>

      {/* Input row */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
        <div className="space-y-1.5 flex-1 min-w-0 sm:min-w-[140px]">
          <Label htmlFor="compInputTokens" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Input Tokens
          </Label>
          <Input
            id="compInputTokens"
            type="number"
            value={inputTokens}
            onChange={(e) => setInputTokens(Number(e.target.value))}
            min="0"
            className="rounded-xl border-border/60 bg-card h-10 w-full"
          />
        </div>
        <div className="space-y-1.5 flex-1 min-w-0 sm:min-w-[140px]">
          <Label htmlFor="compOutputTokens" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Output Tokens
          </Label>
          <Input
            id="compOutputTokens"
            type="number"
            value={outputTokens}
            onChange={(e) => setOutputTokens(Number(e.target.value))}
            min="0"
            className="rounded-xl border-border/60 bg-card h-10 w-full"
          />
        </div>
        <Button
          onClick={handleCompare}
          className="rounded-xl h-10 gap-2 font-medium shadow-sm flex-shrink-0 w-full sm:w-auto"
        >
          Compare All Models
          <ArrowRight size={15} />
        </Button>
      </div>

      {/* Results */}
      {results ? (
        <div className="space-y-2.5 animate-fade-in-up">
          {results.map((result, idx) => {
            const barWidth = maxCost > 0 ? (result.totalCost / maxCost) * 100 : 0;
            const isCheapest = idx === 0;
            const isMostExpensive = idx === results.length - 1;

            return (
              <div
                key={result.model}
                className={`group relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-sm ${isCheapest
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-border/60 bg-card hover:border-border'
                  }`}
              >
                {/* Progress bar background */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all ${isCheapest ? 'bg-emerald-100/60' : 'bg-muted/40'
                    }`}
                  style={{ width: `${barWidth}%` }}
                />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank */}
                    <span
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${isCheapest
                          ? 'bg-emerald-500 text-white'
                          : 'bg-muted text-muted-foreground'
                        }`}
                    >
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {result.model}
                        </span>
                        {isCheapest && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <Trophy size={9} />
                            Cheapest
                          </span>
                        )}
                        {isMostExpensive && results.length > 2 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                            <TrendingDown size={9} />
                            Most Expensive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Input: {formatCurrency(currency === 'INR' ? convertToINR(result.inputCost) : result.inputCost, currency)} · 
                        Output: {formatCurrency(currency === 'INR' ? convertToINR(result.outputCost) : result.outputCost, currency)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-right flex-shrink-0 pl-9 sm:pl-0">
                    <p className={`text-lg sm:text-xl font-bold ${isCheapest ? 'text-emerald-600' : 'text-foreground'}`}>
                      {formatCurrency(currency === 'INR' ? convertToINR(result.totalCost) : result.totalCost, currency)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">per request</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-14 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8">
            <BarChart3 className="h-6 w-6 text-primary/60" />
          </div>
          <p className="text-sm font-medium text-foreground">No comparison yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter your token counts and click Compare All Models to see a ranked list.
          </p>
        </div>
      )}
    </div>
  );
}
