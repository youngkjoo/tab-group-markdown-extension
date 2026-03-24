#!/bin/bash

# Auto-generate a timestamp for the log file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOGFILE="test_results_$TIMESTAMP.log"

echo "🚀 Running Tab Group Extension Tests..."
echo "Logs will be recorded in: $LOGFILE"
echo "------------------------------------------------"

# Initialize the log file
echo "Test Run Timestamp: $(date)" > "$LOGFILE"
echo "================================================" >> "$LOGFILE"

# Run Unit Tests
echo "Running Unit Tests (popup.test.js)..."
echo -e "\n--- UNIT TESTS ---" >> "$LOGFILE"
npm test 2>&1 | tee -a "$LOGFILE"

echo "------------------------------------------------"

# Run UI Integration Tests
echo "Running UI Integration Tests (integration.test.js)..."
echo -e "\n--- UI INTEGRATION TESTS ---" >> "$LOGFILE"
npm run test:ui 2>&1 | tee -a "$LOGFILE"

echo "------------------------------------------------"
echo "✅ Testing finished! Review your comprehensive results in $LOGFILE"
