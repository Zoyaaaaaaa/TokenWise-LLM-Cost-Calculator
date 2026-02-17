'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { MODELS, calculateCost, type ModelPricing } from '@/lib/pricing-data';

export function CalculatorMode() {
  const [provider, setProvider] = useState<string>('openai');
  const [selectedModel, setSelectedModel] = useState<ModelPricing | null>(null);
  const [inputTokens, setInputTokens] = useState<number>(4000);
  const [outputTokens, setOutputTokens] = useState<number>(2000);
  const [useCached, setUseCached] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);

  const models = MODELS[provider] || [];

  const handleModelChange = (modelName: string) => {
    const model = models.find((m) => m.name === modelName);
    setSelectedModel(model || null);
  };

  const handleCalculate = () => {
    if (!selectedModel) {
      alert('Please select a model');
      return;
    }

    const pricing = calculateCost(selectedModel, inputTokens, outputTokens, useCached);
    setResult(pricing);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left Column: Inputs */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Token Configuration</h2>

          <div className="space-y-4">
            {/* Provider Select */}
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model Select */}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={selectedModel?.name || ''} onValueChange={handleModelChange}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.name} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedModel && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedModel.description}
                </p>
              )}
            </div>

            {/* Input Tokens */}
            <div className="space-y-2">
              <Label htmlFor="inputTokens">
                Input Tokens <span className="text-muted-foreground">ℹ️</span>
              </Label>
              <Input
                id="inputTokens"
                type="number"
                value={inputTokens}
                onChange={(e) => setInputTokens(Number(e.target.value))}
                min="0"
              />
            </div>

            {/* Output Tokens */}
            <div className="space-y-2">
              <Label htmlFor="outputTokens">
                Output Tokens <span className="text-muted-foreground">ℹ️</span>
              </Label>
              <Input
                id="outputTokens"
                type="number"
                value={outputTokens}
                onChange={(e) => setOutputTokens(Number(e.target.value))}
                min="0"
              />
            </div>

            {/* Use Cached */}
            {selectedModel?.cachedInputPrice && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useCached"
                  checked={useCached}
                  onChange={(e) => setUseCached(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="useCached" className="text-sm cursor-pointer">
                  Use cached input tokens (50% discount)
                </Label>
              </div>
            )}

            {/* Calculate Button */}
            <Button onClick={handleCalculate} className="w-full mt-4">
              🚀 Calculate Cost
            </Button>
          </div>
        </div>
      </div>

      {/* Right Column: Results */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Cost Breakdown</h2>
        {result ? (
          <Card className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">Input Cost</p>
                <p className="text-2xl font-bold">${result.inputCost.toFixed(4)}</p>
              </div>
              <div className="p-4 bg-background rounded-lg">
                <p className="text-sm text-muted-foreground">Output Cost</p>
                <p className="text-2xl font-bold">${result.outputCost.toFixed(4)}</p>
              </div>
            </div>

            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-3xl font-bold text-primary">${result.totalCost.toFixed(4)}</p>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>Model: <strong>{result.model}</strong></p>
              <p>Input Tokens: <strong>{result.inputTokens.toLocaleString()}</strong></p>
              <p>Output Tokens: <strong>{result.outputTokens.toLocaleString()}</strong></p>
            </div>
          </Card>
        ) : (
          <div className="p-8 border border-dashed rounded-lg text-center">
            <p className="text-4xl mb-2">💡</p>
            <p className="text-muted-foreground">
              Enter your token counts and click "Calculate Cost" to see pricing breakdown
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
