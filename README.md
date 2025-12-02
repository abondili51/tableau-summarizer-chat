# Tableau Dashboard Summarizer Extension

AI-powered Tableau dashboard extension that generates business insights using Google Gemini.

## Features

### Summary Mode
- 🎯 **Multi-Sheet Selection**: Choose one or more sheets from your dashboard to analyze
- 🤖 **AI-Powered Insights**: Leverage Google Gemini to generate actionable business summaries
- 📝 **Custom Context**: Add business context to guide AI analysis
- 🔄 **Auto-Refresh**: Automatically update summary when filters change
- 📊 **Metadata Integration**: Includes dashboard filters, titles, and active selections
- 💾 **Export Options**: Copy to clipboard or download as text file

### Chat Mode (NEW!)
- 💬 **Interactive Q&A**: Ask natural language questions about your Tableau datasource
- 🔍 **VDS Query Execution**: Powered by Tableau VDS queries for accurate data retrieval
- 🔐 **Secure Authentication**: PAT or username/password authentication with Tableau Server
- 🔗 **Context Sharing**: Chat agent uses summary as context for better responses
- 📊 **Multiple Datasources**: Switch between different datasources in your dashboard
- ⚡ **Real-time Responses**: Get instant answers to your data questions

## Architecture

```
/Summarizer
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── App.jsx                      # Main application component
│   │   ├── components/
│   │   │   ├── SheetSelector.jsx        # Multi-select sheet chooser
│   │   │   ├── ContextInput.jsx         # Business context input
│   │   │   └── SummaryPanel.jsx         # AI summary display
│   │   └── services/
│   │       ├── TableauConnector.js      # Tableau Extensions API wrapper
│   │       └── GeminiService.js         # Backend API client (fetch)
│   └── package.json
├── backend/           # Python FastAPI server
│   ├── app.py                           # FastAPI application with Vertex AI
│   ├── prompts.py                       # Prompt templates and building logic
│   ├── requirements.txt
│   └── README_PROMPTS.md                # Prompt customization guide
└── manifest.trex      # Tableau extension manifest
```

## Prerequisites

### For Summary Mode
- **Tableau Desktop** 2023.3 or later OR **Tableau Server/Cloud** with Extensions enabled
- **Node.js** 18+ and npm
- **Python** 3.9+
- **Google Cloud Project** with Vertex AI API enabled
- **Authentication**: Either Google Cloud Application Default Credentials OR Gemini API Key
  - **Recommended**: [Set up Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc)
  - **Alternative**: [Get Gemini API Key](https://makersuite.google.com/app/apikey) (for testing)

### For Chat Mode (Optional)
- **Tableau Chat Agent Backend** running (see [Chat Integration Guide](./CHAT_INTEGRATION.md))
- **Tableau Server/Cloud** credentials (PAT or username/password)
- **Datasources** published to Tableau Server/Cloud

## Setup Instructions

### 1. Clone the Repository

```bash
cd /Users/abondili/Documents/GIT/tabai/Summarizer
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate     # On Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env with your configuration
# Option A (Recommended): Use Application Default Credentials
#   - Set up ADC: gcloud auth application-default login
#   - Add to .env: GOOGLE_CLOUD_PROJECT=your-project-id
#
# Option B: Use API Key (for testing)
#   - Add to .env: GEMINI_API_KEY=your_api_key

# Enable Vertex AI API (if using ADC)
gcloud services enable aiplatform.googleapis.com --project=your-project-id
```

### 3. Frontend Setup

```bash
# Open new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file (optional - for production deployment)
echo "VITE_API_URL=http://localhost:5000" > .env
```

### 4. Running the Application

#### Start Backend Server

```bash
cd backend
source venv/bin/activate  # Activate venv if not already active
python app.py

# Server will start at http://localhost:8000
```

#### Start Frontend Development Server

```bash
cd frontend
npm run dev

# Frontend will start at http://localhost:3000
```

### 5. Configure Tableau Extension

#### For Local Development:

1. Open Tableau Desktop
2. Create or open a dashboard
3. Drag "Extension" object onto dashboard
4. Click "Access Local Extensions"
5. Browse to `manifest.trex` file in project root
6. Allow the extension to run

#### For Production Deployment:

1. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy Backend**: Deploy Flask app to your preferred hosting (Heroku, AWS, etc.)

3. **Update manifest.trex**: Change `<url>` to your production frontend URL

4. **Host manifest.trex**: Upload to web server accessible to Tableau

5. **Add Extension**: In Tableau, add extension using the hosted manifest URL

## Configuration

### Backend Environment Variables

Create `backend/.env`:

**Option A: Using Application Default Credentials (Recommended)**
```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
PORT=8000
```

**Option B: Using API Key (for testing)**
```env
GEMINI_API_KEY=your_api_key_here
PORT=8000
```

### Frontend Environment Variables

Create `frontend/.env`:

```env
# Summarizer backend URL
VITE_API_URL=http://localhost:8000

# Chat agent backend URL (optional, only if using chat mode)
VITE_CHAT_AGENT_URL=http://localhost:8001
```

For production, update to your backend API URLs.

> **Note**: If you're only using Summary Mode, you can omit `VITE_CHAT_AGENT_URL`. The extension will work fine with just the summarizer backend.

## Usage

### Summary Mode

1. **Open Dashboard**: Open your Tableau dashboard with the extension added

2. **Select Sheets**: Choose one or more sheets to analyze from the dropdown

3. **Add Context** (Optional): Provide business context or specific instructions like:
   - "Focus on year-over-year growth trends"
   - "Identify underperforming products"
   - "Highlight key metrics for executive summary"

4. **Generate Summary**: Click "Generate Summary" button

5. **Review Insights**: AI-generated summary appears with:
   - Key trends and patterns
   - Notable insights or anomalies
   - Business implications
   - Recommended actions

6. **Auto-Refresh**: Enable auto-refresh to update summary when filters change

7. **Export**: Copy to clipboard or download as text file

### Chat Mode

1. **Switch to Chat**: Click the "Chat" tab in the header

2. **Authenticate**: Click "Authenticate" and enter your Tableau credentials:
   - Choose authentication method (PAT or username/password)
   - Enter your credentials
   - Click "Authenticate"

3. **Select Datasource**: Choose a datasource from the dropdown (if multiple available)

4. **Ask Questions**: Type natural language questions like:
   - "What are the top 5 products by sales?"
   - "Show me sales trends over the last 6 months"
   - "Which region has the highest profit margin?"
   - "What's the average order value by customer segment?"

5. **Review Answers**: The chat agent will:
   - Execute VDS queries on your datasource
   - Return formatted answers with data
   - Show reasoning process and execution time

6. **Continue Conversation**: Ask follow-up questions in the same session

7. **Use Summary Context**: If you generated a summary first, the chat agent will use it as context for better responses

> **See [Chat Integration Guide](./CHAT_INTEGRATION.md) for detailed chat mode documentation.**

## API Endpoints

### Backend API

- `GET /health` - Health check and configuration status
- `POST /api/summarize` - Generate AI summary
- `POST /api/test-prompt` - Test prompt generation (debugging)

### Request Format

```json
{
  "sheets_data": [
    {
      "name": "Sheet1",
      "columns": ["Product", "Sales", "Profit"],
      "data": [
        {"Product": "A", "Sales": 1000, "Profit": 200},
        {"Product": "B", "Sales": 1500, "Profit": 300}
      ],
      "totalRows": 2
    }
  ],
  "metadata": {
    "dashboard_name": "Sales Dashboard",
    "filters": [
      {"field": "Region", "value": "East", "type": "categorical"}
    ]
  },
  "context": "Focus on top performing products"
}
```

### Response Format

```json
{
  "success": true,
  "summary": "## Key Insights\n\n- Product B shows 50% higher sales...",
  "timestamp": "2025-11-13T10:30:00.000Z"
}
```

## Gemini Prompt Template

The extension uses the following prompt structure:

```
You are an expert business intelligence analyst. Analyze the following 
Tableau dashboard data and provide a concise, actionable summary for 
business users.

Focus on:
- Key trends and patterns in the data
- Notable insights or anomalies
- Business implications
- Recommended actions

## Dashboard Context
Dashboard: [Dashboard Name]

### Active Filters:
- [Filter Field]: [Filter Value]

### Business Context:
[User-provided context]

## Data from Selected Sheets:

### Sheet: [Sheet Name]
Columns: [Column List]
Row Count: [N]

Sample Data:
| Column1 | Column2 | Column3 |
|---------|---------|---------|
| Value1  | Value2  | Value3  |

## Summary Request:
Provide a comprehensive business summary with key insights and recommendations.
```

## Troubleshooting

### Extension Won't Load

- Verify Tableau Desktop/Server allows local extensions
- Check manifest.trex URL matches frontend URL
- Ensure both frontend and backend servers are running

### API Connection Errors

- Verify backend server is running on correct port (8000)
- Check CORS configuration in FastAPI app
- Update `VITE_API_URL` in frontend .env

### Vertex AI / Gemini Errors

- **Using ADC**: Verify `gcloud auth application-default login` is set up
- **Using API Key**: Verify key is correct in backend .env
- Check Vertex AI API is enabled: `gcloud services list --enabled | grep aiplatform`
- Verify billing is enabled in Google Cloud Console
- Test endpoint: `curl http://localhost:8000/health`

### No Data Returned

- Verify sheets contain data
- Check Tableau permissions for "Full Data" access
- Review browser console for JavaScript errors

## Development

### Project Structure

- **App.jsx**: Main application state and orchestration
- **TableauConnector.js**: All Tableau Extensions API interactions
- **GeminiService.js**: Fetch API client for backend
- **SheetSelector.jsx**: UI for multi-sheet selection
- **ContextInput.jsx**: Business context input with examples
- **SummaryPanel.jsx**: Formatted display of AI summary
- **app.py**: FastAPI backend with Vertex AI integration
- **prompts.py**: Prompt templates and building logic (easily customizable)

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Output in frontend/dist/

# Backend uses uvicorn
cd backend
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Security Considerations

1. **Credentials Protection**: 
   - Use Application Default Credentials in production
   - Never commit API keys or credentials to source control
   - Use Secret Manager for sensitive values
2. **HTTPS**: Use HTTPS for production deployments
3. **CORS**: Configure appropriate CORS settings (restrict origins in production)
4. **Data Privacy**: Be aware of data sent to Vertex AI service
5. **Authentication**: Consider adding authentication for backend API
6. **IAM Permissions**: Use least-privilege service accounts for Vertex AI access

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check Tableau Extensions API documentation
- Review Google Gemini API documentation
- Submit issues to project repository

## Credits

Built with:
- React 18
- TailwindCSS 3
- Tableau Extensions API v3
- Google Vertex AI (Gemini)
- FastAPI & Python

