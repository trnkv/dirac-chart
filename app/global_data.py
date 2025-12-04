import sys
import time
import os.path
import pandas as pd

from django.conf import settings

class GlobalData:
  """Глобальные данные, загружаемые один раз на группу процессов"""
  _df = None
  _cache_mtime = None
  _filters = None
  
  @classmethod
  def update_data(cls):
    current_mtime = time.ctime(os.path.getmtime(settings.CSV_DATA_PATH))
    if cls._cache_mtime is None or cls._cache_mtime != current_mtime:
      print(f"[PID:{os.getpid()}] Load from CSV")
      cls._df = pd.read_csv(settings.CSV_DATA_PATH)
      current_mtime = time.ctime(os.path.getmtime(settings.CSV_DATA_PATH))
      cls._df = cls._df.fillna("undefined")
      filters = {
        #"hostname": df['hostname'].unique().tolist(),
        #"model": df['cpu_model'].unique().tolist(),
        "site": sorted(cls._df['site'].unique().tolist()),
        "status": sorted(cls._df['status'].unique().tolist()),
        "owner": sorted(cls._df['owner'].unique().tolist()),
        "job_group": sorted(cls._df['job_group'].unique().tolist()),
      }
      cls._filters = filters
      cls._cache_mtime = current_mtime
      print(f"[PID:{os.getpid()}] Data loaded: {len(cls._df)} elements") 
    return cls._df

  @classmethod
  def get_filters(cls):
    cls.update_data()
    return cls._filters
  
  @classmethod
  def get_df(cls):
    cls.update_data()
    return cls._df

GlobalData.update_data()
