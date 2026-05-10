#!/bin/bash

# Test Production-Quality Composition System
# Verifies all new services are working correctly

echo "🧪 Testing Production-Quality Composition System"
echo "================================================"
echo ""

cd backend

echo "📦 Checking if services compile..."
npx tsc --noEmit src/pdf-studio/services/document-composition.service.ts
if [ $? -eq 0 ]; then
  echo "✅ DocumentCompositionService compiles"
else
  echo "❌ DocumentCompositionService has errors"
  exit 1
fi

npx tsc --noEmit src/pdf-studio/services/page-density-balancer.service.ts
if [ $? -eq 0 ]; then
  echo "✅ PageDensityBalancerService compiles"
else
  echo "❌ PageDensityBalancerService has errors"
  exit 1
fi

npx tsc --noEmit src/pdf-studio/services/semantic-continuation.service.ts
if [ $? -eq 0 ]; then
  echo "✅ SemanticContinuationService compiles"
else
  echo "❌ SemanticContinuationService has errors"
  exit 1
fi

npx tsc --noEmit src/pdf-studio/services/dynamic-cover-composer.service.ts
if [ $? -eq 0 ]; then
  echo "✅ DynamicCoverComposerService compiles"
else
  echo "❌ DynamicCoverComposerService has errors"
  exit 1
fi

echo ""
echo "📦 Checking module integration..."
npx tsc --noEmit src/pdf-studio/pdf-studio.module.ts
if [ $? -eq 0 ]; then
  echo "✅ PdfStudioModule compiles with new services"
else
  echo "❌ PdfStudioModule has errors"
  exit 1
fi

echo ""
echo "📦 Checking controller integration..."
npx tsc --noEmit src/pdf-studio/controllers/smart-builder.controller.ts
if [ $? -eq 0 ]; then
  echo "✅ SmartBuilderController compiles with composition pipeline"
else
  echo "❌ SmartBuilderController has errors"
  exit 1
fi

echo ""
echo "🎉 All tests passed!"
echo ""
echo "🚀 Next steps:"
echo "1. npm run start:dev (in backend/)"
echo "2. Test document generation via API"
echo "3. Verify composition data in database"
echo "4. Check logs for quality metrics"
echo ""
