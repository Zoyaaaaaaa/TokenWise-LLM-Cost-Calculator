'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { MODELS, type ModelPricing } from '@/lib/pricing-data';

interface VerificationResult {
  verified: boolean;
  current_input_price: number | null;
  current_output_price: number | null;
  status: 'verified' | 'outdated' | 'unknown' | 'error';
  message: string;
  source_url: string;
  last_updated: string | null;
}

interface PricingVerificationProps {
  model: ModelPricing;
}

export function PricingVerification({ model }: PricingVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyPricing = async () => {
    setIsVerifying(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:8000/api/verify-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_name: model.name,
          provider: model.provider,
          input_price: model.inputPrice,
          output_price: model.outputPrice,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify pricing');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;
    
    switch (result.status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'outdated':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    if (!result) return '';
    
    switch (result.status) {
      case 'verified':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'outdated':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={verifyPricing}
        disabled={isVerifying}
        className="w-full sm:w-auto text-xs h-8 gap-2"
      >
        {isVerifying ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <ExternalLink className="h-3.5 w-3.5" />
            Verify Pricing Online
          </>
        )}
      </Button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
          {error}
        </div>
      )}

      {result && (
        <div className={`rounded-lg border p-3 text-xs space-y-2 ${getStatusColor()}`}>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">{result.message}</span>
          </div>
          
          {(result.current_input_price !== null || result.current_output_price !== null) && (
            <div className="space-y-1 pl-6">
              {result.current_input_price !== null && (
                <div className="flex justify-between">
                  <span>Current Input:</span>
                  <span className="font-medium">${result.current_input_price.toFixed(4)}/1M tokens</span>
                </div>
              )}
              {result.current_output_price !== null && (
                <div className="flex justify-between">
                  <span>Current Output:</span>
                  <span className="font-medium">${result.current_output_price.toFixed(4)}/1M tokens</span>
                </div>
              )}
            </div>
          )}
          
          {result.source_url && (
            <div className="pl-6 pt-1">
              <a
                href={result.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline hover:no-underline"
              >
                View Source
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          
          {result.last_updated && (
            <div className="pl-6 text-[10px] opacity-70">
              Checked: {new Date(result.last_updated).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PricingVerificationPanel() {
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const allModels = Object.values(MODELS).flat();
  const providers = [...new Set(allModels.map(m => m.provider.toLowerCase()))];
  
  const models = allModels.filter(m => m.provider.toLowerCase() === selectedProvider);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Select Provider
        </label>
        <div className="flex flex-wrap gap-2">
          {providers.map(provider => (
            <button
              key={provider}
              onClick={() => setSelectedProvider(provider)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedProvider === provider
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {models.map(model => (
          <div
            key={model.name}
            className="rounded-xl border border-border/60 bg-card p-4 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-semibold text-sm">{model.name}</h4>
                <p className="text-xs text-muted-foreground">
                  Input: ${model.inputPrice} · Output: ${model.outputPrice} / 1M tokens
                </p>
              </div>
            </div>
            <PricingVerification model={model} />
          </div>
        ))}
      </div>
    </div>
  );
}
