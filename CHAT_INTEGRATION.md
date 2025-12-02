# Chat Agent Integration Guide

This document describes how the Tableau Chat Agent has been integrated with the Dashboard Summarizer extension.

## Overview

The extension now provides two modes:
1. **Summary Mode**: Generate AI-powered summaries of dashboard data using Google Gemini
2. **Chat Mode**: Interactive Q&A with your Tableau datasource using VDS queries

Both modes can share context, allowing the chat agent to use the summary as additional context for better responses.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Tableau Extension (Frontend)                │
│                                                               │
│  ┌─────────────┐              ┌──────────────┐              │
│  │   Summary   │◄────────────►│  Chat Mode   │              │
│  │    Mode     │   Context    │              │              │
│  └──────┬──────┘   Sharing    └──────┬───────┘              │
│         │                             │                      │
│         │                             │                      │
└─────────┼─────────────────────────────┼──────────────────────┘
          │                             │
          │                             │
          ▼                             ▼
┌─────────────────────┐      ┌─────────────────────────┐
│  Summarizer Backend │      │  Chat Agent Backend     │
│  (Port 8000)        │      │  (Port 8001)            │
│                     │      │                         │
│  - Google Gemini    │      │  - Tableau VDS Queries  │
│  - Vertex AI        │      │  - LLM (Vertex/Endor)   │
└─────────────────────┘      └─────────────────────────┘
```

## Features

### 1. Dual Mode Interface

- **Tab-based navigation** between Summary and Chat modes
- **Persistent state** across mode switches
- **Visual indicators** for authentication status

### 2. Authentication

The chat mode requires authentication with your Tableau server. Supported methods:

- **Personal Access Token (PAT)** - Recommended for production
- **Username/Password** - Standard authentication
- **OAuth/Connected Apps** - For enterprise deployments (code ready, needs UI)

Authentication tokens are stored in sessionStorage and automatically reused if still valid.

### 3. Context Sharing

When you generate a summary and then switch to chat mode, the summary is automatically included as context in your questions. This allows the chat agent to:

- Understand the current dashboard state
- Reference insights from the summary
- Provide more contextual answers

### 4. Datasource Selection

- Automatically detects all datasources in the dashboard
- Allows switching between datasources for chat queries
- Displays datasource names and connection info

## Setup Instructions

### 1. Prerequisites

- **Summarizer Backend** running (default: `http://localhost:8000`)
- **Chat Agent Backend** running (default: `http://localhost:8001`)
- **Tableau Server/Cloud** with datasources configured
- **Authentication credentials** (PAT or username/password)

### 2. Frontend Configuration

Create a `.env` file in the `frontend/` directory:

```env
# Summarizer backend URL
VITE_API_URL=http://localhost:8000

# Chat agent backend URL  
VITE_CHAT_AGENT_URL=http://localhost:8001
```

For production deployments, update these URLs to your deployed backend endpoints.

### 3. Install Dependencies

```bash
cd frontend
npm install
```

The following new dependencies have been added:
- `react-markdown`: For rendering chat responses with markdown formatting

### 4. Backend Setup

#### Summarizer Backend (Port 8000)

```bash
cd backend
source venv/bin/activate
python app.py
```

No changes needed - existing setup works as-is.

#### Chat Agent Backend (Port 8001)

The chat agent backend should be running separately. Refer to its documentation at:
`/Users/abondili/Documents/GIT/tabai/generated-insights-develop/backend`

Make sure the following endpoints are accessible:
- `POST /api/v1/auth/pat/login` - PAT authentication
- `POST /api/v1/auth/standard/login` - Username/password authentication
- `POST /api/v1/agent/query` - Non-streaming query
- `POST /api/v1/agent/query/stream` - Streaming query (future use)
- `GET /health` - Health check

### 5. Start the Extension

```bash
cd frontend
npm run dev
```

Access the extension at `http://localhost:3000`

## Usage Guide

### Summary Mode

1. Select one or more sheets from your dashboard
2. Optionally add business context
3. Click "Generate Summary"
4. Review AI-generated insights
5. Export or copy the summary

### Chat Mode

1. Click the "Chat" tab in the header
2. Click "Authenticate" and enter your Tableau credentials
3. Select a datasource (if multiple available)
4. Type your question in the input box
5. Press Enter or click "Send"
6. View the response with supporting data

### Using Both Together

1. Generate a summary in Summary Mode
2. Switch to Chat Mode (summary is retained)
3. Ask follow-up questions - the chat agent will have context from the summary
4. The chat agent can answer specific questions while leveraging the broader insights

## API Integration Details

### Authentication Flow

```javascript
// 1. User enters credentials in AuthModal
// 2. ChatService.authenticateChatAgent() is called
const result = await authenticateChatAgent({
  authMethod: 'pat',
  serverUrl: 'https://your-server.com',
  siteContentUrl: 'site-name',
  authData: {
    patName: 'your-pat-name',
    patSecret: 'your-pat-secret'
  }
});

// 3. JWT token is returned and stored
// 4. Token is used for subsequent queries
```

### Query Flow

```javascript
// Send question to chat agent
const response = await sendChatQuery({
  question: 'What are the top 5 products by sales?',
  datasourceId: 'datasource-luid',
  accessToken: 'jwt-token',
  sessionId: 'session-id',
  summaryContext: 'Dashboard shows Q4 sales data...' // Optional
});

// Response includes:
// - answer: Formatted text answer (markdown)
// - reasoningProcess: Steps the agent took
// - queryMetadata: VDS query details
// - executionTime: How long it took
```

### Context Passing

When a summary exists and user switches to chat mode:

```javascript
const payload = {
  question: userQuestion,
  datasource_id: datasourceId,
  additional_context_override: {
    unstructured_context: `Dashboard Summary Context:\n${summaryText}`
  }
};
```

## File Structure

### New Files

```
frontend/src/
├── services/
│   └── ChatService.js          # Chat agent API integration
├── components/
│   ├── ChatInterface.jsx       # Chat UI component
│   └── AuthModal.jsx           # Authentication modal
```

### Modified Files

```
frontend/src/
├── App.jsx                     # Added mode toggle and chat integration
├── services/
│   └── TableauConnector.js     # Added datasource and server info functions
├── package.json                # Added react-markdown dependency
```

### New Functions in TableauConnector.js

- `getTableauServerInfo()` - Get server URL and site info
- `getPrimaryDatasourceId()` - Get first datasource ID
- `getAllDatasources()` - Get all datasource IDs and names

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Summarizer backend URL | `http://localhost:8000` | Yes |
| `VITE_CHAT_AGENT_URL` | Chat agent backend URL | `http://localhost:8001` | Yes |

## Deployment Considerations

### Production Deployment

1. **Build the frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Update environment variables** in your hosting platform:
   - Set `VITE_API_URL` to your summarizer backend URL
   - Set `VITE_CHAT_AGENT_URL` to your chat agent backend URL

3. **Update manifest.trex** with production frontend URL

4. **Configure CORS** in both backends to allow your extension domain

5. **Use HTTPS** for all production deployments

### Security Best Practices

1. **Never commit credentials** - use environment variables
2. **Use PAT authentication** in production (more secure than username/password)
3. **Implement token refresh** for long sessions
4. **Enable CORS only for trusted domains** in production
5. **Use HTTPS** to encrypt authentication tokens in transit
6. **Implement rate limiting** on backend APIs
7. **Clear tokens on logout** or session end

## Troubleshooting

### Chat Agent Not Responding

**Check:**
- Is the chat agent backend running?
- Are you authenticated? (Check for green "Authenticated" badge)
- Is the datasource ID valid?
- Check browser console for errors

**Solution:**
```bash
# Check chat agent health
curl http://localhost:8001/health

# Check if token is valid (should return 401 if invalid)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8001/api/v1/agent/info
```

### Authentication Failing

**Check:**
- Are your credentials correct?
- Is the Tableau server URL correct?
- Is the site content URL correct (if using non-default site)?
- Check for SSL certificate issues (use skip SSL option for self-signed certs)

**Solution:**
- Try authenticating directly with the chat agent API:
```bash
curl -X POST http://localhost:8001/api/v1/auth/pat/login \
  -H "Content-Type: application/json" \
  -d '{
    "pat_name": "YOUR_PAT_NAME",
    "pat_secret": "YOUR_PAT_SECRET",
    "server_url": "https://your-server.com",
    "site_content_url": ""
  }'
```

### CORS Errors

**Check:**
- Is the chat agent backend configured to allow requests from your extension domain?

**Solution:**
- Update chat agent backend CORS configuration:
```python
# In chat agent backend main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-extension-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Datasource Not Found

**Check:**
- Does the dashboard have worksheets with datasources?
- Is the datasource published to Tableau Server?

**Solution:**
- Verify datasources in the dashboard:
```javascript
// In browser console (when extension is loaded)
const datasources = await tableau.extensions.dashboardContent.dashboard
  .worksheets[0].getDataSourcesAsync();
console.log(datasources.map(ds => ({ id: ds.id, name: ds.name })));
```

## Future Enhancements

### Planned Features

1. **Streaming Responses** - Show answers as they're generated
2. **Conversation History** - Persist chat history across sessions
3. **Multi-turn Conversations** - Reference previous questions/answers
4. **OAuth Support** - Complete UI for Connected Apps authentication
5. **Advanced Context** - Include filter state, parameter values in chat context
6. **Query Visualization** - Show VDS queries that were executed
7. **Export Chat History** - Save conversations as PDF or text

### Customization Options

1. **Custom Prompts** - Override system prompts for chat agent
2. **Model Selection** - Choose different LLM models (Vertex, Endor, etc.)
3. **Temperature Control** - Adjust response creativity
4. **Context Length** - Configure how much summary to include in chat context

## Testing

### Manual Testing Checklist

- [ ] Summary mode generates correct summaries
- [ ] Chat mode displays correctly
- [ ] Authentication modal works with PAT
- [ ] Authentication modal works with username/password
- [ ] Token is stored and reused
- [ ] Datasource selector shows all datasources
- [ ] Chat queries return answers
- [ ] Summary context is passed to chat
- [ ] Error messages are clear and helpful
- [ ] Mode switching preserves state
- [ ] Auto-refresh works in summary mode
- [ ] Chat interface is responsive
- [ ] Markdown formatting renders correctly

### API Testing

```bash
# Test chat agent health
curl http://localhost:8001/health

# Test authentication
curl -X POST http://localhost:8001/api/v1/auth/pat/login \
  -H "Content-Type: application/json" \
  -d '{"pat_name":"test","pat_secret":"test","server_url":"https://server.com","site_content_url":""}'

# Test query (replace TOKEN and DATASOURCE_ID)
curl -X POST http://localhost:8001/api/v1/agent/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"question":"What are top products?","datasource_id":"DATASOURCE_ID"}'
```

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review browser console logs
3. Check backend logs for both services
4. Verify network requests in browser DevTools
5. Ensure all prerequisites are met

## License

Same as parent project (MIT License)

