"""
Tableau Summarizer Extension - Backend API
Proxies requests to Google Gemini via Vertex AI and handles data summarization
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import os
import json
from pathlib import Path
from datetime import datetime, timedelta
import requests
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, quote
import urllib3

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load configuration
config_path = Path(__file__).parent / 'config.json'
with open(config_path, 'r') as f:
    CONFIG = json.load(f)

# Import prompt building functions
from prompts import build_summarization_prompt

app = FastAPI(title="Tableau Summarizer API", version="1.0.0")

# Cache for datasource LUIDs (key: server_url:datasource_name, value: {luid, timestamp})
datasource_luid_cache = {}

# Enable CORS for Tableau extension frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CONFIG['server']['cors_origins'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Vertex AI (allow environment variables to override)
PROJECT_ID = os.environ.get('GOOGLE_CLOUD_PROJECT', '')
LOCATION = os.environ.get('GOOGLE_CLOUD_LOCATION', CONFIG['ai']['location'])
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# Lazy initialization variables
USE_VERTEX_AI = None
_vertex_initialized = False

def initialize_vertex_ai():
    """Initialize Vertex AI lazily when first needed"""
    global USE_VERTEX_AI, _vertex_initialized, PROJECT_ID
    
    if _vertex_initialized:
        return USE_VERTEX_AI
        
    try:
        # Import Google Cloud libraries only when needed
        import google.auth
        from google.auth.exceptions import DefaultCredentialsError
        import vertexai

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
        _vertex_initialized = True
        return USE_VERTEX_AI
    except Exception as e:
        # Catch both DefaultCredentialsError and any other exceptions
        print(f"Warning: Could not initialize AI client: {e}")
        USE_VERTEX_AI = None
        _vertex_initialized = True
        return None

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

@app.get('/health')
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

@app.get('/healthz')
async def health_check_k8s():
    """Health check endpoint for Kubernetes/Istio"""
    return {"status": "ok"}

@app.post('/api/summarize', response_model=SummarizeResponse)
async def summarize(request: SummarizeRequest):
    """
    Main endpoint to generate summary using Gemini via Vertex AI
    Expects JSON payload with:
    - sheets_data: array of sheet data objects
    - metadata: dashboard metadata
    - context: optional user context
    """
    print("=" * 50)
    print("SUMMARIZE ENDPOINT CALLED")
    print("=" * 50)
    try:
        # Initialize Vertex AI lazily when first needed
        vertex_ai_status = initialize_vertex_ai()
        if vertex_ai_status is None:
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
        generation_config = CONFIG['ai']['generation_config']
        
        # Call Gemini via Vertex AI or direct API
        if vertex_ai_status:
            # Import Vertex AI GenerativeModel only when needed
            try:
                from vertexai.generative_models import GenerativeModel
            except ImportError:
                from vertexai.preview.generative_models import GenerativeModel
            
            model = GenerativeModel(CONFIG['ai']['model_name'])
            response = model.generate_content(
                prompt,
                generation_config=generation_config
            )
            summary_text = response.text
        else:
            # Fallback to direct API with key
            import google.generativeai as genai
            model = genai.GenerativeModel(CONFIG['ai']['model_name'])
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

class DatasourceLuidRequest(BaseModel):
    datasource_name: str
    server_url: str
    site_content_url: Optional[str] = ""
    auth_method: str  # 'pat' or 'standard'
    # For PAT
    pat_name: Optional[str] = None
    pat_secret: Optional[str] = None
    # For standard auth
    username: Optional[str] = None
    password: Optional[str] = None

class DatasourceLuidResponse(BaseModel):
    success: bool
    luid: Optional[str] = None
    datasource_name: str
    cached: bool = False
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

def get_tableau_api_version(server_url):
    """Get Tableau Server REST API version dynamically"""
    try:
        # Try to get server info to determine version
        timeout = CONFIG['tableau']['version_check_timeout_seconds']
        response = requests.get(f"{server_url}/api/3.0/serverinfo", verify=False, timeout=timeout)
        if response.status_code == 200:
            root = ET.fromstring(response.content)
            ns = {'t': 'http://tableau.com/api'}
            restapi_version = root.find('.//t:restApiVersion', ns)
            if restapi_version is not None:
                print(f"  Server API Version: {restapi_version.text}")
                return restapi_version.text
        default_version = CONFIG['tableau']['default_api_version']
        print(f"  Could not determine version, using {default_version}")
        return default_version
    except Exception as e:
        default_version = CONFIG['tableau']['default_api_version']
        print(f"  Version detection failed: {e}, using {default_version}")
        return default_version

def tableau_rest_signin(server_url, site_content_url, auth_method, pat_name=None, pat_secret=None, username=None, password=None):
    """Sign in to Tableau Server REST API"""
    api_version = get_tableau_api_version(server_url)
    
    # Build signin request
    if auth_method == 'pat':
        signin_xml = f"""<tsRequest>
    <credentials personalAccessTokenName="{pat_name}" personalAccessTokenSecret="{pat_secret}">
        <site contentUrl="{site_content_url}" />
    </credentials>
</tsRequest>"""
    else:  # standard
        signin_xml = f"""<tsRequest>
    <credentials name="{username}" password="{password}">
        <site contentUrl="{site_content_url}" />
    </credentials>
</tsRequest>"""
    
    print(f"→ Signing in to Tableau REST API at {server_url}")
    print(f"  API Version: {api_version}")
    print(f"  Auth Method: {auth_method}")
    print(f"  Site: '{site_content_url}'")
    
    response = requests.post(
        f"{server_url}/api/{api_version}/auth/signin",
        data=signin_xml.strip(),
        headers={'Content-Type': 'application/xml'},
        verify=False,
        timeout=CONFIG['tableau']['api_timeout_seconds']
    )
    
    if response.status_code != 200:
        print(f"✗ Signin failed: {response.status_code}")
        print(f"  Response: {response.text}")
        raise Exception(f"Tableau REST API signin failed: {response.status_code} - {response.text}")
    
    try:
        root = ET.fromstring(response.content)
        
        # Tableau REST API uses a namespace
        ns = {'t': 'http://tableau.com/api'}
        
        credentials = root.find('.//t:credentials', ns)
        site = root.find('.//t:site', ns)
        
        if credentials is None:
            # Try without namespace as fallback
            credentials = root.find('.//credentials')
        if site is None:
            site = root.find('.//site')
        
        if credentials is None:
            raise Exception("No credentials element found in response")
        if site is None:
            raise Exception("No site element found in response")
        
        token = credentials.get('token')
        site_id = site.get('id')
        
        if not token:
            raise Exception("No token in credentials")
        if not site_id:
            raise Exception("No site ID in response")
        
        print(f"✓ Signed in successfully, site ID: {site_id}")
        return token, site_id, api_version
        
    except Exception as e:
        print(f"✗ Error parsing signin response: {str(e)}")
        print(f"  Response content: {response.content.decode('utf-8')[:1000]}")
        raise Exception(f"Failed to parse signin response: {str(e)}")

def tableau_rest_get_datasource_luid(server_url, token, site_id, api_version, datasource_name):
    """Get datasource LUID by name using REST API with filter"""
    # URL encode the datasource name for the filter
    encoded_name = quote(datasource_name)
    
    # Use filter parameter to search by name
    response = requests.get(
        f"{server_url}/api/{api_version}/sites/{site_id}/datasources?filter=name:eq:{encoded_name}",
        headers={
            'X-Tableau-Auth': token,
            'Content-Type': 'application/xml'
        },
        verify=False,
        timeout=CONFIG['tableau']['api_timeout_seconds']
    )
    
    if response.status_code != 200:
        raise Exception(f"Failed to get datasources: {response.status_code} - {response.text}")
    
    root = ET.fromstring(response.content)
    
    # Tableau REST API uses a namespace
    ns = {'t': 'http://tableau.com/api'}
    
    # Get the first matching datasource
    datasource = root.find('.//t:datasource', ns)
    
    if datasource is None:
        raise Exception(f"Datasource '{datasource_name}' not found on server")
    
    luid = datasource.get('id')
    
    if not luid:
        raise Exception(f"Datasource found but has no ID")
    
    print(f"✓ Found datasource LUID: {luid}")
    return luid

def tableau_rest_signout(server_url, token, api_version):
    """Sign out from Tableau Server REST API"""
    try:
        requests.post(
            f"{server_url}/api/{api_version}/auth/signout",
            headers={'X-Tableau-Auth': token},
            verify=False,
            timeout=CONFIG['tableau']['signout_timeout_seconds']
        )
    except:
        pass  # Best effort signout

@app.post('/api/datasource-luid', response_model=DatasourceLuidResponse)
async def get_datasource_luid(request: DatasourceLuidRequest):
    """
    Get Tableau datasource LUID by name using REST API
    Caches results for 4 hours
    """
    try:
        cache_key = f"{request.server_url}:{request.datasource_name}"
        
        # Check cache
        if cache_key in datasource_luid_cache:
            cached_data = datasource_luid_cache[cache_key]
            cache_age = datetime.now() - cached_data['timestamp']
            
            # Cache valid for configured hours
            cache_ttl = timedelta(hours=CONFIG['caching']['datasource_luid_ttl_hours'])
            if cache_age < cache_ttl:
                print(f"✓ Returning cached LUID for {request.datasource_name}")
                return DatasourceLuidResponse(
                    success=True,
                    luid=cached_data['luid'],
                    datasource_name=request.datasource_name,
                    cached=True
                )
        
        print(f"→ Looking up LUID for datasource: {request.datasource_name}")
        
        # Sign in to Tableau REST API
        token, site_id, api_version = tableau_rest_signin(
            request.server_url,
            request.site_content_url,
            request.auth_method,
            pat_name=request.pat_name,
            pat_secret=request.pat_secret,
            username=request.username,
            password=request.password
        )
        
        print(f"✓ Signed in to Tableau REST API (version {api_version})")
        
        # Get datasource LUID
        luid = tableau_rest_get_datasource_luid(
            request.server_url,
            token,
            site_id,
            api_version,
            request.datasource_name
        )
        
        print(f"✓ Found LUID: {luid}")
        
        # Sign out
        tableau_rest_signout(request.server_url, token, api_version)
        
        # Cache the result
        datasource_luid_cache[cache_key] = {
            'luid': luid,
            'timestamp': datetime.now()
        }
        
        return DatasourceLuidResponse(
            success=True,
            luid=luid,
            datasource_name=request.datasource_name,
            cached=False
        )
        
    except Exception as e:
        print(f"Error getting datasource LUID: {str(e)}")
        return DatasourceLuidResponse(
            success=False,
            datasource_name=request.datasource_name,
            error=str(e)
        )

if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('PORT', CONFIG['server']['port']))
    uvicorn.run(app, host='0.0.0.0', port=port)

