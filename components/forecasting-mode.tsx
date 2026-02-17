'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { findModelsWithinBudget, getAllModels, calculateCost, type ModelPricing } from '@/lib/pricing-data';

interface ForecastResult {
  model: ModelPricing;
  costPerCall: number;
  monthlyCost: number;
  callCount: number;
}

export function ForecastingMode() {
  const [monthlyBudget, setMonthlyBudget] = useState<number>(1000);
  const [avgInputTokens, setAvgInputTokens] = useState<number>(4000);
  const [avgOutputTokens, setAvgOutputTokens] = useState<number>(2000);
  const [estimatedCalls, setEstimatedCalls] = useState<number>(10000);
  const [results, setResults] = useState<ForecastResult[] | null>(null);

  const handleForecast = () => {
    const afffordableModels = findModelsWithinBudget(
      monthlyBudget,
      avgInputTokens,
      avgOutputTokens,
      estimatedCalls
    );

    const forecastResults: ForecastResult[] = afffordableModels.map((model) => {
      const costPerCall = calculateCost(model, avgInputTokens, avgOutputTokens);
      const monthlyCost = costPerCall.totalCost * estimatedCalls;

      return {
        model,
        costPerCall: costPerCall.totalCost,
        monthlyCost,
        callCount: estimatedCalls,
      };
    });

    // Show all models sorted by cost if none are within budget
    if (forecastResults.length === 0) {
      const allResults = getAllModels()
        .map((model) => {
          const costPerCall = calculateCost(model, avgInputTokens, avgOutputTokens);
          const monthlyCost = costPerCall.totalCost * estimatedCalls;
          return { model, costPerCall: costPerCall.totalCost, monthlyCost, callCount: estimatedCalls };
        })
        .sort((a, b) => a.monthlyCost - b.monthlyCost)
        .slice(0, 5);

      setResults(allResults);
    } else {
      setResults(forecastResults.sort((a, b) => a.monthlyCost - b.monthlyCost));
    }
  };

  const estimatedTotalCost = (avgInputTokens + avgOutputTokens) / 1_000_000 * 100 * estimatedCalls; // Rough estimate

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Budget Forecasting</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Plan your LLM spending and find models within your budget.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="monthlyBudget">Monthly Budget ($)</Label>
            <Input
              id="monthlyBudget"
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(Number(e.target.value))}
              min="0"
              step="10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedCalls">Estimated Monthly API Calls</Label>
            <Input
              id="estimatedCalls"
              type="number"
              value={estimatedCalls}
              onChange={(e) => setEstimatedCalls(Number(e.target.value))}
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avgInputTokens">Avg Input Tokens per Call</Label>
            <Input
              id="avgInputTokens"
              type="number"
              value={avgInputTokens}
              onChange={(e) => setAvgInputTokens(Number(e.target.value))}
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avgOutputTokens">Avg Output Tokens per Call</Label>
            <Input
              id="avgOutputTokens"
              type="number"
              onChange={(e) => setAvgOutputTokens(Number(e.target.value))}
              value={avgOutputTokens}
              min="0"
            />
          </div>
        </div>

        <Button onClick={handleForecast} className="w-full">
          📈 Generate Forecast
        </Button>
      </Card>

      {/* Results Section */}
      {results ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Your Budget</p>
              <p className="text-3xl font-bold">${monthlyBudget.toFixed(0)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Estimated Monthly Cost</p>
              <p className="text-3xl font-bold">
                ${(results[0]?.monthlyCost || 0).toFixed(2)}
              </p>
            </Card>
          </div>

          <div className="space-y-3">
            {results.map((result) => (
              <Card key={result.model.name} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{result.model.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.model.provider} • {result.model.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">${result.monthlyCost.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      ${result.costPerCall.toFixed(4)}/call
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 border border-dashed rounded-lg text-center">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-muted-foreground">
            Enter your parameters and click "Generate Forecast" to see models within your budget
          </p>
        </div>
      )}
    </div>
  );
}
