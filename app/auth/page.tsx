'use client';

import { useState } from 'react';
import { signIn, signUp } from './actions';
import { Calculator, Bot, Zap, BarChart3, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AuthPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const result = mode === 'login'
            ? await signIn(formData)
            : await signUp(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    }

    const features = [
        { icon: Calculator, text: 'Compare LLM costs in real-time' },
        { icon: BarChart3, text: 'Side-by-side model comparisons' },
        { icon: Bot, text: 'AI-powered pricing assistant' },
        { icon: Zap, text: 'Cost forecasting & optimization' },
    ];

    return (
        <div className="min-h-screen bg-background flex">

            {/* ── Left panel — branding ── */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-primary p-12">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                        <Calculator className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">LLM Pricing Calculator</span>
                </div>

                <div>
                    <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
                        Make smarter<br />AI spending<br />decisions.
                    </h1>
                    <p className="text-white/70 text-base mb-10">
                        Track, compare, and forecast your LLM API costs with AI-powered insights.
                    </p>
                    <ul className="space-y-4">
                        {features.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3 text-white/80">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                                    <Icon size={15} className="text-white" />
                                </div>
                                <span className="text-sm">{text}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-white/40 text-xs">© 2026 LLM Pricing Calculator</p>
            </div>

            {/* ── Right panel — form ── */}
            <div className="flex flex-1 items-center justify-center p-8">
                <div className="w-full max-w-md">

                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2 mb-8">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <Calculator size={18} />
                        </div>
                        <span className="text-lg font-bold text-foreground">LLM Pricing Calculator</span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-foreground mb-1">
                            {mode === 'login' ? 'Welcome back' : 'Create your account'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {mode === 'login'
                                ? 'Sign in to access your saved chat history and sessions.'
                                : 'Sign up to save your conversations and access history anywhere.'}
                        </p>
                    </div>

                    {/* Tab toggle */}
                    <div className="flex rounded-xl border border-border/60 bg-muted/50 p-1 mb-6">
                        {(['login', 'signup'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setError(''); }}
                                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${mode === m
                                        ? 'bg-background text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {m === 'login' ? 'Sign In' : 'Sign Up'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' && (
                            <div>
                                <label className="text-xs font-medium text-foreground mb-1.5 block">
                                    Full Name
                                </label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="John Doe"
                                    className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-medium text-foreground mb-1.5 block">
                                Email Address
                            </label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="you@example.com"
                                className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-foreground mb-1.5 block">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPass ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-border/60 bg-card px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 size={15} className="animate-spin" />}
                            {mode === 'login' ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs text-muted-foreground">
                        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                        <button
                            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                            className="text-primary font-medium hover:underline"
                        >
                            {mode === 'login' ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>

                </div>
            </div>
        </div>
    );
}
