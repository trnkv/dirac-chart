from datetime import datetime
import pandas as pd
from pprint import pprint as pp
import time
import gzip
import io
from random import randint

from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse

from .global_data import GlobalData

def index(request):
    #return render(request, 'index.html', {})
    return render(request, 'index.html', {'randint': str(randint(1, 99999))})


def get_filters(request):
    filters = GlobalData.get_filters()
    print(filters)
    return JsonResponse({'filters': filters})

def get_all_data(request):
    df = GlobalData.get_df().copy(deep=True)
    print("Get all Data " + str(len(df)))
    buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode='wb') as f:
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        f.write(csv_buffer.getvalue().encode('utf-8'))
    buffer.seek(0)
    print("Data written to buffer")
    response = HttpResponse(buffer, content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'inline; filename="data.csv"'
    response['Content-Encoding'] = 'gzip'
    print("Sending response")

    return response

def get_data_by_filters(request):
    filters = request.GET.getlist('filters[]')
    pp(filters)
    # приходит с клиента локализованная дата
    start_datetime = datetime.strptime(request.GET.get('start'), '%Y-%m-%d %H:%M:%S')
    end_datetime = datetime.strptime(request.GET.get('end'), '%Y-%m-%d %H:%M:%S')
    pp(start_datetime)
    pp(end_datetime)

    # переводим её в ISO
    start_datetime_iso = start_datetime.isoformat()
    end_datetime_iso = end_datetime.isoformat()

    df = GlobalData.get_df().copy(deep=True)
    df['start_time'] = pd.to_datetime(df['start_time'])
    df = df[df["start_time"].between(start_datetime_iso, end_datetime_iso)]
    df = df.sort_values(by='start_time', ascending=True)
    pp(len(df))
    cols_vals = [filter.split(":") for filter in filters]

    filters = {}
    for pair in cols_vals:
        if pair[0] in filters.keys():
            filters[pair[0]].append(pair[1])
        else:
            filters[pair[0]] = [pair[1]]

    for key, value in filters.items():
        df = df.loc[df[key].isin(value)]

    pp("df after filtering: " + str(len(df)))

    buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode='wb') as f:
        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        f.write(csv_buffer.getvalue().encode('utf-8'))
    buffer.seek(0)
    print("Data written to buffer")
    response = HttpResponse(buffer, content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'inline; filename="data.csv"'
    response['Content-Encoding'] = 'gzip'
    print("Sending response")
    return response

