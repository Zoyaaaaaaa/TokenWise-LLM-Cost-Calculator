'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { compareModels, type PricingResult } from '@/lib/pricing-data';

export function ComparisonMode() {
  const [inputTokens, setInputTokens] = useState<number>(4000);
  const [outputTokens, setOutputTokens] = useState<number>(2000);
  const [results, setResults] = useState<PricingResult[] | null>(null);

  const handleCompare = () => {
    const comparisons = compareModels(inputTokens, outputTokens);
    const sorted = comparisons.sort((a, b) => a.totalCost - b.totalCost);
    setResults(sorted);
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Model Comparison</h2>
        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="compInputTokens">Input Tokens</Label>
            <Input
              id="compInputTokens"
              type="number"
              value={inputTokens}
              onChange={(e) => setInputTokens(Number(e.target.value))}
              min="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="compOutputTokens">Output Tokens</Label>
            <Input
              id="compOutputTokens"
              type="number"
              value={outputTokens}
              onChange={(e) => setOutputTokens(Number(e.target.value))}
              min="0"
            />
          </div>
          <Button onClick={handleCompare} className="w-full">
            ⚖️ Compare All Models
          </Button>
        </div>
      </Card>

      {/* Results Section */}
      {results ? (
        <div className="space-y-3">
          {results.map((result, idx) => (
            <Card key={result.model} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{result.model}</span>
                    {idx === 0 && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">💰 Cheapest</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Input: ${result.inputCost.toFixed(4)} • Output: ${result.outputCost.toFixed(4)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">${result.totalCost.toFixed(4)}</p>
                  <p className="text-xs text-muted-foreground">per request</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-12 border border-dashed rounded-lg text-center">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-muted-foreground">
            Click "Compare All Models" to see a comprehensive cost comparison
          </p>
        </div>
      )}
    </div>
  );
}
