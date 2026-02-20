'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalculatorMode } from '@/components/calculator-mode';
import { ComparisonMode } from '@/components/comparison-mode';
import { ForecastingMode } from '@/components/forecasting-mode';
import { AssistantMode } from '@/components/assistant-mode';
import { getAllModels, calculateCost } from '@/lib/pricing-data';
import {
  Calculator,
  BarChart3,
  TrendingUp,
  Bot,
  Zap,
  DollarSign,
  Layers,
  ExternalLink,
  Scissors,
  Target,
  Archive,
  Package,
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('calculator');

  const allModels = getAllModels();
  const cheapestModel = allModels.reduce((prev, current) => {
    const prevCost = calculateCost(prev, 4000, 2000).totalCost;
    const currentCost = calculateCost(current, 4000, 2000).totalCost;
    return prevCost < currentCost ? prev : current;
  });

  const tabs = [
    { value: 'calculator', label: 'Calculator', icon: Calculator },
    { value: 'comparison', label: 'Comparison', icon: BarChart3 },
    { value: 'forecasting', label: 'Forecasting', icon: TrendingUp },
    { value: 'assistant', label: 'AI Assistant', icon: Bot },
  ];

  const stats = [
    {
      icon: Layers,
      label: 'Models Available',
      value: allModels.length.toString(),
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      icon: DollarSign,
      label: 'Avg. Savings Possible',
      value: '43%',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      icon: Zap,
      label: 'Most Cost-Effective',
      value: cheapestModel.name,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
  ];

  const tips = [
    {
      icon: Scissors,
      title: 'Reduce Prompt Length',
      desc: 'Use concise instructions and avoid redundant context to cut input token costs.',
    },
    {
      icon: Target,
      title: 'Use Appropriate Models',
      desc: "Don't use expensive frontier models for simple classification or extraction tasks.",
    },
    {
      icon: Archive,
      title: 'Implement Caching',
      desc: 'Cache common prompts to avoid redundant API calls and save up to 50%.',
    },
    {
      icon: Package,
      title: 'Batch Requests',
      desc: 'Use batch APIs where available for significant per-request discounts.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle top gradient accent */}
      <div
        className="fixed top-0 left-0 right-0 h-px z-50"
        style={{ background: 'linear-gradient(90deg, transparent, oklch(0.55 0.18 265), transparent)' }}
      />

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Calculator className="h-4.5 w-4.5" size={18} />
              </div>
              <div>
                <span className="text-base font-semibold tracking-tight text-foreground">
                  LLM Pricing
                </span>
                <span className="ml-1 text-base font-semibold tracking-tight text-primary">
                  Calculator
                </span>
              </div>
            </div>

            {/* Live badge */}
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
              Live Pricing · 2026
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Hero ── */}
        <section className="py-14 text-center animate-fade-in-up">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
              <Zap size={12} />
              Real-time pricing across all major providers
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Compare LLM Costs
              <span className="block text-primary">Instantly</span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Calculate, compare, and forecast your AI API spending across OpenAI, Google Gemini,
              and Anthropic — all in one place.
            </p>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <p className={`mt-0.5 truncate text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Main Tabs ── */}
        <main className="mb-16 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Tab List */}
            <TabsList className="inline-flex h-auto gap-1 rounded-2xl border border-border/60 bg-muted/50 p-1.5">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all
                    data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm
                    data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                >
                  <tab.icon size={15} />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab Content */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <TabsContent value="calculator" className="mt-0 animate-fade-in">
                <CalculatorMode />
              </TabsContent>
              <TabsContent value="comparison" className="mt-0 animate-fade-in">
                <ComparisonMode />
              </TabsContent>
              <TabsContent value="forecasting" className="mt-0 animate-fade-in">
                <ForecastingMode />
              </TabsContent>
              <TabsContent value="assistant" className="mt-0 animate-fade-in">
                <AssistantMode />
              </TabsContent>
            </div>
          </Tabs>
        </main>

        {/* ── Tips ── */}
        <section className="mb-16 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Token Optimization Tips</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Simple strategies to reduce your LLM API costs significantly.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tips.map((tip, idx) => (
              <div
                key={idx}
                className="group rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 transition-colors group-hover:bg-primary/12">
                  <tip.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-foreground">{tip.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{tip.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Calculator size={14} />
                </div>
                <span className="text-sm font-semibold text-foreground">LLM Pricing Calculator</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The most comprehensive tool for comparing and forecasting LLM API costs across all major providers.
              </p>
            </div>

            {/* Resources */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Official Pricing Pages</h3>
              <ul className="space-y-2">
                {[
                  { label: 'OpenAI Pricing', href: 'https://openai.com/pricing' },
                  { label: 'Google Gemini Pricing', href: 'https://cloud.google.com/vertex-ai/generative-ai/pricing' },
                  { label: 'Anthropic Pricing', href: 'https://www.anthropic.com/pricing' },
                ].map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      <ExternalLink size={11} />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing Notes */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Pricing Notes</h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>· Context window size affects pricing</li>
                <li>· Cached tokens receive up to 50% discount</li>
                <li>· Reasoning tokens billed at input rates</li>
                <li>· Batch APIs offer additional discounts</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Data updated: <strong className="text-foreground">February 2026</strong>
              </p>
            </div>
          </div>

          <div className="border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              © 2026 LLM Pricing Calculator. Built with Next.js & React.
            </p>
            <p className="text-xs text-muted-foreground">
              Always verify pricing with official provider documentation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
