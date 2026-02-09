#!/bin/bash

# Production Configuration Verification Script
# This script checks if all required environment variables and configurations are set

set -e

echo "🔍 Verifying Production Configuration..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check if a variable is set
check_env_var() {
    local var_name=$1
    local is_required=$2
    local description=$3

    if [ -z "${!var_name}" ]; then
        if [ "$is_required" = "true" ]; then
            echo -e "${RED}✗${NC} $var_name is not set - $description"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠${NC} $var_name is not set (optional) - $description"
            ((WARNINGS++))
        fi
    else
        echo -e "${GREEN}✓${NC} $var_name is set"
    fi
}

# Function to check if a value is using example/default
check_not_example() {
    local var_name=$1
    local example_value=$2

    if [ "${!var_name}" = "$example_value" ]; then
        echo -e "${RED}✗${NC} $var_name is using example value! Change it for production."
        ((ERRORS++))
    fi
}

echo "📋 Checking Environment Variables..."
echo ""

# Load .env if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓${NC} .env file found and loaded"
else
    echo -e "${YELLOW}⚠${NC} .env file not found (using system environment)"
fi

echo ""

# Required variables
check_env_var "DATABASE_URL" "true" "Database connection string"
check_env_var "KEY_ENCRYPTION_SECRET" "true" "32-byte base64 key for encrypting API keys"
check_env_var "ADMIN_API_TOKEN" "true" "Admin API authentication token"

# Check for example values
check_not_example "KEY_ENCRYPTION_SECRET" "tBaUyjIKnpyPOkkPN2n/3jPypcl0HkbbDzV6IuJ7WyY="
check_not_example "ADMIN_API_TOKEN" "2f6d35ecf4d6d54cb5bb67828173813d8ef84d04fec2f5c5"

echo ""
echo "🌐 Checking Server Configuration..."
echo ""

check_env_var "HOST" "false" "Server host (default: 0.0.0.0)"
check_env_var "PORT" "false" "Server port (default: 8787)"

echo ""
echo "⚡ Checking Rate Limiting Configuration..."
echo ""

check_env_var "MCP_RATE_LIMIT_PER_MINUTE" "false" "Per-client rate limit (default: 60)"
check_env_var "MCP_GLOBAL_RATE_LIMIT_PER_MINUTE" "false" "Global rate limit (default: 600)"

echo ""
echo "🔐 Checking Security Configuration..."
echo ""

check_env_var "TAVILY_USAGE_HASH_SECRET" "false" "Secret for HMAC query hashing (recommended)"
check_env_var "BRAVE_USAGE_HASH_SECRET" "false" "Secret for HMAC query hashing (recommended)"

echo ""
echo "📊 Checking Database..."
echo ""

# Check if database file exists (for SQLite)
if [[ $DATABASE_URL == file:* ]]; then
    DB_PATH=$(echo $DATABASE_URL | sed 's/file://')
    if [ -f "$DB_PATH" ]; then
        echo -e "${GREEN}✓${NC} Database file exists: $DB_PATH"

        # Check if database has tables
        TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
        if [ "$TABLE_COUNT" -gt 0 ]; then
            echo -e "${GREEN}✓${NC} Database has $TABLE_COUNT tables"
        else
            echo -e "${RED}✗${NC} Database has no tables. Run migrations first!"
            ((ERRORS++))
        fi
    else
        echo -e "${YELLOW}⚠${NC} Database file does not exist: $DB_PATH"
        echo "   Run: cd packages/db && npx prisma migrate deploy"
        ((WARNINGS++))
    fi
fi

echo ""
echo "🔧 Checking Build..."
echo ""

# Check if build artifacts exist
if [ -d "packages/bridge-server/dist" ]; then
    echo -e "${GREEN}✓${NC} bridge-server build exists"
else
    echo -e "${RED}✗${NC} bridge-server not built. Run: npm run build"
    ((ERRORS++))
fi

if [ -d "packages/admin-ui/dist" ]; then
    echo -e "${GREEN}✓${NC} admin-ui build exists"
else
    echo -e "${YELLOW}⚠${NC} admin-ui not built. Run: cd packages/admin-ui && npm run build"
    ((WARNINGS++))
fi

echo ""
echo "📦 Checking Dependencies..."
echo ""

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
else
    echo -e "${RED}✗${NC} node_modules not found. Run: npm install"
    ((ERRORS++))
fi

echo ""
echo "🔒 Checking File Permissions..."
echo ""

# Check .env permissions (should not be world-readable)
if [ -f .env ]; then
    PERMS=$(stat -f "%Lp" .env 2>/dev/null || stat -c "%a" .env 2>/dev/null)
    if [ "$PERMS" = "600" ] || [ "$PERMS" = "400" ]; then
        echo -e "${GREEN}✓${NC} .env has secure permissions ($PERMS)"
    else
        echo -e "${YELLOW}⚠${NC} .env permissions are $PERMS (recommended: 600)"
        echo "   Run: chmod 600 .env"
        ((WARNINGS++))
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC} Ready for production deployment."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found.${NC} Review before deploying."
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found.${NC}"
    echo "Please fix the errors before deploying to production."
    exit 1
fi
