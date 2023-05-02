from datetime import datetime
import pandas as pd

from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse


def index(request):
    return render(request, 'index.html', {})


def get_filters(request):
    df = pd.read_csv(settings.CSV_DATA_PATH)
    filters = {
        "hostnames": df['hostname'].fillna("undefined").unique().tolist(),
        "models": df['cpu_model'].fillna("undefined").unique().tolist(),
        "sites": df['site'].fillna("undefined").unique().tolist(),
        "statuses": df['status'].fillna("undefined").unique().tolist(),
        "owners": df['owner'].fillna("undefined").unique().tolist(),
    }
    print(filters)
    return JsonResponse({'filters': filters})


def get_data_by_filters(request):
    filters = request.GET.getlist('filters[]')
    # приходит с клиента локализованная дата
    start_datetime = datetime.strptime(request.GET.get('start'), '%Y-%m-%d %H:%M:%S')
    end_datetime = datetime.strptime(request.GET.get('end'), '%Y-%m-%d %H:%M:%S')

    # переводим её в ISO
    start_datetime_iso = start_datetime.isoformat()
    end_datetime_iso = end_datetime.isoformat()

    df = pd.read_csv(settings.CSV_DATA_PATH)
    df = df.fillna("undefined")
    df['start_time'] = pd.to_datetime(df['start_time'])
    df = df[df["start_time"].between(start_datetime_iso, end_datetime_iso)]
    df = df.sort_values(by='start_time', ascending=True)
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
    # df['x'] = df['_time']  # это делается на клиентской стороне с учетом локальной тайм-зоны
    df['y'] = df['wall_time']
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename=filtered_data.csv'
    df.to_csv(path_or_buf=response, index=False)
    return response
