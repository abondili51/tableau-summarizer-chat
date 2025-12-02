# Testing with Tableau Cloud (Local Development)

This guide walks you through testing your extension on Tableau Cloud while keeping your backend and frontend running locally.

## Prerequisites

- ✅ Tableau Cloud site access
- ✅ Backend and frontend running locally
- ✅ ngrok installed ([Download here](https://ngrok.com/download))

## Quick Steps

### 1. Start Your Local Servers

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python app.py
# Running on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Running on http://localhost:3000
```

### 2. Create ngrok Tunnels

**Terminal 3 - Frontend Tunnel:**
```bash
ngrok http 3000
```

Copy the HTTPS forwarding URL (e.g., `https://abc123.ngrok.io`)

**Terminal 4 - Backend Tunnel:**
```bash
ngrok http 8000
```

Copy the HTTPS forwarding URL (e.g., `https://xyz789.ngrok.io`)

> 💡 **Tip**: Sign up for a free ngrok account to get stable URLs that don't change each time you restart ngrok.

### 3. Update Configuration Files

**A. Update `manifest-cloud-test.trex`:**

Replace line 11 with your frontend ngrok URL:
```xml
<url>https://YOUR-FRONTEND-NGROK-URL.ngrok.io</url>
```

**B. Update `frontend/.env` (create if it doesn't exist):**

```bash
cd frontend
echo "VITE_API_URL=https://YOUR-BACKEND-NGROK-URL.ngrok.io" > .env.local
```

### 4. Restart Frontend with New Backend URL

```bash
# In frontend terminal (Ctrl+C to stop, then):
npm run dev
```

### 5. Update Backend CORS Settings

Open `backend/app.py` and temporarily allow all origins for testing:

```python
# Find the CORS configuration and update:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For testing only! Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Restart backend:
```bash
# Ctrl+C then:
python app.py
```

### 6. Test ngrok URLs

```bash
# Test backend
curl https://YOUR-BACKEND-NGROK-URL.ngrok.io/health

# Test frontend (in browser)
# Open: https://YOUR-FRONTEND-NGROK-URL.ngrok.io
```

### 7. Configure Tableau Cloud

**A. Enable Extension on Your Site:**

1. Go to Tableau Cloud → **Settings** → **Extensions**
2. Enable: **"Let users run extensions on this site"**
3. Under **"Allowed extensions"**, add:
   - `https://YOUR-FRONTEND-NGROK-URL.ngrok.io`
   - `https://YOUR-BACKEND-NGROK-URL.ngrok.io`

**B. Host Your Manifest File:**

Option 1 - Quick Test (use raw GitHub):
1. Create a GitHub Gist with `manifest-cloud-test.trex` contents
2. Use the "Raw" URL

Option 2 - Use ngrok for manifest:
```bash
# Terminal 5
cd /Users/abondili/Documents/GIT/tabai/Summarizer
python3 -m http.server 8080

# Terminal 6
ngrok http 8080
```
Your manifest URL: `https://YOUR-MANIFEST-NGROK-URL.ngrok.io/manifest-cloud-test.trex`

### 8. Add Extension to Dashboard

**In Tableau Desktop:**

1. Create or open a dashboard
2. Add the extension using `manifest-cloud-test.trex` locally first
3. Test that it works
4. Publish the workbook to Tableau Cloud

**OR start directly in Tableau Cloud:**

1. Create/open a dashboard in Tableau Cloud
2. Add **Extension** object
3. Click **"Add an Extension"**
4. Enter your manifest URL
5. Allow the extension

### 9. Test End-User Experience

1. Open your published workbook on Tableau Cloud
2. The extension loads from your local frontend (via ngrok)
3. API calls go to your local backend (via ngrok)
4. You can see real-time logs in your local terminals!

### 10. Test Different Scenarios

**As Workbook Author:**
- Edit dashboard with extension
- Change extension size
- Add/remove sheets

**As Viewer:**
- Open published workbook (share with colleague or use Viewer role)
- Apply filters
- Generate summaries
- Test auto-refresh
- Export summaries

## Monitoring & Debugging

### View Real-Time Traffic

**Backend logs:**
```bash
# Terminal 1 shows all API requests
```

**Frontend logs:**
```bash
# Terminal 2 shows build/serve logs
# Browser Console (F12) shows client-side logs
```

**ngrok Web Interface:**
```bash
# Open in browser: http://localhost:4040
# Shows all HTTP requests through ngrok tunnel
```

### Common Issues

**Issue: "Extension can't be reached"**
```bash
# Check ngrok is running:
curl https://YOUR-FRONTEND-NGROK-URL.ngrok.io

# Check manifest URL is correct
```

**Issue: "API Error"**
```bash
# Check backend ngrok is running:
curl https://YOUR-BACKEND-NGROK-URL.ngrok.io/health

# Check frontend .env.local has correct backend URL
```

**Issue: "CORS Error"**
```bash
# Verify CORS allows all origins in backend/app.py
# Check browser console for specific error
```

**Issue: "Extension won't load on Tableau Cloud"**
1. Verify extension is allowlisted in Tableau Cloud settings
2. Check both ngrok URLs are HTTPS (not HTTP)
3. Ensure ngrok tunnels are still running (free tier times out after 2 hours)

## ngrok Pro Tips

### Use ngrok Config for Stable URLs

With a free ngrok account, create `~/.ngrok2/ngrok.yml`:

```yaml
authtoken: YOUR_AUTH_TOKEN
tunnels:
  frontend:
    proto: http
    addr: 3000
  backend:
    proto: http
    addr: 8000
```

Then start both tunnels:
```bash
ngrok start --all
```

### Reserve Static Domains (Paid Plan)

Reserve domains like:
- `tableau-ext-frontend.ngrok.io`
- `tableau-ext-backend.ngrok.io`

Benefits:
- No need to update manifest each time
- URLs don't change between sessions
- Can pre-configure Tableau Cloud allowlist

## Clean Up After Testing

1. **Stop ngrok tunnels:** Ctrl+C in ngrok terminals

2. **Remove test configuration:**
```bash
cd frontend
rm .env.local
```

3. **Restore CORS in backend:**
```python
# backend/app.py
allow_origins=[
    "http://localhost:3000",
    "https://your-production-domain.com"
]
```

4. **Unpublish test workbook** (if desired) from Tableau Cloud

## Security Notes

⚠️ **Important:**

- ngrok exposes your local servers to the internet
- Anyone with the ngrok URL can access your service
- Don't use ngrok for production deployments
- Don't commit ngrok URLs to git
- Don't share ngrok URLs publicly
- Consider adding authentication for testing
- Free ngrok tunnels expire after 2 hours

## Next Steps

Once testing is complete:

1. Follow `DEPLOYMENT.md` for production deployment
2. Deploy to proper hosting (Heroku, AWS, Azure)
3. Update manifest with production URLs
4. Configure proper CORS restrictions
5. Add authentication if needed

## Cost During Testing

- **ngrok Free**: $0
- **Vertex AI API**: ~$0.01-0.10 per test (depending on usage)
- **Tableau Cloud**: Existing license

## Troubleshooting Checklist

- [ ] Backend running on localhost:8000
- [ ] Frontend running on localhost:3000
- [ ] ngrok tunnels active (both frontend & backend)
- [ ] manifest-cloud-test.trex has correct frontend ngrok URL
- [ ] frontend/.env.local has correct backend ngrok URL
- [ ] Backend CORS allows all origins
- [ ] Tableau Cloud allowlists ngrok URLs
- [ ] Manifest hosted and accessible
- [ ] Extension permissions granted
- [ ] Browser console shows no CORS errors
- [ ] ngrok web interface (localhost:4040) shows traffic

## Questions?

See main `README.md` for architecture details or `DEPLOYMENT.md` for production setup.

---

**Happy Testing! 🚀**

