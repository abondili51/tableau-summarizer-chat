#!/bin/bash

# Script to update ngrok URLs in manifest and frontend config
# Usage: ./update-ngrok-urls.sh <frontend-ngrok-url> <backend-ngrok-url>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "Update ngrok URLs for Cloud Testing"
echo "================================================"
echo ""

# Check arguments
if [ $# -ne 2 ]; then
    echo -e "${RED}ERROR: Invalid arguments${NC}"
    echo ""
    echo "Usage:"
    echo "  ./update-ngrok-urls.sh <frontend-ngrok-url> <backend-ngrok-url>"
    echo ""
    echo "Example:"
    echo "  ./update-ngrok-urls.sh https://abc123.ngrok.io https://xyz789.ngrok.io"
    echo ""
    exit 1
fi

FRONTEND_URL=$1
BACKEND_URL=$2

# Remove trailing slashes
FRONTEND_URL=${FRONTEND_URL%/}
BACKEND_URL=${BACKEND_URL%/}

# Validate URLs
if [[ ! $FRONTEND_URL =~ ^https:// ]] || [[ ! $BACKEND_URL =~ ^https:// ]]; then
    echo -e "${RED}ERROR: URLs must start with https://${NC}"
    echo ""
    echo "Both ngrok URLs should be HTTPS (not HTTP)"
    exit 1
fi

echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL:  $BACKEND_URL"
echo ""

# Update manifest-cloud-test.trex
echo "Updating manifest-cloud-test.trex..."

if [ ! -f "manifest-cloud-test.trex" ]; then
    echo -e "${RED}ERROR: manifest-cloud-test.trex not found${NC}"
    echo "Make sure you're running this script from the project root directory"
    exit 1
fi

# Use sed to replace the URL in the manifest
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|<url>.*</url>|<url>$FRONTEND_URL</url>|g" manifest-cloud-test.trex
else
    # Linux
    sed -i "s|<url>.*</url>|<url>$FRONTEND_URL</url>|g" manifest-cloud-test.trex
fi

echo -e "${GREEN}✓ Updated manifest-cloud-test.trex${NC}"
echo ""

# Update frontend/.env.local
echo "Updating frontend/.env.local..."

echo "VITE_API_URL=$BACKEND_URL" > frontend/.env.local

echo -e "${GREEN}✓ Updated frontend/.env.local${NC}"
echo ""

echo "================================================"
echo -e "${GREEN}Configuration Updated Successfully!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Restart your frontend server:"
echo "   - Press Ctrl+C in frontend terminal"
echo "   - Run: cd frontend && npm run dev"
echo ""
echo "2. Test the URLs:"
echo "   - Frontend: $FRONTEND_URL"
echo "   - Backend:  $BACKEND_URL/health"
echo ""
echo "3. Configure Tableau Cloud:"
echo "   - Settings > Extensions > Add both URLs to allowlist"
echo ""
echo "4. Host manifest-cloud-test.trex and add to your dashboard"
echo ""
echo "For detailed instructions: TESTING_WITH_TABLEAU_CLOUD.md"
echo ""

