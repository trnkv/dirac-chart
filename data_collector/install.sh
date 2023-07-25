#!/bin/sh

mkdir -p /opt/dirac-job-analytics
cp -n config.json_example /opt/dirac-job-analytics/config.json
cp data_collector.py /opt/dirac-job-analytics/. 
chmod +x /opt/dirac-job-analytics/data_collector.py
cp /etc/cron.d/dirac-chart-update .
