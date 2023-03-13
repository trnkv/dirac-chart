from datetime import datetime
from django.shortcuts import render
import pandas as pd
import pytz
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
    filters = request.GET.getlist('filters[]')
    start_datetime = datetime.strptime(request.GET.get('start'), '%Y-%m-%d %H:%M:%S')
    end_datetime = datetime.strptime(request.GET.get('end'), '%Y-%m-%d %H:%M:%S')

    local = pytz.timezone("Europe/Moscow")
    local_start_datetime = local.localize(start_datetime, is_dst=None)
    utc_start_datetime = local_start_datetime.astimezone(pytz.utc)
    local_end_datetime = local.localize(end_datetime, is_dst=None)
    utc_end_datetime = local_end_datetime.astimezone(pytz.utc)

    df = pd.read_csv(
        'static/data/data.csv',
        sep=";",
        header=0
    )

    df['_time'] = pd.to_datetime(df['_time'])
    df['_time'] = df['_time'].apply(pd.Timestamp)

    utc_start_datetime64 = pd.Timestamp(utc_start_datetime)
    utc_end_datetime64 = pd.Timestamp(utc_end_datetime)

    df = df[df["_time"].between(utc_start_datetime64, utc_end_datetime64)]

    df = df.sort_values(by='_time', ascending=True)
    cols_vals = [filter.split("_") for filter in filters]
    filters = {}
    for pair in cols_vals:
        if pair[0] in filters.keys():
            filters[pair[0]].append(pair[1])
        else:
            filters[pair[0]] = [pair[1]]
    for key, value in filters.items():
        df = df.loc[df[key].isin(value)]
    df['id'] = df.index
    df['x'] = df['_time']
    df['y'] = df['wall_time']
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=filtered_data.csv'
    df.to_csv(path_or_buf=response, index=False)
    return response