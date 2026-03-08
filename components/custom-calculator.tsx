'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateCustomCost, convertToINR, formatCurrency, type Currency } from '@/lib/pricing-data';
import { Calculator, ArrowRight, DollarSign } from 'lucide-react';

export function CustomCalculator() {
  const [inputPricePerMillion, setInputPricePerMillion] = useState<number>(1.0);
  const [outputPricePerMillion, setOutputPricePerMillion] = useState<number>(5.0);
  const [inputTokens, setInputTokens] = useState<number>(4000);
  const [outputTokens, setOutputTokens] = useState<number>(2000);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [result, setResult] = useState<ReturnType<typeof calculateCustomCost> | null>(null);

  const handleCalculate = () => {
    const pricing = calculateCustomCost(
      inputPricePerMillion,
      outputPricePerMillion,
      inputTokens,
      outputTokens
    );
    setResult(pricing);
  };

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="mb-6 flex items-center gap-2">
        <Calculator className="h-4.5 w-4.5 text-primary" size={18} />
        <div>
          <h2 className="text-base font-semibold text-foreground">Custom Price Calculator</h2>
          <p className="text-xs text-muted-foreground">
            Enter your own per-million token prices to calculate custom costs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-2">
        {/* ── Left: Inputs ── */}
        <div className="space-y-4 sm:space-y-5">
          {/* Price per million inputs */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Price per 1M Tokens (USD)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="customInputPrice" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Input Price ($/1M)
                </Label>
                <Input
                  id="customInputPrice"
                  type="number"
                  value={inputPricePerMillion}
                  onChange={(e) => setInputPricePerMillion(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="rounded-xl border-border/60 bg-card h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customOutputPrice" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Output Price ($/1M)
                </Label>
                <Input
                  id="customOutputPrice"
                  type="number"
                  value={outputPricePerMillion}
                  onChange={(e) => setOutputPricePerMillion(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="rounded-xl border-border/60 bg-card h-10"
                />
              </div>
            </div>
          </div>

          {/* Token inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="customInputTokens" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Input Tokens
              </Label>
              <Input
                id="customInputTokens"
                type="number"
                value={inputTokens}
                onChange={(e) => setInputTokens(Number(e.target.value))}
                min="0"
                className="rounded-xl border-border/60 bg-card h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customOutputTokens" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Output Tokens
              </Label>
              <Input
                id="customOutputTokens"
                type="number"
                value={outputTokens}
                onChange={(e) => setOutputTokens(Number(e.target.value))}
                min="0"
                className="rounded-xl border-border/60 bg-card h-10"
              />
            </div>
          </div>

          {/* Calculate button */}
          <Button
            onClick={handleCalculate}
            className="w-full rounded-xl h-10 gap-2 font-medium shadow-sm"
          >
            Calculate Cost
            <ArrowRight size={15} />
          </Button>
        </div>

        {/* ── Right: Results ── */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cost Breakdown
            </h2>
            {/* Currency Toggle */}
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-1">
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

          {result ? (
            <div className="space-y-3 animate-fade-in-up">
              {/* Cost cards */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <p className="text-xs text-muted-foreground">Input Cost</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {formatCurrency(currency === 'INR' ? convertToINR(result.inputCost) : result.inputCost, currency)}
                  </p>
                  {currency === 'INR' && (
                    <p className="text-[10px] text-muted-foreground">${result.inputCost.toFixed(4)}</p>
                  )}
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <p className="text-xs text-muted-foreground">Output Cost</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {formatCurrency(currency === 'INR' ? convertToINR(result.outputCost) : result.outputCost, currency)}
                  </p>
                  {currency === 'INR' && (
                    <p className="text-[10px] text-muted-foreground">${result.outputCost.toFixed(4)}</p>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-5">
                <p className="text-xs font-medium text-primary/70">Total Cost</p>
                <p className="mt-1 text-4xl font-bold text-primary">
                  {formatCurrency(currency === 'INR' ? convertToINR(result.totalCost) : result.totalCost, currency)}
                </p>
                {currency === 'INR' && (
                  <p className="text-xs text-muted-foreground">${result.totalCost.toFixed(4)} USD</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">per API request</p>
              </div>

              {/* Details */}
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Input Price</span>
                  <span className="font-medium text-foreground">${inputPricePerMillion.toFixed(2)}/1M tokens</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Output Price</span>
                  <span className="font-medium text-foreground">${outputPricePerMillion.toFixed(2)}/1M tokens</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Input Tokens</span>
                  <span className="font-medium text-foreground">{result.inputTokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Output Tokens</span>
                  <span className="font-medium text-foreground">{result.outputTokens.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8">
                <Calculator className="h-6 w-6 text-primary/60" />
              </div>
              <p className="text-sm font-medium text-foreground">Ready to calculate</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter your custom prices and token counts, then click Calculate Cost.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
