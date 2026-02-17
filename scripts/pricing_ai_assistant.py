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
    }
    
    def __init__(self):
        self.cache = {}
        self.cache_timestamp = None
    
    def fetch_latest_pricing(self, provider: str = "all") -> Dict[str, Any]:
        """Fetch latest pricing using Tavily search with domain restriction"""
        if not tavily_client:
            return self._get_fallback_pricing()
        
        try:
            target_urls = []
            if provider == "all" or provider == "openai":
                target_urls.append(self.PRICING_URLS['openai'])
            if provider == "all" or provider == "gemini":
                target_urls.append(self.PRICING_URLS['gemini'])
            if provider == "all" or provider == "anthropic":
                target_urls.append(self.PRICING_URLS['anthropic'])

            if provider == "all":
                query = "current api pricing per 1M tokens for OpenAI, Google Gemini, and Anthropic models"
            else:
                query = f"current {provider} API pricing per 1M tokens"
            
            # Use include_domains to get robust results
            print(f"\nExample Verbose: 🔎 SEARCHING TAVILY: '{query}'")
            print(f"🎯 TARGET DOMAINS: {target_urls}")
            
            results = tavily_client.search(
                query=query, 
                max_results=5, 
                include_domains=target_urls,
                search_depth="advanced"
            )
            
            found_count = len(results.get('results', []))
            print(f"✅ FOUND {found_count} RESULTS:")
            for i, res in enumerate(results.get('results', [])):
                print(f"  [{i+1}] {res.get('title', 'No Title')} ({res.get('url')})")
            print("-" * 50 + "\n")
            
            return {
                "results": results.get("results", []),
                "answer": results.get("answer", ""),
                "timestamp": datetime.datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error fetching pricing data: {e}")
            return self._get_fallback_pricing()
    
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
        
        self.system_prompt = """You are an expert AI assistant specializing in LLM pricing and cost optimization.

Your capabilities:
1. Provide accurate pricing information for major LLM providers (OpenAI, Google Gemini, Anthropic)
2. Help users calculate costs based on their usage patterns
3. Recommend cost-effective models for specific use cases
4. Offer budget planning and forecasting advice
5. Share optimization tips to reduce LLM costs

Guidelines:
- Be conversational and helpful
- Always cite sources when providing pricing data
- Provide detailed calculations when discussing costs
- Consider user's budget and requirements when making recommendations
- Be transparent about pricing changes

When users ask about pricing:
1. Clarify their specific needs
2. Provide relevant pricing information
3. Calculate estimated costs
4. Suggest alternatives if applicable
5. Offer optimization tips

Remember: Pricing can change frequently. Always recommend users verify with official sources."""
    
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
        if fetch_live_pricing and "pricing" in user_query.lower():
            fetcher = PricingDataFetcher()
            # Try to fetch fresh data
            pricing_data = fetcher.fetch_latest_pricing()
            if pricing_data.get("results"):
                # Format specific scraped content for context
                context_lines = []
                for res in pricing_data.get("results", []):
                    if isinstance(res, dict):
                         context_lines.append(f"Source: {res.get('url')}\nContent: {res.get('content')}")
                    else:
                         context_lines.append(str(res))
                
                pricing_str = "\n\n".join(context_lines)
                pricing_context = f"\n\nLATEST PRICING DATA:\n{pricing_str}"
        
        conversation_history = self.get_conversation_context(session_id)
        
        full_prompt = f"""{self.system_prompt}

CONVERSATION HISTORY:
{conversation_history}

{pricing_context}

USER QUERY: {user_query}

Provide a helpful, detailed response:"""
        
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
        
        if "pricing" in query_lower or "cost" in query_lower:
            return """I can help with LLM pricing questions! Here's some static pricing info (Feb 2026):

**OpenAI Models (per 1M tokens):**
- GPT-4o: $2.50 input / $10 output
- GPT-4o mini: $0.15 input / $0.60 output

**Google Gemini Models (per 1M tokens):**
- Gemini 1.5 Pro: $3.50 input / $10.50 output
- Gemini 1.5 Flash: $0.075 input / $0.30 output

What specific pricing question can I help you with?"""
        
        elif "compare" in query_lower:
            return "I can help compare models! Which specific models would you like to compare?"
        
        elif "budget" in query_lower or "forecast" in query_lower:
            return "I can help with budget planning! What's your monthly budget and usage estimate?"
        
        else:
            return "I'm here to help with LLM pricing questions! Ask me about pricing, comparisons, budget planning, or optimization tips."
