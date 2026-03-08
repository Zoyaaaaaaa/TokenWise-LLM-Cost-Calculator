import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from '@/hooks/use-auth';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LLM Pricing Calculator — Compare AI Model Costs in Real Time',
  description:
    'Compare and calculate LLM API costs across OpenAI, Google Gemini, and Anthropic. Get real-time pricing, budget forecasting, and AI-powered cost optimization tips.',
  keywords: [
    'LLM pricing', 'AI model cost calculator', 'OpenAI pricing',
    'Gemini pricing', 'Anthropic Claude pricing', 'token cost calculator',
    'AI API cost comparison', 'GPT-4 pricing', 'Claude pricing', 'Gemini Pro pricing',
  ],
  authors: [{ name: 'LLM Pricing Calculator' }],
  metadataBase: new URL('https://llm-pricing-calculator.vercel.app'),
  openGraph: {
    type: 'website', locale: 'en_US',
    url: 'https://llm-pricing-calculator.vercel.app',
    title: 'LLM Pricing Calculator — Compare AI Model Costs in Real Time',
    description: 'Compare and calculate LLM API costs across OpenAI, Google Gemini, and Anthropic.',
    siteName: 'LLM Pricing Calculator',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://llm-pricing-calculator.vercel.app" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
