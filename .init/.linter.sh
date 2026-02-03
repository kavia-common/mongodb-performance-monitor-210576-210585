#!/bin/bash
cd /home/kavia/workspace/code-generation/mongodb-performance-monitor-210576-210585/performance_monitor_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

