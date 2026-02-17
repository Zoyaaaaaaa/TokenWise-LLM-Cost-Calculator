# LLM Pricing Calculator - Setup & Run Guide

This is a full-stack application with a Next.js React frontend and FastAPI Python backend.

## Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.9+ (for backend)
- **pnpm** (or npm/yarn)

## Quick Start - Run Both Frontend & Backend

### Option 1: Terminal with Two Windows (Easiest)

#### Terminal 1: Start the FastAPI Backend
```bash
cd scripts
pip install fastapi uvicorn google-generativeai tavily-python python-dotenv pydantic
python fastapi-backend.py
```
The backend will run on `http://localhost:8000`

#### Terminal 2: Start the Next.js Frontend
```bash
pnpm install
pnpm dev
```
The frontend will run on `http://localhost:3000`

Then open your browser to `http://localhost:3000`

---

### Option 2: Single Command (if you want to use a script)

**On macOS/Linux:**
```bash
# Make scripts executable
chmod +x run-system.sh

# Run both servers
./run-system.sh
```

**On Windows:**
```bash
# Run both servers
.\run-system.ps1
```

---

## Backend Setup (Python)

### 1. Navigate to scripts directory
```bash
cd scripts
```

### 2. Create a virtual environment (recommended)
```bash
python -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install \
  fastapi==0.104.1 \
  uvicorn==0.24.0 \
  google-generativeai==0.3.0 \
  tavily-python==0.3.0 \
  python-dotenv==1.0.0 \
  pydantic==2.5.0 \
  pydantic-core==2.14.0
```

### 4. Set environment variables
Create a `.env` file in the root directory (or scripts folder):
```env
GEMINI_API_KEY=your_gemini_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

Get API keys:
- **Gemini API Key**: https://ai.google.dev/
- **Tavily API Key**: https://tavily.com/

### 5. Run the FastAPI server
```bash
python fastapi-backend.py
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Test the backend:
```bash
# In another terminal
curl http://localhost:8000/
# Should return: {"status": "ok", "service": "LLM Pricing Assistant API"}
```

---

## Frontend Setup (Node.js)

### 1. Install dependencies
```bash
pnpm install
```

### 2. Set environment variables
Create a `.env.local` file in the root directory:
```env
PYTHON_BACKEND_URL=http://localhost:8000
```

### 3. Run the development server
```bash
pnpm dev
```

Open your browser to `http://localhost:3000`

---

## API Endpoints

### Backend (FastAPI) - http://localhost:8000

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | Root endpoint with service info |
| GET | `/api/pricing` | Get live LLM pricing data |
| POST | `/api/chat` | Send chat message to AI assistant |

### Frontend (Next.js) - http://localhost:3000

| Route | Purpose |
|-------|---------|
| `/` | Main pricing calculator page |
| `/api/pricing/chat` | Proxy to FastAPI backend |

---

## Features

### Calculator Mode
- Calculate costs for single models
- Input tokens, output tokens, and daily usage
- See real-time cost breakdowns

### Comparison Mode
- Compare multiple LLM models side-by-side
- View pricing differences
- Identify most cost-effective options

### Forecasting Mode
- Plan monthly budgets
- Forecast annual costs
- Adjust usage patterns

### AI Assistant Mode
- Chat with an AI about LLM pricing
- Get recommendations based on your needs
- Ask pricing questions in natural language

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is already in use
# macOS/Linux:
lsof -i :8000

# Windows:
netstat -ano | findstr :8000

# Kill the process or use a different port
# Edit fastapi-backend.py and change: uvicorn.run(app, host="0.0.0.0", port=8001)
```

### Frontend can't connect to backend
1. Make sure backend is running on `http://localhost:8000`
2. Check `.env.local` has `PYTHON_BACKEND_URL=http://localhost:8000`
3. Check browser console for CORS errors
4. FastAPI already has CORS enabled for all origins in dev

### Missing API keys
- Get Gemini API key from: https://ai.google.dev/
- Get Tavily API key from: https://tavily.com/
- Add them to `.env` in the scripts folder

### Python dependencies issues
```bash
# Upgrade pip
pip install --upgrade pip

# Reinstall all requirements
pip install --upgrade \
  fastapi==0.104.1 \
  uvicorn==0.24.0 \
  google-generativeai==0.3.0 \
  tavily-python==0.3.0 \
  python-dotenv==1.0.0
```

---

## File Structure

```
project/
├── app/
│   ├── api/
│   │   └── pricing/
│   │       └── chat/
│   │           └── route.ts          # API proxy to FastAPI
│   ├── page.tsx                       # Main calculator page
│   ├── layout.tsx                     # Root layout
│   └── globals.css                    # Global styles
├── components/
│   ├── calculator-mode.tsx            # Calculator UI
│   ├── comparison-mode.tsx            # Comparison UI
│   ├── assistant-mode.tsx             # Chat UI
│   └── forecasting-mode.tsx           # Forecasting UI
├── lib/
│   └── pricing-data.ts                # Pricing utilities
├── scripts/
│   ├── fastapi-backend.py             # Main FastAPI application
│   └── pricing_ai_assistant.py        # AI assistant module
├── .env.local                         # Frontend env vars
├── .env                               # Backend env vars (in scripts/)
├── package.json                       # Node dependencies
└── SETUP.md                           # This file
```

---

## Deployment

### Deploy Frontend to Vercel
```bash
git push # to your repository
# Vercel will automatically deploy
```

Set environment variable in Vercel dashboard:
- `PYTHON_BACKEND_URL` = your FastAPI backend URL

### Deploy Backend to Railway/Render
1. Push code to GitHub
2. Connect to Railway or Render
3. Set runtime to Python
4. Add environment variables (GEMINI_API_KEY, TAVILY_API_KEY)
5. Set start command: `uvicorn scripts.fastapi-backend:app --host 0.0.0.0 --port $PORT`

---

## Performance Notes

- Frontend uses SWR for efficient caching and revalidation
- Backend caches conversation sessions in memory
- Live pricing fetches happen only when pricing questions are asked
- Consider adding Redis for production session management

---

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review the FastAPI logs (backend terminal)
3. Check the browser console (frontend)
4. Verify environment variables are set correctly
