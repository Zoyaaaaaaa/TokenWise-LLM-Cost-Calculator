"""
FastAPI backend — LLM Pricing Calculator
=========================================
Endpoints:
  GET  /                        health check
  GET  /api/pricing             live pricing (Tavily + Gemini)
  POST /api/chat                AI chat with Supabase session persistence
  GET  /api/sessions            list all sessions for a user
  GET  /api/sessions/{id}       messages for a session
  DELETE /api/sessions/{id}     delete a session
"""

import os
import json
import uuid
import datetime
from typing import Dict, List, Optional, Any

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# ─── Load env ─────────────────────────────────────────────────────────────────
load_dotenv()

# ─── Local modules ────────────────────────────────────────────────────────────
from pricing_ai_assistant import (
    PricingDataFetcher,
    PricingAIAssistant,
    TAVILY_API_KEY,
    GEMINI_API_KEY,
)
from memory_service import memory_service

# ─── Supabase (server-side) ───────────────────────────────────────────────────
# Prefer dedicated backend env var `SUPABASE_URL`, fall back to the
# frontend-style `NEXT_PUBLIC_SUPABASE_URL` if needed.
SUPABASE_URL    = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SECRET = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# ─── Lightweight Supabase REST client (no SDK needed) ──────────────────────────
import httpx

class SupabaseClient:
    """Minimal Supabase REST client using httpx — no SDK dependency."""

    def __init__(self, url: str, service_key: str):
        self.url = url.rstrip("/")
        self.headers = {
            "apikey":        service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type":  "application/json",
            "Prefer":        "return=representation",
        }

    # ── Auth ──────────────────────────────────────────────────────────────────
    def get_user(self, access_token: str) -> Optional[Dict]:
        """Validate a user JWT and return their user record."""
        try:
            r = httpx.get(
                f"{self.url}/auth/v1/user",
                headers={**self.headers, "Authorization": f"Bearer {access_token}"},
                timeout=5,
            )
            if r.status_code == 200:
                return r.json()
        except Exception as exc:
            print(f"[WARN] get_user failed: {exc}")
        return None

    # ── Table helpers ─────────────────────────────────────────────────────────
    def _table_url(self, table: str) -> str:
        return f"{self.url}/rest/v1/{table}"

    def insert(self, table: str, data: Dict) -> Optional[Dict]:
        try:
            r = httpx.post(self._table_url(table), headers=self.headers, json=data, timeout=5)
            rows = r.json()
            return rows[0] if isinstance(rows, list) and rows else None
        except Exception as exc:
            print(f"[WARN] insert({table}) failed: {exc}")
            return None

    def select(self, table: str, columns: str = "*", filters: Optional[Dict] = None,
               order: Optional[str] = None, desc: bool = False) -> List[Dict]:
        params: Dict[str, Any] = {"select": columns}
        if filters:
            for k, v in filters.items():
                params[k] = f"eq.{v}"
        if order:
            params["order"] = f"{order}.{'desc' if desc else 'asc'}"
        try:
            r = httpx.get(self._table_url(table), headers=self.headers, params=params, timeout=5)
            return r.json() if r.status_code == 200 else []
        except Exception as exc:
            print(f"[WARN] select({table}) failed: {exc}")
            return []

    def update(self, table: str, data: Dict, filters: Dict) -> bool:
        params = {k: f"eq.{v}" for k, v in filters.items()}
        try:
            r = httpx.patch(self._table_url(table), headers=self.headers, params=params, json=data, timeout=5)
            return r.status_code in (200, 204)
        except Exception as exc:
            print(f"[WARN] update({table}) failed: {exc}")
            return False

    def delete(self, table: str, filters: Dict) -> bool:
        params = {k: f"eq.{v}" for k, v in filters.items()}
        try:
            r = httpx.delete(self._table_url(table), headers=self.headers, params=params, timeout=5)
            return r.status_code in (200, 204)
        except Exception as exc:
            print(f"[WARN] delete({table}) failed: {exc}")
            return False


supabase_admin: Optional[SupabaseClient] = None
if SUPABASE_URL and SUPABASE_SECRET:
    supabase_admin = SupabaseClient(SUPABASE_URL, SUPABASE_SECRET)
    print("[OK] Supabase REST client initialised.")
else:
    print("[WARN] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — DB persistence disabled.")


# ─── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(title="LLM Pricing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── AI components ────────────────────────────────────────────────────────────
fetcher   = PricingDataFetcher()
assistant = PricingAIAssistant()

# ─── Request / response models ────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message:    str
    session_id: Optional[str] = None
    user_id:    Optional[str] = None   # Supabase user UUID

class SessionCreateRequest(BaseModel):
    user_id: str
    title:   Optional[str] = "New Conversation"

# ─── Auth helper ──────────────────────────────────────────────────────────────
def verify_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    Validate Bearer token from Supabase and return the user_id.
    Returns None (not raises) when auth is absent so endpoints can work
    anonymously with reduced functionality.
    """
    if not authorization or not supabase_admin:
        return None
    try:
        token = authorization.replace("Bearer ", "")
        user  = supabase_admin.get_user(token)
        return user.get("id") if user else None
    except Exception as exc:
        print(f"[WARN] Token verification failed: {exc}")
        return None

# ─── DB helpers ───────────────────────────────────────────────────────────────
def db_create_session(user_id: str, title: str = "New Conversation") -> str:
    """Create a chat_sessions row and return its UUID string."""
    if not supabase_admin:
        return str(uuid.uuid4())
    row = supabase_admin.insert("chat_sessions", {"user_id": user_id, "title": title})
    return row["id"] if row else str(uuid.uuid4())

def db_save_message(session_id: str, user_id: str, role: str, content: str):
    """Persist a single message to chat_messages."""
    if not supabase_admin:
        return
    supabase_admin.insert("chat_messages", {
        "session_id": session_id,
        "user_id":    user_id,
        "role":       role,
        "content":    content,
    })

def db_update_session_title(session_id: str, title: str):
    if not supabase_admin:
        return
    supabase_admin.update("chat_sessions", {"title": title}, {"id": session_id})

# ─── Pricing extraction prompt ────────────────────────────────────────────────
PRICING_EXTRACTION_PROMPT = """
You are a data extraction expert. Extract current pricing for OpenAI and Google Gemini models
from the search results below and format it as strict JSON (no markdown fences).

Structure:
{
  "openai":  [{"id":"...", "name":"...", "provider":"OpenAI",  "inputPrice":0.00, "outputPrice":0.00, ...}],
  "gemini":  [{"id":"...", "name":"...", "provider":"Google",  "inputPrice":0.00, "outputPrice":0.00, ...}]
}

Rules: prices per 1M tokens, only OpenAI + Gemini, output ONLY the JSON object.
"""

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "ok", "service": "LLM Pricing Assistant API"}


@app.get("/api/supabase-test")
async def supabase_test():
    """
    Lightweight health-check to confirm the FastAPI backend
    is wired to Supabase using the current environment vars.
    """
    return {
        "supabase_url": SUPABASE_URL,
        "has_admin_client": bool(supabase_admin),
    }


@app.get("/api/pricing")
async def get_live_pricing():
    """Fetch live pricing via Tavily + Gemini extraction."""
    try:
        raw_data   = fetcher.fetch_latest_pricing("all")
        results    = raw_data.get("results", [])
        context    = ""
        for r in results:
            context += f"Source: {r.get('url')}\nContent: {r.get('content')}\n\n"

        if not context:
            return _fallback_pricing()

        if not assistant.llm:
            return _fallback_pricing()

        from langchain_core.messages import HumanMessage
        resp = assistant.llm.invoke([
            HumanMessage(content=f"{PRICING_EXTRACTION_PROMPT}\n\n{context}")
        ])
        text = resp.content.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(text)
        parsed["timestamp"] = datetime.datetime.now().isoformat()
        return parsed
    except Exception as exc:
        print(f"[ERROR] get_live_pricing: {exc}")
        return _fallback_pricing()


@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    authorization: Optional[str] = Header(None),
):
    """
    AI chat endpoint.
    - Authenticates user via Supabase token (optional).
    - Creates/reuses a chat session persisted in Supabase.
    - Stores every message in chat_messages table.
    - Uses LangGraph assistant (with PostgreSQL checkpointing when configured).
    """
    # Resolve user
    user_id = request.user_id
    if authorization and supabase_admin:
        resolved = verify_user(authorization)
        if resolved:
            user_id = resolved

    # Resolve / create session
    session_id = request.session_id
    if not session_id:
        if user_id and supabase_admin:
            # Auto-title from first 50 chars of message
            title = request.message[:50] + ("…" if len(request.message) > 50 else "")
            session_id = db_create_session(user_id, title)
        else:
            session_id = f"anon_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # If session already exists but has default title, update it with first message
    elif user_id and supabase_admin:
        rows = supabase_admin.select("chat_sessions", columns="title", filters={"id": session_id})
        if rows and rows[0].get("title") == "New Conversation":
            title = request.message[:50] + ("..." if len(request.message) > 50 else "")
            db_update_session_title(session_id, title)

    # Persist user message
    if user_id and supabase_admin:
        db_save_message(session_id, user_id, "user", request.message)

    try:
        result = assistant.query(
            session_id,
            request.message,
            fetch_live_pricing=True,
        )
        response_text = result["assistant_response"]

        # Persist assistant message
        if user_id and supabase_admin:
            db_save_message(session_id, user_id, "assistant", response_text)

        return {
            "response":   response_text,
            "session_id": session_id,
            "user_id":    user_id,
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/sessions")
async def get_sessions(authorization: Optional[str] = Header(None)):
    """Return all chat sessions for the authenticated user."""
    user_id = verify_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not supabase_admin:
        return {"sessions": []}

    rows = supabase_admin.select(
        "chat_sessions",
        columns="id,title,created_at,updated_at",
        filters={"user_id": user_id},
        order="updated_at",
        desc=True,
    )
    return {"sessions": rows}


@app.get("/api/sessions/{session_id}")
async def get_session_messages(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """Return all messages for a session (owner-only)."""
    user_id = verify_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not supabase_admin:
        return {"messages": []}

    # Verify ownership
    owns = supabase_admin.select("chat_sessions", columns="id",
                                  filters={"id": session_id, "user_id": user_id})
    if not owns:
        raise HTTPException(status_code=404, detail="Session not found")

    msgs = supabase_admin.select(
        "chat_messages",
        columns="id,role,content,created_at",
        filters={"session_id": session_id},
        order="created_at",
        desc=False,
    )
    return {"messages": msgs}


@app.delete("/api/sessions/{session_id}")
async def delete_session(
    session_id: str,
    authorization: Optional[str] = Header(None),
):
    """Delete a session and all its messages."""
    user_id = verify_user(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not supabase_admin:
        return {"success": True}

    supabase_admin.delete("chat_sessions", {"id": session_id, "user_id": user_id})
    return {"success": True}


# ─── Pricing Verification Endpoint ─────────────────────────────────────────────

class PricingVerifyRequest(BaseModel):
    model_name: str
    provider: str
    input_price: float
    output_price: float

class PricingVerifyResponse(BaseModel):
    verified: bool
    current_input_price: Optional[float]
    current_output_price: Optional[float]
    status: str  # "verified", "outdated", "unknown", "error"
    message: str
    source_url: str
    last_updated: Optional[str]


@app.post("/api/verify-pricing", response_model=PricingVerifyResponse)
async def verify_pricing(request: PricingVerifyRequest):
    """
    Verify if the provided pricing matches current official pricing from the internet.
    Uses Tavily search to fetch live pricing data.
    """
    try:
        # Map provider to search configuration
        provider_searches = {
            "openai": {
                "query": f"OpenAI {request.model_name} pricing per 1M tokens official",
                "domain": "openai.com",
                "url": "https://openai.com/api/pricing/"
            },
            "google": {
                "query": f"Google Gemini {request.model_name} pricing per 1M tokens official",
                "domain": "google.dev",
                "url": "https://ai.google.dev/gemini-api/docs/pricing"
            },
            "gemini": {
                "query": f"Google Gemini {request.model_name} pricing per 1M tokens official",
                "domain": "google.dev",
                "url": "https://ai.google.dev/gemini-api/docs/pricing"
            },
            "anthropic": {
                "query": f"Anthropic Claude {request.model_name} pricing per 1M tokens official",
                "domain": "anthropic.com",
                "url": "https://www.anthropic.com/pricing"
            },
            "claude": {
                "query": f"Claude {request.model_name} pricing per 1M tokens official",
                "domain": "anthropic.com",
                "url": "https://www.anthropic.com/pricing"
            },
        }
        
        provider_key = request.provider.lower()
        if provider_key not in provider_searches:
            return PricingVerifyResponse(
                verified=False,
                current_input_price=None,
                current_output_price=None,
                status="unknown",
                message=f"Provider '{request.provider}' not supported for verification.",
                source_url="",
                last_updated=None
            )
        
        search_config = provider_searches[provider_key]
        
        # Fetch live pricing using Tavily
        if not TAVILY_API_KEY:
            return PricingVerifyResponse(
                verified=False,
                current_input_price=None,
                current_output_price=None,
                status="error",
                message="Tavily API key not configured. Cannot verify pricing.",
                source_url=search_config["url"],
                last_updated=None
            )
        
        # Search for current pricing
        from tavily import TavilyClient
        tavily = TavilyClient(api_key=TAVILY_API_KEY)
        
        search_results = tavily.search(
            query=search_config["query"],
            max_results=3,
            include_domains=[search_config["domain"]],
            search_depth="advanced"
        )
        
        results = search_results.get("results", [])
        if not results:
            return PricingVerifyResponse(
                verified=False,
                current_input_price=None,
                current_output_price=None,
                status="unknown",
                message="Could not fetch current pricing from official sources.",
                source_url=search_config["url"],
                last_updated=datetime.datetime.now().isoformat()
            )
        
        # Use Gemini to extract pricing from search results
        if not assistant.llm:
            return PricingVerifyResponse(
                verified=False,
                current_input_price=None,
                current_output_price=None,
                status="error",
                message="AI assistant not configured. Cannot verify pricing.",
                source_url=search_config["url"],
                last_updated=None
            )
        
        # Build context from search results
        context = "\n\n".join([
            f"Source: {r.get('url')}\nTitle: {r.get('title')}\nContent: {r.get('content')}"
            for r in results
        ])
        
        # Create extraction prompt
        extraction_prompt = f"""Extract the current pricing for {request.model_name} from {request.provider} from the search results below.

Search Results:
{context}

Return ONLY a JSON object in this exact format (no markdown, no explanation):
{{
  "input_price": <number or null>,
  "output_price": <number or null>,
  "found": true/false,
  "confidence": "high/medium/low"
}}

Prices should be per 1M tokens in USD. If pricing is not found, set found to false."""

        from langchain_core.messages import HumanMessage
        response = assistant.llm.invoke([HumanMessage(content=extraction_prompt)])
        
        # Parse the response
        import json
        import re
        
        text = response.content.strip()
        # Remove markdown code blocks if present
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)
        
        try:
            pricing_data = json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON from text
            json_match = re.search(r'\{[^}]+\}', text)
            if json_match:
                try:
                    pricing_data = json.loads(json_match.group())
                except:
                    pricing_data = {"found": False, "input_price": None, "output_price": None, "confidence": "low"}
            else:
                pricing_data = {"found": False, "input_price": None, "output_price": None, "confidence": "low"}
        
        if not pricing_data.get("found"):
            return PricingVerifyResponse(
                verified=False,
                current_input_price=None,
                current_output_price=None,
                status="unknown",
                message=f"Could not find current pricing for {request.model_name} in search results.",
                source_url=results[0].get("url", search_config["url"]),
                last_updated=datetime.datetime.now().isoformat()
            )
        
        current_input = pricing_data.get("input_price")
        current_output = pricing_data.get("output_price")
        
        # Compare prices with tolerance for small differences
        tolerance = 0.01  # $0.01 per 1M tokens tolerance
        
        input_match = current_input is not None and abs(current_input - request.input_price) <= tolerance
        output_match = current_output is not None and abs(current_output - request.output_price) <= tolerance
        
        if input_match and output_match:
            return PricingVerifyResponse(
                verified=True,
                current_input_price=current_input,
                current_output_price=current_output,
                status="verified",
                message=f"✓ Pricing verified! Current rates match your data.",
                source_url=results[0].get("url", search_config["url"]),
                last_updated=datetime.datetime.now().isoformat()
            )
        else:
            differences = []
            if current_input is not None and not input_match:
                differences.append(f"Input: ${request.input_price} → ${current_input}")
            if current_output is not None and not output_match:
                differences.append(f"Output: ${request.output_price} → ${current_output}")
            
            return PricingVerifyResponse(
                verified=False,
                current_input_price=current_input,
                current_output_price=current_output,
                status="outdated",
                message=f"⚠ Pricing may be outdated. Differences found: {', '.join(differences)}",
                source_url=results[0].get("url", search_config["url"]),
                last_updated=datetime.datetime.now().isoformat()
            )
        
    except Exception as exc:
        print(f"[ERROR] verify_pricing: {exc}")
        return PricingVerifyResponse(
            verified=False,
            current_input_price=None,
            current_output_price=None,
            status="error",
            message=f"Error verifying pricing: {str(exc)}",
            source_url="",
            last_updated=None
        )


# ─── Fallback pricing ──────────────────────────────────────────────────────────
def _fallback_pricing():
    return {
        "openai": [
            {"id": "gpt-4o",      "name": "GPT-4o",      "provider": "OpenAI", "inputPrice": 2.50,  "outputPrice": 10.00, "cachedInputPrice": 1.25, "description": "Latest multimodal model", "contextWindow": "128K tokens", "features": ["Multimodal", "Cached inputs"]},
            {"id": "gpt-4o-mini", "name": "GPT-4o mini", "provider": "OpenAI", "inputPrice": 0.15,  "outputPrice": 0.60,  "description": "Most cost-effective", "contextWindow": "128K tokens", "features": ["Best value", "Fast"]},
            {"id": "o1",          "name": "o1",           "provider": "OpenAI", "inputPrice": 15.00, "outputPrice": 60.00, "description": "Advanced reasoning", "contextWindow": "200K tokens", "features": ["Deep reasoning"]},
        ],
        "gemini": [
            {"id": "gemini-2.5-pro",        "name": "Gemini 2.5 Pro",        "provider": "Google", "inputPrice": 1.25, "outputPrice": 10.00, "description": "Most capable Gemini", "contextWindow": "1M tokens", "features": ["1M context", "Multimodal"]},
            {"id": "gemini-2.5-flash",       "name": "Gemini 2.5 Flash",      "provider": "Google", "inputPrice": 0.30, "outputPrice": 2.50,  "description": "Fast and efficient", "contextWindow": "1M tokens", "features": ["Fast", "Cost-effective"]},
            {"id": "gemini-2.5-flash-lite",  "name": "Gemini 2.5 Flash-Lite", "provider": "Google", "inputPrice": 0.10, "outputPrice": 0.40,  "description": "Ultra-cheap", "contextWindow": "1M tokens", "features": ["Cheapest", "High throughput"]},
        ],
        "timestamp": "fallback",
    }


# ─── entrypoint ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
