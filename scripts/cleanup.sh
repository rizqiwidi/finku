#!/bin/bash

# Cleanup script for Finku
# Removes unnecessary files and folders before deployment

echo "🧹 Cleaning up unnecessary files..."

# Remove example files
if [ -d "examples" ]; then
    echo "Removing examples/ folder..."
    rm -rf examples/
fi

# Remove download folder
if [ -d "download" ]; then
    echo "Removing download/ folder..."
    rm -rf download/
fi

# Remove mini-services folder
if [ -d "mini-services" ]; then
    echo "Removing mini-services/ folder..."
    rm -rf mini-services/
fi

# Remove log files
echo "Removing log files..."
rm -f dev.log server.log *.log 2>/dev/null

# Remove PostgreSQL schema backup (keep main schema)
if [ -f "prisma/schema.postgresql.prisma" ]; then
    echo "Note: prisma/schema.postgresql.prisma kept for reference"
fi

# Remove any node_modules cache
if [ -d ".next/cache" ]; then
    echo "Clearing Next.js cache..."
    rm -rf .next/cache/
fi

# Remove .env.local if exists
if [ -f ".env.local" ]; then
    echo "Removing .env.local..."
    rm -f .env.local
fi

# Remove any test files
find . -name "*.test.ts" -type f -delete 2>/dev/null
find . -name "*.test.tsx" -type f -delete 2>/dev/null
find . -name "*.spec.ts" -type f -delete 2>/dev/null
find . -name "*.spec.tsx" -type f -delete 2>/dev/null

echo "✅ Cleanup complete!"
echo ""
echo "Files ready for deployment:"
ls -la | grep -v "node_modules"
