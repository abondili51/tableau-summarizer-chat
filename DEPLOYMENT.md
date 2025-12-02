# Deployment Guide - Tableau Summarizer Extension

## Production Deployment Options

### Option 1: Deploy to Heroku (Recommended for Quick Start)

#### Backend Deployment

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create new Heroku app
cd backend
heroku create tableau-summarizer-api

# Set environment variables
heroku config:set GEMINI_API_KEY=your_actual_api_key

# Create Procfile
echo "web: gunicorn app:app" > Procfile

# Deploy
git init
git add .
git commit -m "Initial backend deployment"
heroku git:remote -a tableau-summarizer-api
git push heroku main

# Your API will be at: https://tableau-summarizer-api.herokuapp.com
```

#### Frontend Deployment

```bash
# Build frontend for production
cd frontend
npm run build

# Option A: Deploy to Netlify
# 1. Sign up at netlify.com
# 2. Install Netlify CLI: npm install -g netlify-cli
# 3. Deploy:
netlify deploy --prod --dir=dist

# Option B: Deploy to Vercel
# 1. Sign up at vercel.com
# 2. Install Vercel CLI: npm install -g vercel
# 3. Deploy:
vercel --prod

# Option C: Deploy to GitHub Pages
# See: https://vitejs.dev/guide/static-deploy.html#github-pages
```

#### Update Configuration

```bash
# Update frontend/.env for production
echo "VITE_API_URL=https://tableau-summarizer-api.herokuapp.com" > .env.production

# Rebuild frontend
npm run build

# Update manifest.trex with production URL
# Change <url> to your deployed frontend URL
```

---

### Option 2: Deploy to AWS

#### Backend (AWS Elastic Beanstalk)

```bash
# Install AWS EB CLI
pip install awsebcli

# Initialize EB application
cd backend
eb init -p python-3.9 tableau-summarizer

# Create environment
eb create tableau-summarizer-env

# Set environment variables
eb setenv GEMINI_API_KEY=your_actual_api_key

# Deploy
eb deploy

# Get URL
eb status
```

#### Frontend (AWS S3 + CloudFront)

```bash
# Build frontend
cd frontend
npm run build

# Install AWS CLI
# https://aws.amazon.com/cli/

# Create S3 bucket
aws s3 mb s3://tableau-summarizer-frontend

# Enable static website hosting
aws s3 website s3://tableau-summarizer-frontend \
  --index-document index.html

# Upload files
aws s3 sync dist/ s3://tableau-summarizer-frontend

# Create CloudFront distribution (optional, for HTTPS)
# Use AWS Console: https://console.aws.amazon.com/cloudfront
```

---

### Option 3: Deploy to Azure

#### Backend (Azure App Service)

```bash
# Install Azure CLI
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login
az login

# Create resource group
az group create --name tableau-summarizer-rg --location eastus

# Create App Service plan
az appservice plan create \
  --name tableau-summarizer-plan \
  --resource-group tableau-summarizer-rg \
  --sku B1 \
  --is-linux

# Create web app
az webapp create \
  --name tableau-summarizer-api \
  --resource-group tableau-summarizer-rg \
  --plan tableau-summarizer-plan \
  --runtime "PYTHON:3.9"

# Set environment variables
az webapp config appsettings set \
  --name tableau-summarizer-api \
  --resource-group tableau-summarizer-rg \
  --settings GEMINI_API_KEY=your_actual_api_key

# Deploy from local git
cd backend
git init
git add .
git commit -m "Initial commit"
az webapp deployment source config-local-git \
  --name tableau-summarizer-api \
  --resource-group tableau-summarizer-rg
git remote add azure <deployment_url>
git push azure main
```

#### Frontend (Azure Static Web Apps)

```bash
# Build frontend
cd frontend
npm run build

# Create Static Web App
az staticwebapp create \
  --name tableau-summarizer-frontend \
  --resource-group tableau-summarizer-rg \
  --source dist \
  --location eastus \
  --branch main \
  --app-location "/" \
  --output-location "dist"
```

---

### Option 4: Docker Deployment

#### Create Docker Files

**backend/Dockerfile**:
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--timeout", "120", "app:app"]
```

**frontend/Dockerfile**:
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml** (root directory):
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

**Deploy with Docker**:
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Tableau Server/Cloud Configuration

### 1. Enable Extensions

**Tableau Server**:
```bash
# Allow extensions
tsm configuration set -k api.server.enabled -v true

# Allow specific domain (if using whitelist)
tsm configuration set -k api.server.url_whitelist -v "https://your-frontend-url.com"

# Apply changes
tsm pending-changes apply
```

**Tableau Cloud**:
1. Navigate to Settings > Extensions
2. Enable "Let users run extensions on this site"
3. Add your extension URL to allowlist

### 2. Upload Extension Manifest

1. **Update manifest.trex**:
   ```xml
   <source-location>
     <url>https://your-production-frontend-url.com</url>
   </source-location>
   ```

2. **Host manifest file**:
   - Option A: Upload to same server as frontend
   - Option B: Upload to separate static hosting (S3, Azure Blob)
   - Option C: Use Tableau Extension Gallery

3. **Add to Dashboard**:
   - Drag "Extension" object to dashboard
   - Enter manifest URL: `https://your-server.com/manifest.trex`
   - Trust extension when prompted

---

## Environment Variables Reference

### Backend (.env)

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional
PORT=5000
FLASK_ENV=production
FLASK_DEBUG=False
```

### Frontend (.env.production)

```env
VITE_API_URL=https://your-backend-api-url.com
```

---

## SSL/HTTPS Configuration

**Important**: Tableau requires HTTPS for production extensions.

### Option 1: Use Platform SSL
- Heroku, Netlify, Vercel provide automatic SSL
- AWS, Azure offer managed SSL certificates

### Option 2: Let's Encrypt
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Configure web server (nginx example)
server {
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

---

## Security Checklist

- [ ] HTTPS enabled for both frontend and backend
- [ ] GEMINI_API_KEY stored as environment variable (not in code)
- [ ] CORS configured to allow only Tableau domains
- [ ] Rate limiting enabled on backend API
- [ ] Input validation on all API endpoints
- [ ] Error messages don't expose sensitive information
- [ ] Backend logs don't contain API keys or sensitive data
- [ ] Extension manifest signed (for Tableau Extension Gallery)

---

## Monitoring & Logging

### Backend Logging

Add to `backend/app.py`:
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Log all requests
@app.before_request
def log_request():
    app.logger.info(f'{request.method} {request.path}')
```

### Error Tracking

Consider integrating:
- **Sentry**: Error tracking and monitoring
- **DataDog**: Application performance monitoring
- **CloudWatch** (AWS) or **Application Insights** (Azure)

---

## Testing Checklist

Before production deployment:

- [ ] Test with multiple sheets selected
- [ ] Test with various filter combinations
- [ ] Test auto-refresh on filter change
- [ ] Test with large datasets (1000+ rows)
- [ ] Test error handling (API failures, network issues)
- [ ] Test on Tableau Desktop
- [ ] Test on Tableau Server/Cloud
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test copy and download features
- [ ] Verify HTTPS works correctly
- [ ] Check API rate limits
- [ ] Monitor backend response times

---

## Rollback Procedure

### Heroku
```bash
heroku releases
heroku rollback v123
```

### AWS EB
```bash
eb deploy --version <previous-version>
```

### Docker
```bash
docker-compose down
git checkout <previous-commit>
docker-compose up -d
```

---

## Support & Maintenance

### Updating Gemini API

If Google updates Gemini API:
```bash
cd backend
pip install --upgrade google-generativeai
pip freeze > requirements.txt
# Test locally, then redeploy
```

### Updating Tableau Extensions API

Monitor: https://tableau.github.io/extensions-api/

Update `manifest.trex` `min-api-version` if needed.

---

## Cost Estimation

### Google Gemini API
- Free tier: 60 requests/minute
- Paid tier: ~$0.001 per 1K characters
- Estimate: ~$5-20/month for typical usage

### Hosting
- **Heroku**: $7-25/month (Hobby/Basic tier)
- **AWS**: $10-30/month (t2.micro + S3)
- **Azure**: $10-25/month (B1 + Static Web App)
- **Netlify/Vercel**: Free for frontend (usage-based billing)

**Total Estimated Cost**: $15-50/month

---

## Performance Optimization

### Backend
- Enable gunicorn workers: `gunicorn -w 4 app:app`
- Add Redis for caching similar queries
- Implement request throttling

### Frontend
- Enable compression in build
- Use CDN for static assets
- Lazy load components

### Tableau
- Limit data extraction to relevant columns
- Set max rows limit (default 1000)
- Cache summaries for identical requests

---

## Backup & Recovery

### Settings Backup
```bash
# Export Tableau extension settings
# (automatic via Tableau workbook)

# Backup environment variables
heroku config -s > .env.backup  # Heroku
aws ssm get-parameters --names /app/* --with-decryption  # AWS
```

---

For questions or issues, refer to main README.md or submit an issue.

