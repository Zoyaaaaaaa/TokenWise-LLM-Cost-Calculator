# LLM Pricing Calculator

A full-stack application to calculate, compare, and forecast LLM costs with AI-powered recommendations.

**[⚡ Quick Start](#quick-start) • [🚀 Features](#features) • [📚 Documentation](#documentation) • [🔧 Setup](#setup)**

---

## Quick Start

### Auto-Start (1 Command)

**macOS / Linux:**
```bash
chmod +x run-system.sh && ./run-system.sh
```

**Windows (PowerShell):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser; .\run-system.ps1
```

**Then open:** http://localhost:3000

---

### Manual Start (2 Terminals)

**Terminal 1 - Backend:**
```bash
cd scripts
pip install -r requirements.txt
python fastapi-backend.py
```

**Terminal 2 - Frontend:**
```bash
pnpm install
pnpm dev
```

**Then open:** http://localhost:3000

---

## Features

### 💰 Calculator Mode
- Calculate LLM costs for any model
- Real-time pricing updates
- Input/output token estimation
- Daily/monthly/yearly projections

### 🔄 Comparison Mode
- Side-by-side model pricing
- Filter by provider (OpenAI, Google, Anthropic)
- Feature comparison matrix
- Visual cost differences

### 📈 Forecasting Mode
- Monthly budget planning
- Annual cost projections
- Usage adjustment sliders
- ROI analysis

### 🤖 AI Assistant Mode
- Chat about LLM pricing
- Get personalized recommendations
- Live pricing queries
- Conversation history

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (React 19.2)
- **UI**: shadcn/ui + Tailwind CSS v4
- **Data**: SWR for client-side caching
- **Language**: TypeScript

### Backend
- **Framework**: FastAPI (Python)
- **AI**: Google Gemini 2.5 Flash
- **Search**: Tavily API (live pricing)
- **Server**: Uvicorn (ASGI)

---

## Project Structure

```
.
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main calculator
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   └── api/pricing/chat/route.ts # API proxy
│
├── components/                   # React components
│   ├── calculator-mode.tsx
│   ├── comparison-mode.tsx
│   ├── assistant-mode.tsx
│   └── forecasting-mode.tsx
│
├── lib/                          # Utilities
│   └── pricing-data.ts
│
├── scripts/                      # Python backend
│   ├── fastapi-backend.py        # Main API
│   ├── pricing_ai_assistant.py   # AI module
│   └── requirements.txt          # Dependencies
│
├── QUICK_START.md                # Quick reference
├── SETUP.md                      # Full setup guide
├── COMMANDS.md                   # Copy-paste commands
├── SYSTEM_OVERVIEW.md            # Architecture guide
└── RUN_NOW.txt                   # Minimal instructions
```

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- pnpm (or npm/yarn)

### 1. Install Frontend Dependencies
```bash
pnpm install
```

### 2. Install Backend Dependencies
```bash
cd scripts
pip install -r requirements.txt
```

### 3. Setup Environment Variables

**Frontend (.env.local):**
```env
PYTHON_BACKEND_URL=http://localhost:8000
```

**Backend (scripts/.env):**
```env
GEMINI_API_KEY=your_gemini_key
TAVILY_API_KEY=your_tavily_key
```

### 4. Get API Keys

**Gemini API Key** (for AI responses)
- Visit: https://ai.google.dev/
- Click "Get API Key"
- Paste into `scripts/.env`

**Tavily API Key** (for live pricing)
- Visit: https://tavily.com/
- Copy API key
- Paste into `scripts/.env`

---

## Run the System

### Option 1: Auto-Start Script
```bash
# macOS/Linux
./run-system.sh

# Windows
.\run-system.ps1
```

### Option 2: Manual (2 Terminals)

**Terminal 1:**
```bash
cd scripts
python fastapi-backend.py
# Runs on http://localhost:8000
```

**Terminal 2:**
```bash
pnpm dev
# Runs on http://localhost:3000
```

---

## API Endpoints

### Backend (http://localhost:8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/pricing` | Get live pricing data |
| POST | `/api/chat` | Chat with AI assistant |

### Test Backend

```bash
# Health check
curl http://localhost:8000/

# Get pricing
curl http://localhost:8000/api/pricing

# Send chat message
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is GPT-4o pricing?","session_id":"test123"}'
```

---

## Usage

### Calculator Mode
1. Select a model
2. Enter token counts
3. See cost breakdown

### Comparison Mode
1. Choose models to compare
2. View side-by-side pricing
3. See feature differences

### Forecasting Mode
1. Set monthly usage
2. Adjust parameters
3. See annual projection

### AI Assistant Mode
1. Click "AI Assistant" tab
2. Ask about pricing
3. Get personalized advice

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process or use different port
```

### Frontend can't connect
- Verify backend is running on `http://localhost:8000`
- Check `.env.local` has `PYTHON_BACKEND_URL=http://localhost:8000`
- Check browser console for errors

### No AI responses
- Add `GEMINI_API_KEY` to `scripts/.env`
- Restart backend

### Pricing not updating
- Add `TAVILY_API_KEY` to `scripts/.env`
- Restart backend

---

## Documentation

- **RUN_NOW.txt** - Minimal instructions (start here!)
- **QUICK_START.md** - Quick reference guide
- **SETUP.md** - Full setup documentation
- **COMMANDS.md** - Copy-paste commands for everything
- **SYSTEM_OVERVIEW.md** - Architecture & tech details

---

## Deployment

### Frontend → Vercel
```bash
git push origin main
# Auto-deploys
# Set PYTHON_BACKEND_URL in Vercel dashboard
```

### Backend → Railway/Render
1. Connect GitHub repository
2. Set Python 3.11 runtime
3. Set start command:
   ```
   uvicorn scripts.fastapi-backend:app --host 0.0.0.0 --port $PORT
   ```
4. Add environment variables:
   - `GEMINI_API_KEY`
   - `TAVILY_API_KEY`

---

## Development

### Add a New Component
1. Create in `components/`
2. Import in `app/page.tsx`
3. Add to mode switcher

### Modify Pricing Data
- Edit `lib/pricing-data.ts`
- Update calculations
- Test all modes

### Extend AI Assistant
- Edit `scripts/pricing_ai_assistant.py`
- Update system prompt
- Restart backend

---

## Performance

- **Frontend**: ~50KB gzipped
- **Backend**: <100ms response times
- **AI**: 2-3 seconds per response (Gemini 2.5 Flash)
- **Caching**: SWR client-side + session-based backend

---

## Security

- API keys in `.env` (never committed)
- CORS enabled for localhost dev
- Input validation with Pydantic
- Session isolation
- Environment variable protection

---

## Features Included

✅ Multiple calculation modes  
✅ Real-time pricing data  
✅ AI-powered recommendations  
✅ Conversation history  
✅ Cost projections  
✅ Model comparison  
✅ Budget forecasting  
✅ Responsive design  
✅ Dark/light themes  
✅ Full-stack setup scripts  

---

## Key Technologies

- **React 19.2** - Latest React with new compiler
- **Next.js 16** - Latest Next.js with Turbopack
- **FastAPI** - Modern, fast Python framework
- **Tailwind CSS v4** - Latest Tailwind with @apply
- **shadcn/ui** - Production-ready components
- **Google Gemini 2.5** - Latest AI model

---

## Getting Help

1. Read **RUN_NOW.txt** for quick start
2. Check **QUICK_START.md** for common issues
3. See **SETUP.md** for complete documentation
4. Review **COMMANDS.md** for all copy-paste commands
5. Study **SYSTEM_OVERVIEW.md** for architecture

---

## License

MIT

---

## Quick Commands Reference

```bash
# Start everything (auto)
./run-system.sh              # macOS/Linux
.\run-system.ps1             # Windows

# Start backend
cd scripts && python fastapi-backend.py

# Start frontend
pnpm dev

# Install dependencies
cd scripts && pip install -r requirements.txt
pnpm install

# Test endpoints
curl http://localhost:8000/
curl http://localhost:3000

# View logs
# Check terminal windows (logs appear in real-time)
```

---

**Ready to start? Run one of the commands above!** 🚀

For detailed instructions, see **RUN_NOW.txt** or **QUICK_START.md**
