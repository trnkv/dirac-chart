from django.shortcuts import render
import numpy as np
import pandas as pd
from functools import reduce
from django.http import JsonResponse, HttpResponse


def index(request):
    return render(request, 'index.html', {})


def get_filters(request):
    df = pd.read_csv(
        'static/data/data.csv',
        sep=";",
        header=0,
    )
    filters = {
        "hostnames": df['hostname'].dropna().unique().tolist(),
        "models": df['model'].dropna().unique().tolist(),
        "sites": df['site'].dropna().unique().tolist(),
        "statuses": df['status'].dropna().unique().tolist(),
        "users": df['user'].dropna().unique().tolist(),
    }
    return JsonResponse({'filters': filters})


def get_data_by_filters(request):
    df = pd.read_csv(
        'static/data/data.csv',
        sep=";",
        header=0,
    )
    filters = request.GET.getlist('filters[]')
    cols_vals = [filter.split("_") for filter in filters]
    filters = {}
    for pair in cols_vals:
        if pair[0] in filters.keys():
            filters[pair[0]].append(pair[1])
        else:
            filters[pair[0]] = [pair[1]]
    for key, value in filters.items():
        df = df.loc[df[key].isin(value)]
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=filtered_data.csv'
    df.to_csv(path_or_buf=response, index=False)
    return response
