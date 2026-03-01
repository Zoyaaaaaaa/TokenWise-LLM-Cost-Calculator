"""
Pricing AI Assistant Module  (LangGraph + Langfuse edition)
===========================================================
Architecture
────────────
  User query
      │
      ▼
  ┌───────────────────┐
  │  detect_providers │  — inspects the query, decides which
  └────────┬──────────┘    pricing searches to run
           │
           ▼
  ┌───────────────────┐
  │  fetch_pricing    │  — runs one Tavily search per provider
  └────────┬──────────┘    (per-provider isolation, no Gemini bias)
           │
           ▼
  ┌───────────────────┐
  │ generate_response │  — calls Gemini via LangChain ChatGoogleGenerativeAI,
  └───────────────────┘    fully tracked by Langfuse

Observability
─────────────
  Every graph run is a Langfuse trace.
  The Gemini LLM call inside `generate_response` is a tracked Langfuse span.
  A single in-memory CallCounter tracks total LLM calls across sessions.
"""

import os
import datetime
import json
from typing import Annotated, Any, Dict, List, Optional
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()

# ─── SDK imports (soft, with clear error messages) ────────────────────────────

try:
    from tavily import TavilyClient
    TAVILY_AVAILABLE = True
except ImportError:
    TAVILY_AVAILABLE = False
    print("[WARN] Tavily not installed. Run: pip install tavily-python")

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    LANGCHAIN_GEMINI_AVAILABLE = True
except ImportError:
    LANGCHAIN_GEMINI_AVAILABLE = False
    print("[WARN] LangChain-Gemini not installed. Run: pip install langchain-google-genai")

try:
    from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    print("[WARN] LangChain core not installed. Run: pip install langchain-core")

try:
    from langgraph.graph import StateGraph, END
    from langgraph.graph.message import add_messages
    from typing_extensions import TypedDict
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    print("[WARN] LangGraph not installed. Run: pip install langgraph")

try:
    from langfuse import get_client as get_langfuse_client
    from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler
    LANGFUSE_AVAILABLE = True
except Exception as e:
    LANGFUSE_AVAILABLE = False
    LangfuseCallbackHandler = None
    print(f"[WARN] Langfuse initialization error: {e}")


# ─── Configuration ─────────────────────────────────────────────────────────────

TAVILY_API_KEY    = os.getenv("TAVILY_API_KEY", "")
GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY", "")
LANGFUSE_PUBLIC   = os.getenv("LANGFUSE_PUBLIC_KEY", "")
LANGFUSE_SECRET   = os.getenv("LANGFUSE_SECRET_KEY", "")
LANGFUSE_HOST     = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")

tavily_client = TavilyClient(api_key=TAVILY_API_KEY) if (TAVILY_AVAILABLE and TAVILY_API_KEY) else None

# ─── LLM Call Counter (in-memory, survives a single process lifetime) ─────────

class CallCounter:
    """Tracks how many times the LLM has been called, per session and overall."""
    def __init__(self):
        self.total: int = 0
        self.per_session: Dict[str, int] = {}

    def increment(self, session_id: str):
        self.total += 1
        self.per_session[session_id] = self.per_session.get(session_id, 0) + 1
        print(f"  [STATS] LLM Call #{self.total}  (session '{session_id}': {self.per_session[session_id]})")

    def stats(self) -> Dict[str, Any]:
        return {
            "total_llm_calls": self.total,
            "per_session": dict(self.per_session),
        }

call_counter = CallCounter()   # singleton shared across all requests

# ─── Langfuse client (optional) ───────────────────────────────────────────────

langfuse = None
if LANGFUSE_AVAILABLE and LANGFUSE_PUBLIC and LANGFUSE_SECRET:
    try:
        langfuse = get_langfuse_client(
            public_key=LANGFUSE_PUBLIC,
            secret_key=LANGFUSE_SECRET,
            host=LANGFUSE_HOST
        )
        if langfuse.auth_check():
            print("[OK] Langfuse connected - traces will appear in your dashboard.")
        else:
            print("[WARN] Langfuse auth failed. Check LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY.")
            langfuse = None
    except Exception as e:
        langfuse = None
        print(f"[WARN] Langfuse init error: {e}")

# ─── Legacy dataclasses (used by main.py for session management) ───────────────

@dataclass
class Message:
    role: str          # 'user' | 'assistant'
    content: str
    timestamp: str
    metadata: Optional[Dict] = field(default_factory=dict)

@dataclass
class ConversationSession:
    session_id: str
    messages: List[Message]
    created_at: str
    last_active: str
    context: Dict = field(default_factory=dict)

# ─── Verified baseline pricing ─────────────────────────────────────────────────

BASELINE_PRICING = """
┌─ OpenAI (standard Chat Completions API) ─────────────────────────────────────┐
│  GPT-4o           : $2.50 input  / $10.00 output  per 1M tokens             │
│  GPT-4o mini      : $0.15 input  / $0.60  output  per 1M tokens             │
│  o1               : $15.00 input / $60.00 output  per 1M tokens             │
│  o3-mini          : $1.10 input  / $4.40  output  per 1M tokens             │
│  GPT-4 Turbo      : $10.00 input / $30.00 output  per 1M tokens             │
│  NOTE: GPT-4o Realtime API pricing ($4/$16 per 1M) is DIFFERENT — do NOT   │
│  use Realtime prices unless the user explicitly asks for Realtime API.       │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Anthropic (standard Messages API) ──────────────────────────────────────────┐
│  Claude 3.5 Sonnet: $3.00 input  / $15.00 output  per 1M tokens             │
│  Claude 3.5 Haiku : $0.25 input  / $1.25  output  per 1M tokens             │
│  Claude 3 Opus    : $15.00 input / $75.00 output  per 1M tokens             │
│  NOTE: "Sonnet 4.6" / "claude-sonnet-4-5" are NEWER, DIFFERENT models.      │
│  Do NOT conflate them with Claude 3.5 Sonnet.                                │
│  Tiered pricing (>200K tokens) does NOT apply to Claude 3.5 Sonnet          │
│  standard API unless explicitly stated.                                       │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Google Gemini (standard generateContent API) ────────────────────────────────┐
│  Gemini 2.5 Pro       : $1.25 input  / $10.00 output  per 1M tokens         │
│  Gemini 2.5 Flash     : $0.30 input  / $2.50  output  per 1M tokens         │
│  Gemini 2.5 Flash-Lite: $0.10 input  / $0.40  output  per 1M tokens         │
│  Gemini 1.5 Pro       : $1.25 input  / $5.00  output  per 1M tokens         │
│  Gemini 1.5 Flash     : $0.075 input / $0.30  output  per 1M tokens         │
└──────────────────────────────────────────────────────────────────────────────┘
"""

SYSTEM_PROMPT = f"""You are an expert AI assistant specializing in LLM pricing and cost optimization.

Your capabilities:
1. Provide accurate pricing information for major LLM providers (OpenAI, Google Gemini, Anthropic, Claude)
2. Help users calculate costs based on their usage patterns
3. Recommend cost-effective models for specific use cases
4. Offer budget planning and forecasting advice
5. Share optimization tips to reduce LLM costs

VERIFIED BASELINE PRICING (use this as your default source of truth):
{BASELINE_PRICING}

CRITICAL ACCURACY RULES:
1. ALWAYS default to standard API pricing:
   - OpenAI  → standard Chat Completions API  (NOT Realtime, NOT Batch, NOT Audio).
   - Anthropic→ standard Messages API           (NOT Batch, NOT Prompt Caching).
   - Gemini  → standard generateContent API    (NOT Vertex AI, NOT Batch).
2. NEVER conflate model versions:
   - "Claude 3.5 Sonnet" ≠ "Sonnet 4.6" / "claude-sonnet-4-5".
   - "GPT-4o" ≠ "GPT-4o Realtime".
3. Live web data (in LATEST LIVE PRICING DATA) SUPPLEMENTS the baseline.
   - Prefer it only when it clearly matches the exact model and API type asked.
   - If ambiguous or mixing tiers → FALL BACK to the verified baseline above.
4. When multiple tiers exist (Realtime/Batch/caching/context window), report
   the STANDARD tier by default and mention others exist if relevant.

Formatting rules:
- **Bold** all model names, prices, and key figures.
- Bullet lists for model comparisons.
- Every response MUST end with a "### Sources" section.
- Cite sources as markdown links: [Page Title](URL)
- Only cite URLs from the SOURCES block injected into this prompt.
- If no SOURCES block is present, cite the official pages:
  - [OpenAI API Pricing](https://openai.com/api/pricing/)
  - [Anthropic Pricing](https://www.anthropic.com/pricing)
  - [Google Gemini Pricing](https://ai.google.dev/gemini-api/docs/pricing)
  - [Claude Platform Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Never invent or guess URLs.

Response structure:
1. Direct answer with pricing data and calculations.
2. Important caveats (tier differences, model version notes).
3. Alternatives / cost-saving tips if applicable.
4. ### Sources  (always last, always present).

Accuracy and transparency build trust. Always cite your sources."""

# ─── PricingDataFetcher ───────────────────────────────────────────────────────

class PricingDataFetcher:
    """Fetches LLM pricing via Tavily — one search per provider to avoid bias."""

    PRICING_URLS = {
        'openai':    'https://openai.com/api/pricing/',
        'gemini':    'https://ai.google.dev/gemini-api/docs/pricing',
        'anthropic': 'https://www.anthropic.com/pricing',
        'claude':    'https://platform.claude.com/docs/en/about-claude/pricing',
    }

    PROVIDER_SEARCHES = {
        'openai': {
            'query':  'OpenAI GPT-4o GPT-4o-mini standard text chat completions API pricing per 1M tokens input output',
            'domain': 'https://openai.com/api/pricing/',
        },
        'gemini': {
            'query':  'Google Gemini 2.5 Flash Pro standard text API pricing per 1M tokens input output',
            'domain': 'https://ai.google.dev/gemini-api/docs/pricing',
        },
        'anthropic': {
            'query':  'Anthropic Claude 3.5 Sonnet Haiku standard Messages API pricing per 1M tokens input output',
            'domain': 'https://www.anthropic.com/pricing',
        },
        'claude': {
            'query':  'Claude 3.5 Sonnet Haiku standard Messages API pricing per 1M tokens input output',
            'domain': 'https://platform.claude.com/docs/en/about-claude/pricing',
        },
    }

    def _search_single_provider(self, provider_key: str) -> list:
        if not tavily_client:
            return []
        cfg = self.PROVIDER_SEARCHES[provider_key]
        try:
            print(f"  [SEARCH] [{provider_key.upper()}] {cfg['query'][:60]}...")
            results = tavily_client.search(
                query=cfg['query'],
                max_results=2,
                include_domains=[cfg['domain']],
                search_depth="advanced",
            )
            hits = results.get('results', [])
            print(f"  [OK] [{provider_key.upper()}] {len(hits)} result(s)")
            return hits
        except Exception as e:
            print(f"  [WARN] [{provider_key.upper()}] search failed: {e}")
            return []

    def fetch_for_providers(self, providers: List[str]) -> Dict[str, Any]:
        """Run per-provider searches and return merged results + deduplicated sources."""
        all_hits: list = []
        for p in providers:
            all_hits.extend(self._search_single_provider(p))

        seen_urls: set = set()
        context_lines: List[str] = []
        source_urls: List[str] = []

        for res in all_hits:
            if isinstance(res, dict):
                url     = res.get('url', '')
                title   = res.get('title', url)
                content = res.get('content', '')
                context_lines.append(f"Source: {url}\nTitle: {title}\nContent: {content}")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    source_urls.append(f"[{title}]({url})")

        return {
            "pricing_context": "\n\n".join(context_lines),
            "source_urls":     source_urls,
            "raw_results":     all_hits,
        }

    def _get_fallback_pricing(self) -> Dict[str, Any]:
        return {"pricing_context": "", "source_urls": [], "raw_results": []}

    def fetch_latest_pricing(self, provider: str = "all") -> Dict[str, Any]:
        """Convenience method to fetch pricing for one or all providers."""
        if provider == "all":
            providers = list(self.PROVIDER_SEARCHES.keys())
        else:
            providers = [provider]
        
        data = self.fetch_for_providers(providers)
        # Add a 'results' key to match what fastapi-backend.py expects
        return {
            "results": data["raw_results"],
            "pricing_context": data["pricing_context"],
            "source_urls": data["source_urls"]
        }



# ─── LangGraph State definition ───────────────────────────────────────────────

class AgentState(TypedDict):
    session_id:       str
    user_query:       str
    conversation_history: str          # formatted string of past turns
    providers_to_fetch:   List[str]    # set by detect_providers node
    pricing_context:      str          # set by fetch_pricing node
    source_urls:          List[str]    # set by fetch_pricing node
    assistant_response:   str          # set by generate_response node
    fetch_live:           bool
    system_prompt:        Optional[str]



# ─── Graph node functions ─────────────────────────────────────────────────────

PRICING_KEYWORDS = [
    "pricing", "price", "cost", "per token", "per 1m",
    "compare", "comparison", "cheaper", "cheapest", "expensive",
    "gpt", "claude", "gemini", "anthropic", "openai", "model",
    "budget", "token", "input", "output", "api",
]

def detect_providers(state: AgentState) -> AgentState:
    """Node 1 — decide which providers are relevant to this query."""
    q = state["user_query"].lower()
    should_fetch = state.get("fetch_live", True) and any(kw in q for kw in PRICING_KEYWORDS)

    if not should_fetch:
        return {**state, "providers_to_fetch": []}

    mentions = {
        'openai':    any(k in q for k in ["openai", "gpt-4", "gpt4", "gpt 4", "gpt-3", "o1", "o3"]),
        'anthropic': any(k in q for k in ["anthropic", "claude"]),
        'claude':    any(k in q for k in ["claude"]),
        'gemini':    any(k in q for k in ["gemini", "google", "bard"]),
    }
    # anthropic already covers claude — avoid duplicate searches
    if mentions['anthropic']:
        mentions['claude'] = False

    specific = [p for p, hit in mentions.items() if hit]
    # if no specific provider matched but keywords did → fetch all
    providers = specific if specific else list(PricingDataFetcher.PROVIDER_SEARCHES.keys())

    print(f"\n[DETECT] detect_providers -> {providers}")
    return {**state, "providers_to_fetch": providers}


def fetch_pricing(state: AgentState) -> AgentState:
    """Node 2 — run Tavily searches and build pricing context + source list."""
    providers = state.get("providers_to_fetch", [])
    if not providers:
        return {**state, "pricing_context": "", "source_urls": []}

    print(f"\n[NETWORK] fetch_pricing: fetching {providers}")
    fetcher  = PricingDataFetcher()
    data     = fetcher.fetch_for_providers(providers)

    pricing_context = ""
    if data["pricing_context"]:
        sources_block   = "\n".join(f"- {s}" for s in data["source_urls"])
        pricing_context = (
            f"\n\nLATEST LIVE PRICING DATA (from official sources):\n{data['pricing_context']}"
            f"\n\nSOURCES (you MUST list ALL of these in your ### Sources section):\n{sources_block}"
        )

    return {
        **state,
        "pricing_context": pricing_context,
        "source_urls":     data["source_urls"],
    }


def generate_response(state: AgentState, llm=None, langfuse_handler=None) -> AgentState:
    """Node 3 — call Gemini via LangChain, tracked by Langfuse."""
    session_id = state["session_id"]

    system_prompt = state.get("system_prompt") or SYSTEM_PROMPT
    
    full_prompt = (
        f"{system_prompt}\n\n"
        f"CONVERSATION HISTORY:\n{state['conversation_history']}\n\n"
        f"{state['pricing_context']}\n\n"
        f"USER QUERY: {state['user_query']}\n\n"
        f"Provide a helpful, detailed response. End with ### Sources."
    )


    # track call count
    call_counter.increment(session_id)

    if llm is None:
        return {**state, "assistant_response": _fallback_response(state["user_query"])}

    try:
        config: Dict[str, Any] = {}
        if langfuse_handler:
            config["callbacks"] = [langfuse_handler]

        system_prompt = state.get("system_prompt") or SYSTEM_PROMPT
        messages = [SystemMessage(content=system_prompt)]

        # re-inject conversation as human/AI turn pairs (last 10 only)
        for line in state["conversation_history"].split("\n"):
            if line.startswith("USER:"):
                messages.append(HumanMessage(content=line[5:].strip()))
            elif line.startswith("ASSISTANT:"):
                messages.append(AIMessage(content=line[10:].strip()))

        # current turn context (pricing data injected into human message)
        turn_content = state["user_query"]
        if state["pricing_context"]:
            turn_content = f"{state['pricing_context']}\n\nUSER QUERY: {state['user_query']}"
        messages.append(HumanMessage(content=turn_content))

        if langfuse:
            try:
                # Use current observation if available to capture the LLM call
                with langfuse.start_as_current_observation(
                    as_type="generation",
                    name="llm-response",
                    model=state.get("model_name", "gemini-2.5-flash"),
                    input=messages
                ) as generation:
                    response = llm.invoke(messages, config=config)
                    generation.update(output=response.content)
                    return {**state, "assistant_response": response.content}
            except Exception as e:
                print(f"  [ERROR] Langfuse generation tracking failed: {e}")
                # Fallback to standard invoke if observation fails
                response = llm.invoke(messages, config=config)
                return {**state, "assistant_response": response.content}
        else:
            response = llm.invoke(messages, config=config)
            return {**state, "assistant_response": response.content}

    except Exception as e:
        print(f"  [ERROR] LLM error: {e}")
        return {**state, "assistant_response": _fallback_response(state["user_query"])}


def _fallback_response(query: str) -> str:
    """Static response when LLM is unavailable."""
    q = query.lower()
    if any(k in q for k in ["pricing", "cost", "compare", "gpt", "claude", "gemini", "model", "token"]):
        return """Here's current static pricing info (Feb 2026). For live rates check the sources.

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

> Prices may have changed. Always verify with official provider documentation."""
    elif "budget" in q or "forecast" in q:
        return "I can help with budget planning! What's your monthly budget and estimated usage?"
    else:
        return "I'm here to help with LLM pricing questions! Ask me about pricing, comparisons, budget planning, or cost optimization."


# ─── PricingAIAssistant (main public class) ───────────────────────────────────

class PricingAIAssistant:
    """
    LangGraph-powered conversational assistant for LLM pricing.

    Graph flow:
        detect_providers → fetch_pricing → generate_response → END
    """

    def __init__(self, model_name: str = "gemini-2.5-flash"):
        self.model_name = model_name
        self.sessions: Dict[str, ConversationSession] = {}

        # Initialise LangChain-wrapped Gemini LLM
        self.llm = None
        if LANGCHAIN_GEMINI_AVAILABLE and GEMINI_API_KEY:
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    google_api_key=GEMINI_API_KEY,
                    temperature=0.2,
                    convert_system_message_to_human=True,   # Gemini quirk
                )
                print(f"[OK] Gemini LLM ready: {model_name}")
            except Exception as e:
                print(f"[WARN] Failed to init Gemini LLM: {e}")

        # Build the LangGraph
        self.graph = self._build_graph()
        print("[OK] LangGraph agent compiled.")

    def _build_graph(self):
        if not LANGGRAPH_AVAILABLE:
            return None

        llm              = self.llm
        langfuse_handler = LangfuseCallbackHandler() if (LANGFUSE_AVAILABLE and langfuse) else None

        builder = StateGraph(AgentState)

        builder.add_node("detect_providers", detect_providers)
        builder.add_node("fetch_pricing",    fetch_pricing)
        builder.add_node(
            "generate_response",
            lambda state: generate_response(state, llm=llm, langfuse_handler=langfuse_handler),
        )

        builder.set_entry_point("detect_providers")
        builder.add_edge("detect_providers", "fetch_pricing")
        builder.add_edge("fetch_pricing",    "generate_response")
        builder.add_edge("generate_response", END)

        return builder.compile()

    # ── Session management ─────────────────────────────────────────────────────

    def create_session(self, session_id: Optional[str] = None) -> str:
        if not session_id:
            session_id = f"session_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.sessions[session_id] = ConversationSession(
            session_id=session_id,
            messages=[],
            created_at=datetime.datetime.now().isoformat(),
            last_active=datetime.datetime.now().isoformat(),
        )
        return session_id

    def add_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict] = None):
        if session_id not in self.sessions:
            self.create_session(session_id)
        self.sessions[session_id].messages.append(Message(
            role=role,
            content=content,
            timestamp=datetime.datetime.now().isoformat(),
            metadata=metadata or {},
        ))
        self.sessions[session_id].last_active = datetime.datetime.now().isoformat()

    def get_conversation_context(self, session_id: str, max_messages: int = 10) -> str:
        if session_id not in self.sessions:
            return ""
        msgs = self.sessions[session_id].messages[-max_messages:]
        return "\n".join(f"{m.role.upper()}: {m.content}" for m in msgs)

    # ── Main query entry point ─────────────────────────────────────────────────

    def query(
        self,
        session_id: str,
        user_query: str,
        fetch_live_pricing: bool = True,
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:

        """Run the LangGraph agent and return the assistant response."""

        if session_id not in self.sessions:
            self.create_session(session_id)

        self.add_message(session_id, "user", user_query)
        conversation_history = self.get_conversation_context(session_id)

        # Langfuse trace wrapper
        if langfuse:
            try:
                # Start a trace and link it to the session_id
                # The user's snippet uses start_as_current_observation which is context-aware
                with langfuse.start_as_current_observation(
                    as_type="span",
                    name="process-pricing-query",
                    session_id=session_id,
                    input={"user_query": user_query}
                ) as span:
                    if self.graph:
                        initial_state: AgentState = {
                            "session_id":           session_id,
                            "user_query":           user_query,
                            "conversation_history": conversation_history,
                            "providers_to_fetch":   [],
                            "pricing_context":      "",
                            "source_urls":          [],
                            "assistant_response":   "",
                            "fetch_live":           fetch_live_pricing,
                            "system_prompt":        system_prompt,
                        }

                        final_state = self.graph.invoke(initial_state)
                        assistant_response = final_state["assistant_response"]
                    else:
                        # LangGraph not available - bare fallback
                        call_counter.increment(session_id)
                        assistant_response = _fallback_response(user_query)
                    
                    span.update(output={"assistant_response": assistant_response})
                
                langfuse.flush()
            except Exception as e:
                print(f"  [ERROR] Langfuse tracing failed: {e}")
                # Fallback to standard execution
                if self.graph:
                    initial_state: AgentState = {
                        "session_id":           session_id,
                        "user_query":           user_query,
                        "conversation_history": conversation_history,
                        "providers_to_fetch":   [],
                        "pricing_context":      "",
                        "source_urls":          [],
                        "assistant_response":   "",
                        "fetch_live":           fetch_live_pricing,
                        "system_prompt":        system_prompt,
                    }
                    final_state = self.graph.invoke(initial_state)
                    assistant_response = final_state["assistant_response"]
                else:
                    call_counter.increment(session_id)
                    assistant_response = _fallback_response(user_query)
        else:
            # Bare fallback when Langfuse is not available
            if self.graph:
                initial_state: AgentState = {
                    "session_id":           session_id,
                    "user_query":           user_query,
                    "conversation_history": conversation_history,
                    "providers_to_fetch":   [],
                    "pricing_context":      "",
                    "source_urls":          [],
                    "assistant_response":   "",
                    "fetch_live":           fetch_live_pricing,
                    "system_prompt":        system_prompt,
                }

                final_state = self.graph.invoke(initial_state)
                assistant_response = final_state["assistant_response"]
            else:
                call_counter.increment(session_id)
                assistant_response = _fallback_response(user_query)

        self.add_message(session_id, "assistant", assistant_response)

        print(f"\n[STATS] LLM Call Stats: {json.dumps(call_counter.stats(), indent=2)}")

        return {
            "assistant_response": assistant_response,
            "session_id":         session_id,
            "llm_call_stats":     call_counter.stats(),
        }

    def get_call_stats(self) -> Dict[str, Any]:
        """Return the current LLM call counter stats."""
        return call_counter.stats()
