export interface ModelPricing {
  name: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
  cachedInputPrice?: number;
  description?: string;
  pricingType?: 'standard' | 'batch';
  batchInputPrice?: number;
  batchOutputPrice?: number;
}

export interface CustomPricingInput {
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  name: string;
}

export interface PricingResult {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

// Currency conversion utilities
export const USD_TO_INR_RATE = 91.08; // Approximate exchange rate (1 USD = 91.08 INR)

export type Currency = 'USD' | 'INR';

export function convertToINR(usdAmount: number): number {
  return usdAmount * USD_TO_INR_RATE;
}

export function formatCurrency(amount: number, currency: Currency): string {
  if (currency === 'INR') {
    return `₹${amount.toFixed(2)}`;
  }
  return `$${amount.toFixed(4)}`;
}

export function formatCurrencyCompact(amount: number, currency: Currency): string {
  if (currency === 'INR') {
    return `₹${amount.toFixed(2)}`;
  }
  return `$${amount.toFixed(2)}`;
}

// Pricing data (Feb 2026 – documented public API pricing per 1M tokens)

export const MODELS: Record<string, ModelPricing[]> = {

  openai: [
    {
      name: "GPT-5.2",
      provider: "OpenAI",
      inputPrice: 1.75,
      outputPrice: 14.0,
      cachedInputPrice: 0.175,
      description: "Latest flagship reasoning + coding model from OpenAI",
    },
    {
      name: "GPT-5.1",
      provider: "OpenAI",
      inputPrice: 1.25,
      outputPrice: 10.0,
      cachedInputPrice: 0.125,
      description: "Previous generation flagship model",
    },
    {
      name: "GPT-5 (legacy)",
      provider: "OpenAI",
      inputPrice: 1.25,
      outputPrice: 10.0,
      cachedInputPrice: 0.125,
      description: "Earlier flagship model (still supported)",
    },
    {
      name: "GPT-5 mini",
      provider: "OpenAI",
      inputPrice: 0.25,
      outputPrice: 2.0,
      cachedInputPrice: 0.025,
      description: "Affordable flagship-class alternative",
    },
    {
      name: "GPT-5 nano",
      provider: "OpenAI",
      inputPrice: 0.05,
      outputPrice: 0.40,
      cachedInputPrice: 0.005,
      description: "Lowest-cost flagship-class alternative",
    },
    {
      name: "GPT-4o",
      provider: "OpenAI",
      inputPrice: 2.50,
      outputPrice: 10.0,
      cachedInputPrice: 1.25,
      description: "OpenAI multimodal model",
    },
    {
      name: "GPT-4o mini",
      provider: "OpenAI",
      inputPrice: 0.15,
      outputPrice: 0.60,
      cachedInputPrice: 0.075,
      description: "Fast, low-cost OpenAI model",
    },
  ],

  anthropic: [
    {
      name: "Claude Sonnet 4.6",
      provider: "Anthropic",
      inputPrice: 3.0,
      outputPrice: 15.0,
      description: "Latest workhorse Claude model with strong reasoning and coding capabilities",
    },
    {
      name: "Claude Opus 4.6",
      provider: "Anthropic",
      inputPrice: 5.0,
      outputPrice: 25.0,
      description: "Top-tier powerful Claude model",
    },
    {
      name: "Claude Haiku 4.5",
      provider: "Anthropic",
      inputPrice: 1.0,
      outputPrice: 5.0,
      description: "Fast and cost-efficient model in the Claude family",
    },
  ],

  google: [
    {
      name: "Gemini 2.5 Pro",
      provider: "Google",
      inputPrice: 1.25,
      outputPrice: 10.0,
      batchInputPrice: 0.625,
      batchOutputPrice: 5.0,
      pricingType: 'standard',
      description: "Advanced Google Gemini reasoning model, 1M+ context (Standard API)",
    },
    {
      name: "Gemini 2.5 Pro (Batch)",
      provider: "Google",
      inputPrice: 0.625,
      outputPrice: 5.0,
      pricingType: 'batch',
      description: "Batch API pricing - 50% discount, async processing",
    },
    {
      name: "Gemini 2.5 Flash",
      provider: "Google",
      inputPrice: 0.30,
      outputPrice: 2.50,
      batchInputPrice: 0.15,
      batchOutputPrice: 1.25,
      pricingType: 'standard',
      description: "Balanced cost and performance Gemini model (Standard API)",
    },
    {
      name: "Gemini 2.5 Flash (Batch)",
      provider: "Google",
      inputPrice: 0.15,
      outputPrice: 1.25,
      pricingType: 'batch',
      description: "Batch API pricing - 50% discount, async processing",
    },
    {
      name: "Gemini 2.5 Flash-Lite",
      provider: "Google",
      inputPrice: 0.10,
      outputPrice: 0.40,
      batchInputPrice: 0.05,
      batchOutputPrice: 0.20,
      pricingType: 'standard',
      description: "Most cost-effective Gemini Flash variant (Standard API)",
    },
    {
      name: "Gemini 2.5 Flash-Lite (Batch)",
      provider: "Google",
      inputPrice: 0.05,
      outputPrice: 0.20,
      pricingType: 'batch',
      description: "Batch API pricing - 50% discount, async processing",
    },
    {
      name: "Gemini 1.5 Flash",
      provider: "Google",
      inputPrice: 0.075,
      outputPrice: 0.30,
      batchInputPrice: 0.0375,
      batchOutputPrice: 0.15,
      pricingType: 'standard',
      description: "Very low-cost high-efficiency model (Standard API)",
    },
    {
      name: "Gemini 1.5 Flash (Batch)",
      provider: "Google",
      inputPrice: 0.0375,
      outputPrice: 0.15,
      pricingType: 'batch',
      description: "Batch API pricing - 50% discount, async processing",
    },
    {
      name: "Gemini 1.5 Flash-8B",
      provider: "Google",
      inputPrice: 0.0375,
      outputPrice: 0.15,
      batchInputPrice: 0.01875,
      batchOutputPrice: 0.075,
      pricingType: 'standard',
      description: "Ultra-low cost Flash-8B tier (Standard API)",
    },
    {
      name: "Gemini 1.5 Flash-8B (Batch)",
      provider: "Google",
      inputPrice: 0.01875,
      outputPrice: 0.075,
      pricingType: 'batch',
      description: "Batch API pricing - 50% discount, async processing",
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

// Custom pricing calculation for user-defined prices
export function calculateCustomCost(
  inputPricePerMillion: number,
  outputPricePerMillion: number,
  inputTokens: number,
  outputTokens: number
): PricingResult {
  const inputCost = (inputTokens / 1_000_000) * inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * outputPricePerMillion;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    inputTokens,
    outputTokens,
    model: 'Custom Pricing',
  };
}
