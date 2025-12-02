# Quick Start: Chat Mode Integration

This guide will help you quickly set up and test the chat mode integration with the Tableau chat agent.

## 5-Minute Setup

### Step 1: Configure Environment Variables

Create `frontend/.env`:

```bash
cd frontend
cat > .env << EOF
VITE_API_URL=http://localhost:8000
VITE_CHAT_AGENT_URL=http://localhost:8001
EOF
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install the new `react-markdown` dependency needed for chat responses.

### Step 3: Start Both Backends

**Terminal 1 - Summarizer Backend:**
```bash
cd backend
source venv/bin/activate
python app.py
# Should start on http://localhost:8000
```

**Terminal 2 - Chat Agent Backend:**
```bash
cd /Users/abondili/Documents/GIT/tabai/generated-insights-develop/backend
# Follow the chat agent's setup instructions to start it on port 8001
```

### Step 4: Start Frontend

**Terminal 3:**
```bash
cd frontend
npm run dev
# Opens on http://localhost:3000
```

### Step 5: Test in Tableau

1. Open Tableau Desktop or Server
2. Load a dashboard with data
3. Add the extension (use `manifest.trex`)
4. The extension should show both Summary and Chat tabs

## Quick Test Scenarios

### Test 1: Generate Summary Then Ask Questions

1. In **Summary Mode**:
   - Select a sheet
   - Click "Generate Summary"
   - Wait for the AI summary

2. Switch to **Chat Mode**:
   - Click the "Chat" tab
   - Click "Authenticate"
   - Enter your PAT or credentials
   - Ask: "What are the top products by sales?"

The chat agent will have context from your summary!

### Test 2: Direct Chat Without Summary

1. Go directly to **Chat Mode**
2. Authenticate with your Tableau credentials
3. Select a datasource
4. Ask questions directly

### Test 3: Multi-datasource Dashboard

1. Open a dashboard with multiple datasources
2. Go to **Chat Mode**
3. Use the datasource dropdown to switch between sources
4. Ask questions about different datasources

## Authentication Quick Reference

### Using Personal Access Token (Recommended)

1. Generate PAT in Tableau Server:
   - User Settings → Personal Access Tokens → Generate New Token
   - Copy the name and secret

2. In the extension:
   - Click "Authenticate"
   - Select "Personal Access Token"
   - Enter name and secret
   - Click "Authenticate"

### Using Username/Password

1. In the extension:
   - Click "Authenticate"
   - Select "Username/Password"
   - Enter your Tableau credentials
   - Click "Authenticate"

## Troubleshooting Quick Fixes

### "Chat agent not responding"

```bash
# Check if chat agent is running
curl http://localhost:8001/health

# Should return: {"status":"healthy",...}
```

### "Authentication failed"

```bash
# Test auth directly
curl -X POST http://localhost:8001/api/v1/auth/pat/login \
  -H "Content-Type: application/json" \
  -d '{
    "pat_name": "YOUR_PAT_NAME",
    "pat_secret": "YOUR_PAT_SECRET",
    "server_url": "https://your-server.com",
    "site_content_url": ""
  }'

# Should return: {"success":true,"access_token":"..."}
```

### "CORS error in browser console"

Check that the chat agent backend allows requests from `http://localhost:3000`:

```python
# In chat agent backend main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### "No datasources found"

1. Make sure your dashboard has worksheets with data
2. Check browser console for errors
3. Verify datasources are published to server (not just local extracts in Desktop)

## Example Questions to Try

Once authenticated, try these questions:

**Sales Analysis:**
- "What are the top 10 products by revenue?"
- "Show me sales by region"
- "What's the total revenue for this year?"

**Trends:**
- "Show me sales trends over time"
- "What's the year-over-year growth?"
- "Which months have the highest sales?"

**Comparisons:**
- "Compare sales across regions"
- "Which product category performs best?"
- "Show me profit margin by segment"

**Specific Queries:**
- "What's the average order value?"
- "How many customers do we have?"
- "What's the conversion rate?"

## Port Configuration

Default ports used:

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Summarizer Backend | 8000 | http://localhost:8000 |
| Chat Agent Backend | 8001 | http://localhost:8001 |

To change ports:

**Frontend:** Edit `.env` → `VITE_CHAT_AGENT_URL`

**Backends:** Use environment variables or command line args per their documentation

## Next Steps

- Read the full [Chat Integration Guide](./CHAT_INTEGRATION.md)
- Review [Chat Agent Documentation](/Users/abondili/Documents/GIT/tabai/generated-insights-develop/backend)
- Check out [Security Best Practices](./CHAT_INTEGRATION.md#security-best-practices)
- Learn about [Context Sharing](./CHAT_INTEGRATION.md#context-sharing)

## Getting Help

If you encounter issues:

1. ✅ Check this troubleshooting section
2. ✅ Review browser console for errors  
3. ✅ Check backend logs in both terminals
4. ✅ Verify all prerequisites are met
5. ✅ Read the detailed [Chat Integration Guide](./CHAT_INTEGRATION.md)

## What's Integrated?

✅ Dual-mode interface (Summary + Chat)  
✅ PAT and username/password authentication  
✅ Multi-datasource support  
✅ Context sharing between modes  
✅ Session management  
✅ Error handling and user feedback  
✅ Markdown-formatted responses  
✅ Example questions for guidance  

## What's NOT Included Yet?

⏳ Streaming responses (coming soon)  
⏳ Conversation history persistence  
⏳ OAuth/Connected Apps UI (code ready, needs UI)  
⏳ Query visualization  
⏳ Export chat history  

---

**Ready to start?** Follow the 5-minute setup above and start chatting with your data! 🚀

