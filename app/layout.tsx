import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
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
    'LLM pricing',
    'AI model cost calculator',
    'OpenAI pricing',
    'Gemini pricing',
    'Anthropic Claude pricing',
    'token cost calculator',
    'AI API cost comparison',
    'GPT-4 pricing',
    'Claude pricing',
    'Gemini Pro pricing',
  ],
  authors: [{ name: 'LLM Pricing Calculator' }],
  creator: 'LLM Pricing Calculator',
  publisher: 'LLM Pricing Calculator',
  metadataBase: new URL('https://llm-pricing-calculator.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://llm-pricing-calculator.vercel.app',
    title: 'LLM Pricing Calculator — Compare AI Model Costs in Real Time',
    description:
      'Compare and calculate LLM API costs across OpenAI, Google Gemini, and Anthropic. Real-time pricing, budget forecasting, and AI-powered optimization.',
    siteName: 'LLM Pricing Calculator',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LLM Pricing Calculator — Compare AI Model Costs in Real Time',
    description:
      'Compare and calculate LLM API costs across OpenAI, Google Gemini, and Anthropic. Real-time pricing, budget forecasting, and AI-powered optimization.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://llm-pricing-calculator.vercel.app" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
