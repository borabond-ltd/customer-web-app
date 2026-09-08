#!/bin/bash

echo "🚀 Starting optimized build process..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf dist

# Install only production dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Run type check
echo "🔍 Running type check..."
npx tsc --noEmit

# Build with optimizations
echo "🏗️  Building optimized production bundle..."
NODE_ENV=production npm run build

# Analyze bundle size
echo "📊 Analyzing bundle size..."
npm run build:analyze

echo "✅ Optimized build completed!"
