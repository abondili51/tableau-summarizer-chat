# Project Structure

Complete file organization for the Tableau Summarizer Extension.

```
/Summarizer
│
├── README.md                           # Main documentation
├── QUICK_START.md                      # 5-minute setup guide
├── DEPLOYMENT.md                       # Production deployment guide
├── EXAMPLE_PROMPT.md                   # Sample prompts and responses
├── PROJECT_STRUCTURE.md                # This file
├── LICENSE                             # MIT License
├── .gitignore                          # Git ignore rules
├── manifest.trex                       # Tableau extension manifest
│
├── backend/                            # Python FastAPI
│   ├── app.py                          # Main FastAPI application
│   ├── prompts.py                      # Prompt templates and building logic
│   ├── requirements.txt                # Python dependencies
│   ├── README_PROMPTS.md               # Prompt customization guide
│   ├── .env.example                    # Environment variables template
│   ├── .env                            # Actual environment (git-ignored)
│   └── venv/                           # Virtual environment (git-ignored)
│
└── frontend/                           # React application
    ├── package.json                    # npm dependencies
    ├── vite.config.js                  # Vite configuration
    ├── tailwind.config.js              # TailwindCSS configuration
    ├── postcss.config.js               # PostCSS configuration
    ├── index.html                      # HTML entry point
    │
    ├── src/
    │   ├── main.jsx                    # React entry point
    │   ├── App.jsx                     # Main application component
    │   ├── index.css                   # Global styles with Tailwind
    │   │
    │   ├── components/                 # React components
    │   │   ├── SheetSelector.jsx       # Multi-select sheet picker
    │   │   ├── ContextInput.jsx        # Business context input
    │   │   └── SummaryPanel.jsx        # AI summary display
    │   │
    │   └── services/                   # Business logic services
    │       ├── TableauConnector.js     # Tableau Extensions API wrapper
    │       └── GeminiService.js        # Backend API client
    │
    ├── dist/                           # Production build (git-ignored)
    └── node_modules/                   # npm packages (git-ignored)
```

## File Descriptions

### Root Level

| File | Purpose |
|------|---------|
| `manifest.trex` | Tableau extension manifest - defines extension metadata, permissions, and source URL |
| `README.md` | Comprehensive documentation covering setup, usage, API, troubleshooting |
| `QUICK_START.md` | Fast-track 5-minute setup guide for developers |
| `DEPLOYMENT.md` | Production deployment guide for Heroku, AWS, Azure, Docker |
| `EXAMPLE_PROMPT.md` | Sample Gemini prompts and expected response formats |
| `PROJECT_STRUCTURE.md` | This file - complete project organization reference |
| `LICENSE` | MIT License for open-source distribution |
| `.gitignore` | Git ignore patterns for node_modules, venv, .env, etc. |

### Backend (`/backend`)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app.py` | FastAPI server | `/api/summarize` - Generate summary<br>`/api/test-prompt` - Test prompts<br>`/health` - Health check<br>`/docs` - Auto API docs |
| `prompts.py` | Prompt engineering | `build_summarization_prompt()` - Main builder<br>`get_system_instruction()` - AI persona<br>`format_sheet_data()` - Data formatting<br>Multiple template functions |
| `requirements.txt` | Python dependencies | FastAPI, Uvicorn, Vertex AI, Pydantic |
| `.env.example` | Environment template | Shows required variables |
| `.env` | Actual config | Contains credentials (git-ignored) |
| `README_PROMPTS.md` | Prompt guide | Customization examples and best practices |

**Key Backend Functions:**
- `build_summarization_prompt()` - Constructs Gemini prompt from data (in prompts.py)
- `summarize()` - Main endpoint for summary generation
- `health_check()` - Verifies API configuration
- Template functions - Various specialized prompt styles

### Frontend (`/frontend`)

#### Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | npm dependencies and scripts |
| `vite.config.js` | Vite build tool configuration |
| `tailwind.config.js` | TailwindCSS theming and content paths |
| `postcss.config.js` | PostCSS plugins for Tailwind |
| `index.html` | HTML entry point, loads Tableau Extensions API |

#### Source Files (`/frontend/src`)

| File | Purpose | Key Features |
|------|---------|--------------|
| `main.jsx` | React app entry point | Mounts React to DOM |
| `App.jsx` | Main application component | State management, orchestration, UI layout |
| `index.css` | Global styles | Tailwind directives, base styles |

#### Components (`/frontend/src/components`)

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| `SheetSelector.jsx` | Sheet selection UI | Multi-select, Select All/Clear All, visual feedback |
| `ContextInput.jsx` | Business context input | Character counter, example contexts, text area |
| `SummaryPanel.jsx` | Summary display | Markdown rendering, copy/download, formatted output |

#### Services (`/frontend/src/services`)

| Service | Purpose | Key Functions |
|---------|---------|---------------|
| `TableauConnector.js` | Tableau API wrapper | `initializeTableau()`<br>`getSheets()`<br>`extractSheetData()`<br>`getDashboardMetadata()`<br>`subscribeToFilterChanges()` |
| `GeminiService.js` | Backend API client | `generateSummary()`<br>`testPrompt()`<br>`checkHealth()` |

## Data Flow

```
┌─────────────────┐
│  Tableau        │
│  Dashboard      │
└────────┬────────┘
         │
         │ Extensions API
         │
         v
┌─────────────────┐
│  TableauConnector│  ← Extract sheet data, filters, metadata
│  (Frontend)      │
└────────┬────────┘
         │
         │ State Management
         │
         v
┌─────────────────┐
│  App.jsx        │  ← Orchestrates data flow
│  (Frontend)      │
└────────┬────────┘
         │
         │ HTTP POST
         │
         v
┌─────────────────┐
│  GeminiService  │  ← Sends to backend API
│  (Frontend)      │
└────────┬────────┘
         │
         │ /api/summarize
         │
         v
┌─────────────────┐
│  Flask API      │  ← Builds prompt, calls Gemini
│  (Backend)       │
└────────┬────────┘
         │
         │ Gemini API
         │
         v
┌─────────────────┐
│  Google Gemini  │  ← Generates AI summary
│  API             │
└────────┬────────┘
         │
         │ Response
         │
         v
┌─────────────────┐
│  SummaryPanel   │  ← Displays formatted summary
│  (Frontend)      │
└─────────────────┘
```

## Component Responsibilities

### `App.jsx`
- Initialize Tableau extension
- Manage application state
- Coordinate between components
- Handle generate/refresh actions
- Display loading/error states

### `SheetSelector.jsx`
- Display available sheets
- Handle multi-select interactions
- Provide select all/clear all shortcuts
- Show selection count

### `ContextInput.jsx`
- Text input for business context
- Character limit enforcement
- Quick example insertion
- Helper text and guidance

### `SummaryPanel.jsx`
- Display AI-generated summary
- Format markdown-style text
- Copy to clipboard functionality
- Download as text file
- Show loading states

### `TableauConnector.js`
- Initialize Extensions API
- Extract data from worksheets
- Get dashboard metadata
- Subscribe to filter changes
- Handle Tableau events

### `GeminiService.js`
- HTTP client for backend
- Error handling
- Response parsing
- Health check monitoring

## Build and Deployment Artifacts

### Development
- Backend: Runs on `http://localhost:5000`
- Frontend: Runs on `http://localhost:3000`
- Hot reload enabled for both

### Production
- Backend: `gunicorn app:app` on port 5000
- Frontend: `npm run build` → `dist/` folder
- Frontend served via static hosting (Netlify, S3, etc.)
- manifest.trex updated with production URLs

## Environment Variables

### Backend (`.env`)
```env
GEMINI_API_KEY=<your_key>      # Required
PORT=5000                       # Optional
FLASK_ENV=production            # Optional
```

### Frontend (`.env` or `.env.production`)
```env
VITE_API_URL=http://localhost:5000    # Development
VITE_API_URL=https://api.prod.com     # Production
```

## Dependencies

### Backend
- Flask 3.0.0 - Web framework
- flask-cors 4.0.0 - CORS support
- google-generativeai 0.3.2 - Gemini API
- gunicorn 21.2.0 - Production server

### Frontend
- React 18.2.0 - UI library
- axios 1.6.2 - HTTP client
- Vite 5.0.8 - Build tool
- TailwindCSS 3.3.6 - Styling
- Tableau Extensions API 3.x - Tableau integration

## Key Design Patterns

1. **Service Layer Pattern**: Business logic separated into services
2. **Component Composition**: UI built from small, reusable components
3. **Props Down, Events Up**: Standard React data flow
4. **API Proxy**: Backend proxies Gemini calls for security
5. **Event-Driven**: Tableau filter changes trigger auto-refresh

## Extension Points

To extend functionality:

1. **Add new data sources**: Modify `TableauConnector.js` → `extractSheetData()`
2. **Customize prompts**: Edit `backend/prompts.py` → templates and functions
3. **Add prompt templates**: Create new functions in `prompts.py`
4. **Add new components**: Create in `frontend/src/components/`
5. **Enhance styling**: Modify `tailwind.config.js` or component styles
6. **Add caching**: Implement Redis in FastAPI backend
7. **Add authentication**: Add middleware in `app.py`

## Testing Locations

- Backend: `pytest` tests can be added in `backend/tests/`
- Frontend: Jest/Vitest tests can be added in `frontend/src/__tests__/`
- E2E: Playwright/Cypress tests can be added in `e2e/`

## Monitoring Points

Key areas to monitor in production:
- `/health` endpoint response time
- Gemini API success rate
- Extension load time in Tableau
- Filter change event handling
- Error rates in summary generation

---

For setup instructions, see `QUICK_START.md` or `README.md`.

