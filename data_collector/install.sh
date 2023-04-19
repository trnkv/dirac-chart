#!/bin/sh

mkdir /opt/dirac-job-analytics
cp config.json_example /opt/dirac-job-analytics/config.json
cp data_collector.py /opt/dirac-job-analytics/. 
chmod +x data_collector.py
