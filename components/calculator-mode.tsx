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
import { MODELS, calculateCost, type ModelPricing } from '@/lib/pricing-data';
import { Calculator, ArrowRight, Info } from 'lucide-react';

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
    setResult(null);
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);
    setSelectedModel(null);
    setResult(null);
  };

  const handleCalculate = () => {
    if (!selectedModel) return;
    const pricing = calculateCost(selectedModel, inputTokens, outputTokens, useCached);
    setResult(pricing);
  };

  const providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'claude', label: 'Claude' },
  ];

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="mb-6 flex items-center gap-2">
        <Calculator className="h-4.5 w-4.5 text-primary" size={18} />
        <div>
          <h2 className="text-base font-semibold text-foreground">Cost Calculator</h2>
          <p className="text-xs text-muted-foreground">
            Select a model and enter your token counts to get an instant cost estimate.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ── Left: Inputs ── */}
        <div className="space-y-5">
          {/* Provider */}
          <div className="space-y-1.5">
            <Label htmlFor="provider" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Provider
            </Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger id="provider" className="rounded-xl border-border/60 bg-card h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {providers.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <Label htmlFor="model" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Model
            </Label>
            <Select value={selectedModel?.name || ''} onValueChange={handleModelChange}>
              <SelectTrigger id="model" className="rounded-xl border-border/60 bg-card h-10">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {models.map((m) => (
                  <SelectItem key={m.name} value={m.name}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedModel && (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info size={11} className="mt-0.5 flex-shrink-0" />
                {selectedModel.description}
              </p>
            )}
          </div>

          {/* Token inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inputTokens" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Input Tokens
              </Label>
              <Input
                id="inputTokens"
                type="number"
                value={inputTokens}
                onChange={(e) => setInputTokens(Number(e.target.value))}
                min="0"
                className="rounded-xl border-border/60 bg-card h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="outputTokens" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Output Tokens
              </Label>
              <Input
                id="outputTokens"
                type="number"
                value={outputTokens}
                onChange={(e) => setOutputTokens(Number(e.target.value))}
                min="0"
                className="rounded-xl border-border/60 bg-card h-10"
              />
            </div>
          </div>

          {/* Cached tokens toggle */}
          {selectedModel?.cachedInputPrice && (
            <label
              htmlFor="useCached"
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
            >
              <input
                type="checkbox"
                id="useCached"
                checked={useCached}
                onChange={(e) => setUseCached(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Use cached input tokens</p>
                <p className="text-xs text-muted-foreground">Applies 50% discount on input costs</p>
              </div>
            </label>
          )}

          {/* Calculate button */}
          <Button
            onClick={handleCalculate}
            disabled={!selectedModel}
            className="w-full rounded-xl h-10 gap-2 font-medium shadow-sm"
          >
            Calculate Cost
            <ArrowRight size={15} />
          </Button>
        </div>

        {/* ── Right: Results ── */}
        <div>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Cost Breakdown
          </h2>

          {result ? (
            <div className="space-y-3 animate-fade-in-up">
              {/* Cost cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <p className="text-xs text-muted-foreground">Input Cost</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    ${result.inputCost.toFixed(4)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <p className="text-xs text-muted-foreground">Output Cost</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    ${result.outputCost.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Total */}
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-5">
                <p className="text-xs font-medium text-primary/70">Total Cost</p>
                <p className="mt-1 text-4xl font-bold text-primary">
                  ${result.totalCost.toFixed(4)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">per API request</p>
              </div>

              {/* Details */}
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-1.5">
                {[
                  { label: 'Model', value: result.model },
                  { label: 'Input Tokens', value: result.inputTokens.toLocaleString() },
                  { label: 'Output Tokens', value: result.outputTokens.toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8">
                <Calculator className="h-6 w-6 text-primary/60" />
              </div>
              <p className="text-sm font-medium text-foreground">Ready to calculate</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Select a model and enter token counts, then click Calculate Cost.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
