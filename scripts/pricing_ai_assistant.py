"""
Pricing AI Assistant Module
Handles LLM pricing data fetching, storage, and AI responses

This module provides the core functionality for the pricing calculator backend.
"""

import os
import json
import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Try to import Google Gemini
try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️  Google Gen AI SDK not installed. Install with: pip install google-genai")

# Try to import Tavily for pricing search
try:
    from tavily import TavilyClient
    TAVILY_AVAILABLE = True
except ImportError:
    TAVILY_AVAILABLE = False
    print("⚠️  Tavily not installed. Install with: pip install tavily-python")

# Configuration
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Initialize clients
if TAVILY_AVAILABLE and TAVILY_API_KEY:
    tavily_client = TavilyClient(api_key=TAVILY_API_KEY)
else:
    tavily_client = None

# Gemini client is initialized in PricingAIAssistant class

@dataclass
class Message:
    """Represents a conversation message"""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: str
    metadata: Optional[Dict] = None


@dataclass
class ConversationSession:
    """Represents a user conversation session"""
    session_id: str
    messages: List[Message]
    created_at: str
    last_active: str
    context: Dict = None
    
    def __post_init__(self):
        if self.context is None:
            self.context = {}


class PricingDataFetcher:
    """Fetches and manages LLM pricing data from various sources"""
    
    PRICING_URLS = {
        'openai': 'https://openai.com/api/pricing/',
        'gemini': 'https://ai.google.dev/gemini-api/docs/pricing',
        'anthropic': 'https://www.anthropic.com/pricing',
        'claude':'https://platform.claude.com/docs/en/about-claude/pricing',
    }
    
    def __init__(self):
        self.cache = {}
        self.cache_timestamp = None

    # Queries and domains for each individual provider
    # Queries are intentionally specific to standard text API to avoid scraping
    # Realtime, Batch, Audio, or Embedding pricing tiers by mistake.
    PROVIDER_SEARCHES = {
        'openai': {
            'query': 'OpenAI GPT-4o GPT-4o-mini standard text chat completions API pricing per 1M tokens input output',
            'domain': 'https://openai.com/api/pricing/',
        },
        'gemini': {
            'query': 'Google Gemini 2.5 Flash Pro standard text API pricing per 1M tokens input output',
            'domain': 'https://ai.google.dev/gemini-api/docs/pricing',
        },
        'anthropic': {
            'query': 'Anthropic Claude 3.5 Sonnet Haiku standard Messages API pricing per 1M tokens input output',
            'domain': 'https://www.anthropic.com/pricing',
        },
        'claude': {
            'query': 'Claude 3.5 Sonnet Haiku standard Messages API pricing per 1M tokens input output',
            'domain': 'https://platform.claude.com/docs/en/about-claude/pricing',
        },
    }

    def _search_single_provider(self, provider_key: str) -> list:
        """Run a single Tavily search scoped to one provider domain."""
        cfg = self.PROVIDER_SEARCHES[provider_key]
        try:
            print(f"  🔎 [{provider_key.upper()}] Searching: '{cfg['query']}'")
            results = tavily_client.search(
                query=cfg['query'],
                max_results=2,
                include_domains=[cfg['domain']],
                search_depth="advanced",
            )
            hits = results.get('results', [])
            print(f"  ✅ [{provider_key.upper()}] Got {len(hits)} result(s)")
            return hits
        except Exception as e:
            print(f"  ⚠️  [{provider_key.upper()}] Search failed: {e}")
            return []

    def fetch_latest_pricing(self, provider: str = "all") -> Dict[str, Any]:
        """Fetch pricing by running one search per provider so no single domain dominates."""
        if not tavily_client:
            return self._get_fallback_pricing()

        if provider == "all":
            providers_to_fetch = list(self.PROVIDER_SEARCHES.keys())
        else:
            providers_to_fetch = [provider] if provider in self.PROVIDER_SEARCHES else list(self.PROVIDER_SEARCHES.keys())

        print(f"\n🌐 Fetching pricing for: {providers_to_fetch}")
        print("-" * 50)

        all_results = []
        for p in providers_to_fetch:
            hits = self._search_single_provider(p)
            all_results.extend(hits)

        print(f"\n📊 TOTAL RESULTS COLLECTED: {len(all_results)}")
        for i, res in enumerate(all_results):
            print(f"  [{i+1}] {res.get('title', 'No Title')} ({res.get('url')})")
        print("-" * 50 + "\n")

        return {
            "results": all_results,
            "answer": "",
            "timestamp": datetime.datetime.now().isoformat(),
        }
    
    def _get_fallback_pricing(self) -> Dict[str, Any]:
        """Return fallback pricing data"""
        return {
            "results": [],
            "answer": "Fallback pricing data. Please check official pricing pages.",
            "timestamp": datetime.datetime.now().isoformat()
        }


class PricingAIAssistant:
    """AI-powered conversational assistant for LLM pricing help"""
    
    def __init__(self, model_name: str = "gemini-2.5-flash"):
        self.model_name = model_name
        
        # Initialize GenAI Client
        if genai and GEMINI_API_KEY:
            # New SDK uses genai.Client
            try:
                self.client = genai.Client(api_key=GEMINI_API_KEY)
            except AttributeError:
                # Fallback for old SDK or if import failed
                print("⚠️  Warning: Using deprecated google-generativeai SDK. Please upgrade to google-genai.")
                self.client = None
        else:
            self.client = None
            
        self.sessions: Dict[str, ConversationSession] = {}
        
        # ── VERIFIED BASELINE PRICING (Feb 2026) ───────────────────────────────
        # This is hand-verified ground-truth data. Use it as the default unless
        # the live LATEST LIVE PRICING DATA block below provides a MORE SPECIFIC
        # and clearly matching data point for the exact model and API type asked.
        BASELINE_PRICING = """
        ┌─ OpenAI (standard Chat Completions API) ──────────────────────────────┐
        │  GPT-4o           : $2.50 input  / $10.00 output  per 1M tokens      │
        │  GPT-4o mini      : $0.15 input  / $0.60  output  per 1M tokens      │
        │  o1               : $15.00 input / $60.00 output  per 1M tokens      │
        │  o3-mini          : $1.10 input  / $4.40  output  per 1M tokens      │
        │  GPT-4 Turbo      : $10.00 input / $30.00 output  per 1M tokens      │
        │  NOTE: GPT-4o Realtime API pricing is DIFFERENT ($4/$16 per 1M), do  │
        │  NOT use Realtime prices unless the user explicitly asks for it.      │
        └───────────────────────────────────────────────────────────────────────┘

        ┌─ Anthropic (standard Messages API) ───────────────────────────────────┐
        │  Claude 3.5 Sonnet: $3.00 input  / $15.00 output  per 1M tokens      │
        │  Claude 3.5 Haiku : $0.25 input  / $1.25  output  per 1M tokens      │
        │  Claude 3 Opus    : $15.00 input / $75.00 output  per 1M tokens      │
        │  NOTE: "Sonnet 4.6", "claude-sonnet-4-5" etc. are DIFFERENT, newer   │
        │  models — not Claude 3.5 Sonnet. Do NOT conflate them.               │
        │  Tiered pricing (>200K tokens) applies only to specific models,      │
        │  NOT to Claude 3.5 Sonnet standard API unless explicitly stated.      │
        └───────────────────────────────────────────────────────────────────────┘

        ┌─ Google Gemini (standard API) ────────────────────────────────────────┐
        │  Gemini 2.5 Pro   : $1.25 input  / $10.00 output  per 1M tokens      │
        │  Gemini 2.5 Flash : $0.30 input  / $2.50  output  per 1M tokens      │
        │  Gemini 2.5 Flash-Lite: $0.10 input / $0.40 output per 1M tokens     │
        │  Gemini 1.5 Pro   : $1.25 input  / $5.00  output  per 1M tokens      │
        │  Gemini 1.5 Flash : $0.075 input / $0.30  output  per 1M tokens      │
        └───────────────────────────────────────────────────────────────────────┘
        """

        self.system_prompt = f"""You are an expert AI assistant specializing in LLM pricing and cost optimization.

Your capabilities:
1. Provide accurate pricing information for major LLM providers (OpenAI, Google Gemini, Anthropic, Claude)
2. Help users calculate costs based on their usage patterns
3. Recommend cost-effective models for specific use cases
4. Offer budget planning and forecasting advice
5. Share optimization tips to reduce LLM costs

VERIFIED BASELINE PRICING (use this as your default reference):
{BASELINE_PRICING}

CRITICAL ACCURACY RULES — read carefully:
1. ALWAYS default to standard API pricing:
   - OpenAI: standard Chat Completions API rates (NOT Realtime, NOT Batch, NOT Audio).
   - Anthropic: standard Messages API rates (NOT Batch, NOT Prompt Caching tiers unless asked).
   - Gemini: standard generateContent API rates.
2. NEVER conflate different model versions:
   - "Claude 3.5 Sonnet" ≠ "Claude Sonnet 4.6" / "claude-sonnet-4-5" (those are newer, different models).
   - "GPT-4o" ≠ "GPT-4o Realtime" (realtime costs ~60-80% more).
3. If live pricing data is provided (in LATEST LIVE PRICING DATA below), it SUPPLEMENTS the baseline.
   - Prefer live data only when it CLEARLY matches the exact model and API type the user asked about.
   - If live data is ambiguous or seems to mix tiers, FALL BACK to the verified baseline above.
4. When web results mention multiple tiers (realtime, batch, >200K context, caching), call that out
   explicitly and make sure you report the STANDARD tier by default.

Formatting rules:
- Use **bold** for model names, prices, and key figures.
- Use bullet lists for comparing multiple models.
- Always end EVERY response with a "### Sources" section.
- In the Sources section, list each source as a markdown link: [Page Title](URL)
- Only cite sources from the SOURCES block in this prompt. If none, use official pages:
  - [OpenAI Pricing](https://openai.com/api/pricing/)
  - [Anthropic Pricing](https://www.anthropic.com/pricing)
  - [Google Gemini Pricing](https://ai.google.dev/gemini-api/docs/pricing)
  - [Claude Platform Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Never invent or guess URLs.

Response structure:
1. Direct answer with relevant pricing data and calculations.
2. Note any important caveats (e.g., pricing tiers, model version differences).
3. Alternatives or tips if applicable.
4. ### Sources (always present, always last).

Remember: Accuracy and transparency build trust. Always cite your sources."""
    
    def create_session(self, session_id: Optional[str] = None) -> str:
        """Create a new conversation session"""
        if not session_id:
            session_id = f"session_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        session = ConversationSession(
            session_id=session_id,
            messages=[],
            created_at=datetime.datetime.now().isoformat(),
            last_active=datetime.datetime.now().isoformat()
        )
        
        self.sessions[session_id] = session
        return session_id
    
    def add_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict] = None):
        """Add a message to the conversation"""
        if session_id not in self.sessions:
            self.create_session(session_id)
        
        message = Message(
            role=role,
            content=content,
            timestamp=datetime.datetime.now().isoformat(),
            metadata=metadata or {}
        )
        
        self.sessions[session_id].messages.append(message)
        self.sessions[session_id].last_active = datetime.datetime.now().isoformat()
    
    def get_conversation_context(self, session_id: str, max_messages: int = 10) -> str:
        """Get recent conversation context for the LLM"""
        if session_id not in self.sessions:
            return ""
        
        session = self.sessions[session_id]
        recent_messages = session.messages[-max_messages:]
        
        context = []
        for msg in recent_messages:
            context.append(f"{msg.role.upper()}: {msg.content}")
        
        return "\n".join(context)
    
    def query(
        self,
        session_id: str,
        user_query: str,
        fetch_live_pricing: bool = True
    ) -> Dict[str, str]:
        """Process a user query and generate AI response"""
        
        if session_id not in self.sessions:
            self.create_session(session_id)
        
        self.add_message(session_id, "user", user_query)
        
        pricing_context = ""

        # Broad trigger: any question about costs, models, comparisons, or specific providers
        PRICING_KEYWORDS = [
            "pricing", "price", "cost", "cost per", "per token", "per 1m",
            "compare", "comparison", "cheaper", "cheapest", "expensive",
            "gpt", "claude", "gemini", "anthropic", "openai", "model",
            "budget", "token", "input", "output", "api",
        ]
        query_lower = user_query.lower()
        should_fetch = fetch_live_pricing and any(kw in query_lower for kw in PRICING_KEYWORDS)

        if should_fetch:
            # Detect which providers the user is asking about
            provider_mentions = {
                'openai':   any(k in query_lower for k in ["openai", "gpt-4", "gpt4", "gpt 4", "gpt-3", "o1", "o3"]),
                'anthropic':any(k in query_lower for k in ["anthropic", "claude"]),
                'claude':   any(k in query_lower for k in ["claude"]),
                'gemini':   any(k in query_lower for k in ["gemini", "google", "bard"]),
            }
            # Deduplicate: if both anthropic + claude triggered, only keep anthropic
            if provider_mentions['anthropic']:
                provider_mentions['claude'] = False

            specific_providers = [p for p, mentioned in provider_mentions.items() if mentioned]

            fetcher = PricingDataFetcher()
            if specific_providers:
                # Fetch only the relevant providers
                all_hits = []
                for p in specific_providers:
                    hits = fetcher._search_single_provider(p)
                    all_hits.extend(hits)
                pricing_data = {"results": all_hits}
            else:
                # Generic pricing question — fetch all providers
                pricing_data = fetcher.fetch_latest_pricing("all")

            if pricing_data.get("results"):
                context_lines = []
                seen_urls = set()
                source_urls = []  # deduplicated list for the SOURCES block

                for res in pricing_data.get("results", []):
                    if isinstance(res, dict):
                        url = res.get('url', '')
                        title = res.get('title', url)
                        content = res.get('content', '')
                        context_lines.append(f"Source: {url}\nTitle: {title}\nContent: {content}")
                        if url and url not in seen_urls:
                            seen_urls.add(url)
                            source_urls.append(f"[{title}]({url})")
                    else:
                        context_lines.append(str(res))

                pricing_str = "\n\n".join(context_lines)
                sources_block = "\n".join(f"- {s}" for s in source_urls)
                pricing_context = (
                    f"\n\nLATEST LIVE PRICING DATA (from official sources):\n{pricing_str}"
                    f"\n\nSOURCES (you MUST list ALL of these in your ### Sources section):\n{sources_block}"
                )
        
        conversation_history = self.get_conversation_context(session_id)
        
        full_prompt = f"""{self.system_prompt}

CONVERSATION HISTORY:
{conversation_history}

{pricing_context}

USER QUERY: {user_query}

Provide a helpful, detailed response. Remember to end with a ### Sources section listing every URL from the SOURCES block above:"""
        
        assistant_response = ""
        try:
            if self.client:
                # Use new SDK pattern: client.models.generate_content
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=full_prompt
                )
                assistant_response = response.text
            else:
                assistant_response = self._generate_fallback_response(user_query)
        except Exception as e:
            print(f"Error generating response: {e}")
            assistant_response = self._generate_fallback_response(user_query)
        
        self.add_message(session_id, "assistant", assistant_response)
        
        return {
            'assistant_response': assistant_response,
            'session_id': session_id
        }
    
    def _generate_fallback_response(self, query: str) -> str:
        """Generate a basic response when LLM is unavailable"""
        query_lower = query.lower()
        
        if "pricing" in query_lower or "cost" in query_lower or "compare" in query_lower \
                or any(k in query_lower for k in ["gpt", "claude", "gemini", "model", "token"]):
            return """Here's current static pricing info (Feb 2026). For live rates, please check the sources below.

**OpenAI Models (per 1M tokens):**
- **GPT-4o**: $2.50 input / $10.00 output
- **GPT-4o mini**: $0.15 input / $0.60 output
- **o1**: $15.00 input / $60.00 output

**Google Gemini Models (per 1M tokens):**
- **Gemini 2.5 Pro**: $1.25 input / $10.00 output
- **Gemini 2.5 Flash**: $0.30 input / $2.50 output
- **Gemini 2.5 Flash-Lite**: $0.10 input / $0.40 output

**Anthropic Claude Models (per 1M tokens):**
- **Claude 3.5 Sonnet**: $3.00 input / $15.00 output
- **Claude 3.5 Haiku**: $0.25 input / $1.25 output
- **Claude 3 Opus**: $15.00 input / $75.00 output

### Sources
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [Google Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Anthropic Pricing](https://www.anthropic.com/pricing)
- [Claude Platform Pricing](https://platform.claude.com/docs/en/about-claude/pricing)

> Prices may have changed. Always verify with official provider documentation.

What specific pricing question can I help you with?"""
        
        elif "compare" in query_lower:
            return "I can help compare models! Which specific models would you like to compare?"
        
        elif "budget" in query_lower or "forecast" in query_lower:
            return "I can help with budget planning! What's your monthly budget and usage estimate?"
        
        else:
            return "I'm here to help with LLM pricing questions! Ask me about pricing, comparisons, budget planning, or optimization tips."
