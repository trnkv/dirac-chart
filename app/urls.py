from django.urls import path
from . import views

app_name = 'app'

urlpatterns = [
    path('', views.index, name='index'),
    path('get_filters', views.get_filters, name='get_filters'),
    path('get_all_data', views.get_all_data, name='get_all_data'),
    path('get_data_by_filters', views.get_data_by_filters, name='get_data_by_filters'),
]