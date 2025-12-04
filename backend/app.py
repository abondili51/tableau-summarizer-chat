"""
Tableau Summarizer Extension - Backend API
Proxies requests to Google Gemini via Vertex AI and handles data summarization
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import vertexai
try:
    from vertexai.generative_models import GenerativeModel
except ImportError:
    from vertexai.preview.generative_models import GenerativeModel
import os
from datetime import datetime
import google.auth
from google.auth.exceptions import DefaultCredentialsError

# Import prompt building functions
from prompts import build_summarization_prompt

app = FastAPI(title="Tableau Summarizer API", version="1.0.0")

# Enable CORS for Tableau extension frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Vertex AI
PROJECT_ID = os.environ.get('GOOGLE_CLOUD_PROJECT', '')
LOCATION = os.environ.get('GOOGLE_CLOUD_LOCATION', 'us-central1')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# Initialize Vertex AI with Application Default Credentials or API key
try:
    if GEMINI_API_KEY:
        # Use API key if provided (for backward compatibility)
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        USE_VERTEX_AI = False
    else:
        # Use Application Default Credentials with Vertex AI
        credentials, project = google.auth.default()
        if not PROJECT_ID:
            PROJECT_ID = project
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        USE_VERTEX_AI = True
except DefaultCredentialsError:
    USE_VERTEX_AI = None  # Will error on actual use
except Exception as e:
    print(f"Warning: Could not initialize AI client: {e}")
    USE_VERTEX_AI = None

# Pydantic models for request/response validation
class SheetData(BaseModel):
    name: str
    columns: List[str]
    data: List[Dict[str, Any]]
    totalRows: Optional[int] = None
    isSummaryData: Optional[bool] = None

class FilterInfo(BaseModel):
    worksheet: Optional[str] = None
    field: str
    type: Optional[str] = None
    value: Any

class Metadata(BaseModel):
    dashboard_name: str
    filters: Optional[List[FilterInfo]] = []

class FieldInfo(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    role: str  # 'dimension' or 'measure'
    dataType: str  # 'string', 'int', 'float', 'date', etc.
    aggregation: Optional[str] = "none"
    isHidden: Optional[bool] = False
    isCombinedField: Optional[bool] = False
    isGenerated: Optional[bool] = False

class TableInfo(BaseModel):
    id: str
    name: str

class DatasourceInfo(BaseModel):
    id: str
    name: str
    connectionName: Optional[str] = "N/A"
    isExtract: bool
    extractUpdateTime: Optional[str] = None
    fields: List[FieldInfo]
    tables: Optional[List[TableInfo]] = []

class SummarizeRequest(BaseModel):
    sheets_data: List[SheetData]
    metadata: Metadata
    datasources: Optional[List[DatasourceInfo]] = []
    context: Optional[str] = ""
    system_prompt: Optional[str] = None

class SummarizeResponse(BaseModel):
    success: bool
    summary: Optional[str] = None
    error: Optional[str] = None
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    vertex_ai_configured: bool
    project_id: Optional[str] = None
    location: Optional[str] = None

@app.get('/health', response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status='healthy',
        timestamp=datetime.now().isoformat(),
        vertex_ai_configured=USE_VERTEX_AI is not None,
        project_id=PROJECT_ID if USE_VERTEX_AI else None,
        location=LOCATION if USE_VERTEX_AI else None
    )

@app.post('/api/summarize', response_model=SummarizeResponse)
async def summarize(request: SummarizeRequest):
    """
    Main endpoint to generate summary using Gemini via Vertex AI
    Expects JSON payload with:
    - sheets_data: array of sheet data objects
    - metadata: dashboard metadata
    - context: optional user context
    """
    try:
        if USE_VERTEX_AI is None:
            raise HTTPException(
                status_code=500,
                detail='Vertex AI not configured. Please set up Application Default Credentials or provide GEMINI_API_KEY'
            )
        
        # Extract request components
        sheets_data = [sheet.dict() for sheet in request.sheets_data]
        metadata = request.metadata.dict()
        datasources = [ds.dict() for ds in request.datasources] if request.datasources else []
        user_context = request.context or ''
        system_prompt = request.system_prompt
        
        # Build comprehensive prompt
        prompt = build_summarization_prompt(sheets_data, metadata, datasources, user_context, system_prompt)
        
        print(prompt)
        
        # Configure generation parameters for faster response
        # Lower values = faster, more focused output
        generation_config = {
            'temperature': 0.7,
            'top_p': 0.8,
            'top_k': 40
        }
        
        # Call Gemini via Vertex AI or direct API
        if USE_VERTEX_AI:
            model = GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(
                prompt,
                generation_config=generation_config
            )
            summary_text = response.text
        else:
            # Fallback to direct API with key
            import google.generativeai as genai
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(
                prompt,
                generation_config=generation_config
            )
            summary_text = response.text
        
        return SummarizeResponse(
            success=True,
            summary=summary_text,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"Error generating summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class TestPromptResponse(BaseModel):
    success: bool
    prompt: Optional[str] = None
    error: Optional[str] = None

@app.post('/api/test-prompt', response_model=TestPromptResponse)
async def test_prompt(request: SummarizeRequest):
    """
    Testing endpoint to see the generated prompt without calling Gemini
    """
    try:
        sheets_data = [sheet.dict() for sheet in request.sheets_data]
        metadata = request.metadata.dict()
        datasources = [ds.dict() for ds in request.datasources] if request.datasources else []
        user_context = request.context or ''
        system_prompt = request.system_prompt
        
        prompt = build_summarization_prompt(sheets_data, metadata, datasources, user_context, system_prompt)
        
        return TestPromptResponse(
            success=True,
            prompt=prompt
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('PORT', 8001))
    uvicorn.run(app, host='0.0.0.0', port=port)

