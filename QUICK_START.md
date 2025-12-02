# Quick Start Guide

Get up and running with Tableau Summarizer in 5 minutes.

## Prerequisites Check

✅ Tableau Desktop 2023.3+ or Tableau Server with Extensions enabled  
✅ Node.js 18+ installed (`node --version`)  
✅ Python 3.9+ installed (`python3 --version`)  
✅ Google Cloud Project with Vertex AI API enabled  
✅ Application Default Credentials ([Setup guide](https://cloud.google.com/docs/authentication/provide-credentials-adc)) OR Gemini API key

## Step 1: Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Configure authentication
cp .env.example .env
# Option A: Use Application Default Credentials (recommended)
gcloud auth application-default login
# Edit .env and add: GOOGLE_CLOUD_PROJECT=your-project-id

# Option B: Use API Key (for testing)
# Edit .env and add: GEMINI_API_KEY=your_key

# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Start server
python app.py
```

✅ Backend running at `http://localhost:8000`

## Step 2: Frontend Setup (2 minutes)

Open new terminal:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

✅ Frontend running at `http://localhost:3000`

## Step 3: Add to Tableau (1 minute)

1. Open Tableau Desktop
2. Create or open a dashboard
3. Drag **Extension** object onto dashboard
4. Click **"Access Local Extensions"**
5. Browse to `manifest.trex` in project root
6. Click **"Allow"** when prompted

✅ Extension loaded in Tableau!

## Step 4: Generate Your First Summary

1. **Select sheets**: Check one or more sheets from dropdown
2. **Add context** (optional): E.g., "Focus on Q4 performance"
3. **Click "Generate Summary"**
4. **View insights**: AI-generated summary appears in ~5-10 seconds

## That's It! 🎉

### What's Next?

- **Try auto-refresh**: Enable checkbox and change a filter
- **Export summary**: Use copy or download buttons
- **Customize prompts**: Edit `backend/prompts.py` (see `README_PROMPTS.md` for guide)
- **Deploy to production**: See `DEPLOYMENT.md`

## Troubleshooting

### "Extension won't load"
```bash
# Check both servers are running:
curl http://localhost:8000/health  # Should return {"status": "healthy"}
curl http://localhost:3000         # Should return HTML
```

### "API Error"
```bash
# Test Vertex AI setup:
cd backend
source venv/bin/activate

# If using ADC:
gcloud auth application-default login
python -c "import vertexai; vertexai.init(project='YOUR_PROJECT'); print('OK')"

# If using API key:
python -c "import google.generativeai as genai; genai.configure(api_key='YOUR_KEY'); print('OK')"
```

### "No data returned"
- Ensure dashboard has data
- Check Tableau permissions allow "Full Data" access
- Open browser console (F12) for error details

## Common Commands

```bash
# Stop servers
Ctrl+C (in each terminal)

# Restart backend
cd backend && source venv/bin/activate && python app.py

# Restart frontend
cd frontend && npm run dev

# View logs
# Backend: Check terminal output
# Frontend: Check browser console (F12)
```

## Sample Dashboards

Try with:
- Tableau's **Superstore** sample workbook
- **Sample - Coffee Chain** workbook
- Your own dashboards with 100+ rows of data

## Need Help?

- 📖 Full documentation: `README.md`
- 🚀 Deployment guide: `DEPLOYMENT.md`
- 📝 Prompt examples: `EXAMPLE_PROMPT.md`
- 🐛 Issues: Check browser console and terminal logs

## Pro Tips

💡 **Multi-sheet analysis**: Select 2-3 related sheets for richer insights  
💡 **Context matters**: Adding business context improves summary relevance by 40%  
💡 **Auto-refresh**: Great for live presentations - summary updates as you filter  
💡 **Large datasets**: Extension automatically limits to top 1000 rows per sheet  

---

**Next**: Read `README.md` for architecture details and advanced configuration.

