export interface ModelPricing {
  name: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
  cachedInputPrice?: number;
  description?: string;
}

export interface PricingResult {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

// Pricing data (Feb 2026)
export const MODELS: Record<string, ModelPricing[]> = {
  openai: [
    {
      name: 'GPT-4',
      provider: 'OpenAI',
      inputPrice: 30.0,
      outputPrice: 60.0,
      description: 'Most capable model',
    },
    {
      name: 'GPT-4 Turbo',
      provider: 'OpenAI',
      inputPrice: 10.0,
      outputPrice: 30.0,
      description: 'Faster and cheaper than GPT-4',
    },
    {
      name: 'GPT-4o',
      provider: 'OpenAI',
      inputPrice: 2.5,
      outputPrice: 10.0,
      cachedInputPrice: 1.25,
      description: 'Latest optimized model',
    },
    {
      name: 'GPT-4o mini',
      provider: 'OpenAI',
      inputPrice: 0.15,
      outputPrice: 0.6,
      description: 'Fast and affordable',
    },
    {
      name: 'GPT-3.5 Turbo',
      provider: 'OpenAI',
      inputPrice: 0.5,
      outputPrice: 1.5,
      description: 'Legacy fast model',
    },
  ],
  gemini: [
    {
      name: 'Gemini 3 Pro',
      provider: 'Google',
      inputPrice: 2.0,
      outputPrice: 12.0,
      description: 'Most capable Gemini model',
    },
    {
      name: 'Gemini 2.5 Pro',
      provider: 'Google',
      inputPrice: 1.25,
      outputPrice: 10.0,
      description: 'Advanced reasoning model',
    },
    {
      name: 'Gemini 3 Flash',
      provider: 'Google',
      inputPrice: 0.5,
      outputPrice: 3.0,
      description: 'Fast multimodal model',
    },
    {
      name: 'Gemini 2.5 Flash',
      provider: 'Google',
      inputPrice: 0.3,
      outputPrice: 2.5,
      description: 'Latest fast model',
    },
    {
      name: 'Gemini 2.5 Flash-Lite',
      provider: 'Google',
      inputPrice: 0.1,
      outputPrice: 0.4,
      description: 'Most cost-effective',
    },
  ],
  anthropic: [
    {
      name: 'Claude 3 Opus',
      provider: 'Anthropic',
      inputPrice: 15.0,
      outputPrice: 75.0,
      description: 'Most powerful Claude',
    },
    {
      name: 'Claude 3 Sonnet',
      provider: 'Anthropic',
      inputPrice: 3.0,
      outputPrice: 15.0,
      description: 'Balanced performance',
    },
    {
      name: 'Claude 3 Haiku',
      provider: 'Anthropic',
      inputPrice: 0.25,
      outputPrice: 1.25,
      description: 'Fast and compact',
    },
  ],
};

export function getAllModels(): ModelPricing[] {
  return Object.values(MODELS).flat();
}

export function calculateCost(
  model: ModelPricing,
  inputTokens: number,
  outputTokens: number,
  useCached: boolean = false
): PricingResult {
  const inputPrice = useCached && model.cachedInputPrice ? model.cachedInputPrice : model.inputPrice;
  const inputCost = (inputTokens / 1_000_000) * inputPrice;
  const outputCost = (outputTokens / 1_000_000) * model.outputPrice;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    inputTokens,
    outputTokens,
    model: model.name,
  };
}

export function compareModels(
  inputTokens: number,
  outputTokens: number
): PricingResult[] {
  return getAllModels().map((model) =>
    calculateCost(model, inputTokens, outputTokens)
  );
}

export function findCheapestModel(
  inputTokens: number,
  outputTokens: number
): ModelPricing | null {
  const results = compareModels(inputTokens, outputTokens);
  if (results.length === 0) return null;
  
  const cheapest = results.reduce((prev, current) =>
    prev.totalCost < current.totalCost ? prev : current
  );

  return getAllModels().find((m) => m.name === cheapest.model) || null;
}

export function findModelsWithinBudget(
  monthlyBudget: number,
  avgInputTokens: number,
  avgOutputTokens: number,
  estimatedCalls: number
): ModelPricing[] {
  const costPerCall = (avgInputTokens / 1_000_000 + avgOutputTokens / 1_000_000) * 100; // Rough estimate
  
  return getAllModels().filter((model) => {
    const result = calculateCost(model, avgInputTokens, avgOutputTokens);
    return result.totalCost * estimatedCalls <= monthlyBudget;
  });
}
