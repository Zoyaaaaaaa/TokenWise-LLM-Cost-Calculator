'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  findModelsWithinBudget,
  getAllModels,
  calculateCost,
  convertToINR,
  formatCurrencyCompact,
  type ModelPricing,
  type Currency,
} from '@/lib/pricing-data';
import { TrendingUp, ArrowRight, CheckCircle2, XCircle, Wallet } from 'lucide-react';

interface ForecastResult {
  model: ModelPricing;
  costPerCall: number;
  monthlyCost: number;
  callCount: number;
  withinBudget: boolean;
}

export function ForecastingMode() {
  const [monthlyBudget, setMonthlyBudget] = useState<number>(1000);
  const [avgInputTokens, setAvgInputTokens] = useState<number>(4000);
  const [avgOutputTokens, setAvgOutputTokens] = useState<number>(2000);
  const [estimatedCalls, setEstimatedCalls] = useState<number>(10000);
  const [results, setResults] = useState<ForecastResult[] | null>(null);
  const [currency, setCurrency] = useState<Currency>('USD');

  const handleForecast = () => {
    const affordableModels = findModelsWithinBudget(
      monthlyBudget,
      avgInputTokens,
      avgOutputTokens,
      estimatedCalls
    );

    const affordableNames = new Set(affordableModels.map((m) => m.name));

    const allResults: ForecastResult[] = getAllModels()
      .map((model) => {
        const costPerCall = calculateCost(model, avgInputTokens, avgOutputTokens);
        const monthlyCost = costPerCall.totalCost * estimatedCalls;
        return {
          model,
          costPerCall: costPerCall.totalCost,
          monthlyCost,
          callCount: estimatedCalls,
          withinBudget: affordableNames.has(model.name),
        };
      })
      .sort((a, b) => a.monthlyCost - b.monthlyCost);

    setResults(allResults);
  };

  const withinBudgetCount = results?.filter((r) => r.withinBudget).length ?? 0;
  const cheapestResult = results?.[0];

  const fields = [
    {
      id: 'monthlyBudget',
      label: `Monthly Budget (${currency === 'INR' ? '₹' : '$'})`,
      value: monthlyBudget,
      setter: setMonthlyBudget,
      step: 10,
    },
    {
      id: 'estimatedCalls',
      label: 'Monthly API Calls',
      value: estimatedCalls,
      setter: setEstimatedCalls,
      step: 100,
    },
    {
      id: 'avgInputTokens',
      label: 'Avg Input Tokens / Call',
      value: avgInputTokens,
      setter: setAvgInputTokens,
      step: 100,
    },
    {
      id: 'avgOutputTokens',
      label: 'Avg Output Tokens / Call',
      value: avgOutputTokens,
      setter: setAvgOutputTokens,
      step: 100,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4.5 w-4.5 text-primary flex-shrink-0" size={18} />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Budget Forecasting</h2>
            <p className="text-xs text-muted-foreground">
              Plan your LLM spending and discover which models fit within your budget.
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

      {/* Input grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label
              htmlFor={field.id}
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              {field.label}
            </Label>
            <Input
              id={field.id}
              type="number"
              value={field.value}
              onChange={(e) => field.setter(Number(e.target.value))}
              min="0"
              step={field.step}
              className="rounded-xl border-border/60 bg-card h-10"
            />
          </div>
        ))}
      </div>

      <Button onClick={handleForecast} className="w-full rounded-xl h-10 gap-2 font-medium shadow-sm">
        Generate Forecast
        <ArrowRight size={15} />
      </Button>

      {/* Results */}
      {results && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={14} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Your Budget</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrencyCompact(currency === 'INR' ? convertToINR(monthlyBudget) : monthlyBudget, currency)}
              </p>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <p className="text-xs text-emerald-700">Models Within Budget</p>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{withinBudgetCount}</p>
              <p className="text-xs text-emerald-600">of {results.length} models</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Cheapest Option</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrencyCompact(currency === 'INR' ? convertToINR(cheapestResult?.monthlyCost || 0) : (cheapestResult?.monthlyCost || 0), currency)}
              </p>
              <p className="text-xs text-muted-foreground truncate">{cheapestResult?.model.name}</p>
            </div>
          </div>

          {/* Model list */}
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.model.name}
                className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border p-3 sm:p-4 transition-all gap-2 sm:gap-0 ${result.withinBudget
                    ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                    : 'border-border/60 bg-card hover:border-border'
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {result.withinBudget ? (
                    <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle size={16} className="flex-shrink-0 text-muted-foreground/40" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {result.model.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {result.model.provider} · {formatCurrencyCompact(currency === 'INR' ? convertToINR(result.costPerCall) : result.costPerCall, currency)}/call
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0 sm:ml-4 pl-7 sm:pl-0">
                  <p
                    className={`text-base sm:text-lg font-bold ${result.withinBudget ? 'text-emerald-600' : 'text-foreground'
                      }`}
                  >
                    {formatCurrencyCompact(currency === 'INR' ? convertToINR(result.monthlyCost) : result.monthlyCost, currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">/ month</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!results && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-14 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8">
            <TrendingUp className="h-6 w-6 text-primary/60" />
          </div>
          <p className="text-sm font-medium text-foreground">No forecast yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter your parameters above and click Generate Forecast.
          </p>
        </div>
      )}
    </div>
  );
}
