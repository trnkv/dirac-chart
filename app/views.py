from dateutil import parser
from django.shortcuts import render
import pandas as pd
import json
import csv
from django.http import JsonResponse


def index(request):
    return render(request, 'index.html', {})


def get_data(request):
    df = pd.read_csv(
        'static/data/dirac-cache (копия).csv',
        sep=";",
        header=1,
        names=['#datatype', 'result', 'table', '_time', 'hostname', 'model', 'site', 'status', 'user', 'cpu_norm', 'job_id', 'wall_time']
    )
    filters = {
        "hostnames": df.hostname.dropna().unique().tolist(),
        "models": df.model.dropna().unique().tolist(),
        "sites": df.site.dropna().unique().tolist(),
        "statuses": df.status.dropna().unique().tolist(),
        "users": df.user.dropna().unique().tolist(),
    }
    return JsonResponse({
        'data': df.to_json(orient='records', lines=True),
        'filters': filters
    })