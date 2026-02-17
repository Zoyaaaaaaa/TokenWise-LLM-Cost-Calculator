'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { CalculatorMode } from '@/components/calculator-mode';
import { ComparisonMode } from '@/components/comparison-mode';
import { ForecastingMode } from '@/components/forecasting-mode';
import { AssistantMode } from '@/components/assistant-mode';
import { getAllModels, calculateCost } from '@/lib/pricing-data';

export default function Home() {
  const [activeTab, setActiveTab] = useState('calculator');

  const allModels = getAllModels();
  const cheapestModel = allModels.reduce((prev, current) => {
    const prevCost = calculateCost(prev, 4000, 2000).totalCost;
    const currentCost = calculateCost(current, 4000, 2000).totalCost;
    return prevCost < currentCost ? prev : current;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/10">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(90deg, transparent 24%, rgba(255,255,255,.05) 25%, rgba(255,255,255,.05) 26%, transparent 27%, transparent 74%, rgba(255,255,255,.05) 75%, rgba(255,255,255,.05) 76%, transparent 77%, transparent),
              linear-gradient(0deg, transparent 24%, rgba(255,255,255,.05) 25%, rgba(255,255,255,.05) 26%, transparent 27%, transparent 74%, rgba(255,255,255,.05) 75%, rgba(255,255,255,.05) 76%, transparent 77%, transparent)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b backdrop-blur-sm bg-background/50">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🤖</span>
                  <div>
                    <h1 className="text-2xl font-bold">LLM Pricing Calculator</h1>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>Live Pricing • 2026</span>
              </div>
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <div className="flex items-center gap-4">
                <div className="text-4xl">📊</div>
                <div>
                  <p className="text-sm text-muted-foreground">Models Available</p>
                  <p className="text-3xl font-bold">{allModels.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-500/5 to-transparent border-green-500/20">
              <div className="flex items-center gap-4">
                <div className="text-4xl">💰</div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Savings Possible</p>
                  <p className="text-3xl font-bold">43%</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
              <div className="flex items-center gap-4">
                <div className="text-4xl">⚡</div>
                <div>
                  <p className="text-sm text-muted-foreground">Most Cost-Effective</p>
                  <p className="text-3xl font-bold text-blue-600">{cheapestModel.name}</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-fit">
              <TabsTrigger value="calculator">🧮 Calculator</TabsTrigger>
              <TabsTrigger value="comparison">⚖️ Comparison</TabsTrigger>
              <TabsTrigger value="forecasting">📈 Forecasting</TabsTrigger>
              <TabsTrigger value="assistant">🤖 Assistant</TabsTrigger>
            </TabsList>

            <TabsContent value="calculator" className="space-y-4">
              <CalculatorMode />
            </TabsContent>

            <TabsContent value="comparison" className="space-y-4">
              <ComparisonMode />
            </TabsContent>

            <TabsContent value="forecasting" className="space-y-4">
              <ForecastingMode />
            </TabsContent>

            <TabsContent value="assistant" className="space-y-4">
              <AssistantMode />
            </TabsContent>
          </Tabs>
        </main>

        {/* Tips Section */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-8">💡 Token Optimization Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                icon: '✂️',
                title: 'Reduce Prompt Length',
                desc: 'Use concise instructions and avoid redundant context.',
              },
              {
                icon: '🎯',
                title: 'Use Appropriate Models',
                desc: "Don't use expensive models for simple tasks.",
              },
              {
                icon: '💾',
                title: 'Implement Caching',
                desc: 'Cache common prompts to avoid redundant calls.',
              },
              {
                icon: '📦',
                title: 'Batch Requests',
                desc: 'Use batch APIs for up to 50% discount.',
              },
            ].map((tip, idx) => (
              <Card key={idx} className="p-4 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{tip.icon}</div>
                <h3 className="font-semibold mb-2">{tip.title}</h3>
                <p className="text-sm text-muted-foreground">{tip.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 border-t mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-2">Pricing Nuances</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Context window affects pricing</li>
                <li>• Cached tokens get 50% discount</li>
                <li>• Reasoning tokens charged at input rates</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Resources</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  <a href="https://openai.com/pricing" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    OpenAI Pricing
                  </a>
                </li>
                <li>
                  <a href="https://cloud.google.com/vertex-ai/generative-ai/pricing" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    Gemini Pricing
                  </a>
                </li>
                <li>
                  <a href="https://www.anthropic.com/pricing" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    Anthropic Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Latest Update</h3>
              <p className="text-sm text-muted-foreground">
                Pricing data last updated: <strong>February 2026</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Always verify with official provider documentation.
              </p>
            </div>
          </div>
          <div className="border-t pt-4 text-center text-sm text-muted-foreground">
            <p>© 2026 LLM Pricing Calculator. Built with React & Next.js</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
