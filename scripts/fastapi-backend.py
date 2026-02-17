import os
import json
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pricing_ai_assistant import PricingDataFetcher, PricingAIAssistant, TAVILY_API_KEY, GEMINI_API_KEY
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="LLM Pricing API", description="Backend for LLM Pricing Calculator")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI Components
# We use the existing classes but will customize behavior for the API
fetcher = PricingDataFetcher()
assistant = PricingAIAssistant()

# Define Request Models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class PricingResponse(BaseModel):
    openai: List[Dict[str, Any]]
    gemini: List[Dict[str, Any]]
    timestamp: str

# System Prompt for Pricing Extraction
PRICING_EXTRACTION_PROMPT = """
You are a data extraction expert. I will provide you with search results about LLM pricing.
Your task is to extract the current pricing for OpenAI and Google Gemini models and format it into a specific JSON structure.

Target JSON Structure:
{
    "openai": [
        {
            "id": "model-id",
            "name": "Model Name",
            "provider": "OpenAI",
            "inputPrice": 0.00, # Cost per 1M input tokens
            "outputPrice": 0.00, # Cost per 1M output tokens
            "cachedInputPrice": 0.00, # Optional
            "description": "Brief description",
            "contextWindow": "e.g. 128K tokens",
            "features": ["feature1", "feature2"]
        }
    ],
    "gemini": [
        {
            "id": "model-id",
            "name": "Model Name",
            "provider": "Google",
            "inputPrice": 0.00,
            "inputPriceExtended": 0.00, # Optional: for >128k context if applicable
            "outputPrice": 0.00,
            "outputPriceExtended": 0.00, # Optional
            "contextThreshold": 128000, # Optional
            "description": "Brief description",
            "contextWindow": "e.g. 1M tokens",
            "features": ["feature1"]
        }
    ]
}

Rules:
1. ONLY include models from OpenAI and Google Gemini.
2. Prices MUST be per 1 Million tokens. Convert if necessary.
3. If specific data is missing, use reasonable defaults or omission.
4. Output STRICTLY the JSON object, no markdown formatting.
5. Focus on the latest models (GPT-4o, GPT-4o-mini, Gemini 1.5 Pro, Gemini 1.5 Flash).
"""

@app.get("/")
async def root():
    return {"status": "ok", "service": "LLM Pricing Assistant API"}

@app.get("/api/pricing")
async def get_live_pricing():
    """
    Fetches live pricing using Tavily search and Gemini extraction.
    Adheres to the restriction: Use strict pricing page info.
    """
    try:
        # 1. Fetch search results specifically for pricing pages
        # We explicitly rely on the fetcher's internal URL list
        
        # Use existing fetcher logic but we want raw content context
        # The fetcher.fetch_latest_pricing returns a combined result dict
        raw_data = fetcher.fetch_latest_pricing("all")
        
        # 2. Extract clean text from search results to feed to LLM
        context_text = "Search Results for Pricing:\n"
        has_content = False
        
        # Check if we got results in the new format
        results_list = raw_data.get('results', [])
        
        if results_list and isinstance(results_list, list):
            for res in results_list:
                has_content = True
                context_text += f"Source: {res.get('url')}\nContent: {res.get('content')}\n\n"
        else:
             # Fallback for old format if fetcher uses it (for safety)
             for key, val in raw_data.items():
                 if isinstance(val, dict) and 'results' in val:
                     for res in val['results']:
                         has_content = True
                         context_text += f"Source: {res.get('url')}\nContent: {res.get('content')}\n\n"
                         
        if not has_content:
            print("No live search data available. Using fallback.")
            return get_fallback_pricing()

        # 3. Use Gemini to parse this into the required JSON structure
        # We assume 'assistant.client' is the Gemini client instance
        if not assistant.client:
             # Fallback if no LLM available
             return get_fallback_pricing()

        response = assistant.client.models.generate_content(
            model=assistant.model_name,
            contents=f"{PRICING_EXTRACTION_PROMPT}\n\n{context_text}"
        )
        
        # Clean response (remove markdown code blocks if any)
        text_response = response.text.replace("```json", "").replace("```", "").strip()
        
        try:
            parsed_pricing = json.loads(text_response)
            # Add timestamp
            import datetime
            parsed_pricing['timestamp'] = datetime.datetime.now().isoformat()
            return parsed_pricing
        except json.JSONDecodeError:
            print("Failed to parse LLM pricing response")
            return get_fallback_pricing()
            
    except Exception as e:
        print(f"Error fetching live pricing: {e}")
        return get_fallback_pricing()

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint that strictly answers from pricing context.
    """
    session_id = request.session_id or assistant.create_session()
    
    # Custom system prompt for the chat endpoint to enforce strict constraints
    strict_system_prompt = """
    You are a pricing assistant. You answer questions strictly based on official OpenAI and Google Gemini pricing pages.
    
    Rules:
    1. Answer ONLY using information found in the official pricing pages or the context provided.
    2. Do NOT use general knowledge if it conflicts with the provided context.
    3. If the information is not in the pricing pages/context, state that you don't have that information.
    4. Focus on pricing, token costs, context windows, and billing details.
    """
    
    # We want to ensure live context is available for the chat
    # In a real scenario, we might want to cache this or fetch strictly relevant snippets
    # For now, we reuse the fetcher to get broad pricing context
    
    try:
        # We'll fetch fresh context for the chat if it's a pricing question
        # But to be fast, we might rely on the conversation history + fetch on demand
        # The 'assistant.query' method does this logic. 
        # We will override the logic slightly to enforce the system prompt.
        
        # Temporarily swap system prompt (not thread safe in prod but ok for this demo)
        original_prompt = assistant.system_prompt
        assistant.system_prompt = strict_system_prompt
        
        # Perform query
        result = assistant.query(session_id, request.message, fetch_live_pricing=True)
        
        # Restore prompt
        assistant.system_prompt = original_prompt
        
        return {
            "response": result['assistant_response'],
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_fallback_pricing():
    # Return the static structure defined in pricing-calculator.js
    # This ensures the frontend doesn't break if backend fails
    return {
        "openai": [
            {
                "id": "gpt-4",
                "name": "GPT-4 (Original)",
                "provider": "OpenAI",
                "inputPrice": 30.00,
                "outputPrice": 60.00,
                "description": "Most capable model, best for complex tasks requiring deep reasoning",
                "contextWindow": "8K-32K tokens",
                "features": ["Superior reasoning", "Complex analysis", "Detailed outputs"]
            },
            {
                "id": "gpt-4o",
                "name": "GPT-4o",
                "provider": "OpenAI",
                "inputPrice": 2.50,
                "outputPrice": 10.00,
                "cachedInputPrice": 1.25,
                "description": "Latest multimodal model with vision and audio capabilities",
                "contextWindow": "128K tokens",
                "features": ["Multimodal", "Cached inputs", "Fast performance"]
            },
             {
                "id": "gpt-4o-mini",
                "name": "GPT-4o mini",
                "provider": "OpenAI",
                "inputPrice": 0.15,
                "outputPrice": 0.60,
                "description": "Most cost-effective option for simple tasks",
                "contextWindow": "128K tokens",
                "features": ["Best value", "Fast", "Good for simple tasks"]
            }
        ],
        "gemini": [
             {
                "id": "gemini-1.5-pro",
                "name": "Gemini 1.5 Pro",
                "provider": "Google",
                "inputPrice": 3.50, 
                "outputPrice": 10.50,
                "inputPriceExtended": 7.00,
                "outputPriceExtended": 21.00,
                "contextThreshold": 128000,
                "description": "Mid-size multimodal model",
                "contextWindow": "2M tokens",
                "features": ["2M context", "Multimodal", "Strong reasoning"]
            },
            {
                "id": "gemini-1.5-flash",
                "name": "Gemini 1.5 Flash",
                "provider": "Google",
                "inputPrice": 0.075,
                "outputPrice": 0.30,
                "description": "Fast and efficient model",
                "contextWindow": "1M tokens",
                "features": ["1M context", "Fast", "Cost-effective"]
            }
        ],
        "timestamp": "fallback"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
