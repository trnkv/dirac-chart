#!/usr/bin/env python3
import os
import sys
import logging
import json
import datetime
import time
import MySQLdb
import pandas as pd

execution_start_time = time.time()

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

SQL_QUERRY = """
select J.JobID as id, J.Owner as owner, J.JobName as job_name, J.JobGroup as job_group, J.Site as site, J.StartExecTime as start_time, J.EndExecTime as end_time, J.Status as status,   JP.Value as cpu_norm,  JPCT.Value as cpu_time, JPMhz.Value as cpu_time, JPWC.Value as wall_time, JPTT.Value as total_time, JPHN.Value as hostname, JPMN.Value as model, JPM.Value as memory, JPMU.Value as memory_used FROM Jobs as J  LEFT JOIN JobParameters as JP using (JobID)  LEFT JOIN JobParameters as JPCT using (JobID)  LEFT JOIN JobParameters as JPMhz using (JobID) LEFT JOIN JobParameters as JPWC using (JobID) LEFT JOIN JobParameters as JPTT using (JobID) LEFT JOIN JobParameters as JPHN using (JobID) LEFT JOIN JobParameters as JPMN using (JobID) LEFT JOIN JobParameters as JPM using (JobID) LEFT JOIN JobParameters as JPMU using (JobID) where JP.Name='CPUNormalizationFactor' and  JPCT.Name='NormCPUTime(s)' and JPMhz.Name='CPU(MHz)' and JPWC.Name='WallClockTime(s)' and JPTT.Name='TotalCPUTime(s)' and JPHN.Name='HostName' and JPMN.Name='ModelName' and JPM.Name='Memory(kB)' and JPMU.Name='MemoryUsed(kb)';"""

CONFIG_PATH = "/opt/dirac-job-analytics/config.json"

#========================================
# Config load
#========================================
config = {}
with open(CONFIG_PATH) as json_file:
  config = json.load(json_file)

dtypes = {
  'job_id': int,
  'owner': str,
  'job_name': str,
  'job_group': str,
  'site': str,
  'start_time': str,
  'end_time': str,
  'status': str,
  'cpu_norm': float,
  'cpu_time': float,
  'cpu_mhz': float,
  'wall_time': float,
  'total_time': float,
  'hostname': str,
  'cpu_model': str,
  'memory': float,
  'memory_used': float
}


#========================================
# Logger initialization
#========================================
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if 'log_level' in config:
  if config['log_level'] == 'DEBUG':
    logger.setLevel(logging.DEBUG)
stream_handler = logging.StreamHandler(stream=sys.stdout)
stream_handler.setFormatter(logging.Formatter(fmt='[%(asctime)s: %(levelname)s] %(message)s'))
logger.addHandler(stream_handler)

if 'log_file' in config:
  file_handler = logging.FileHandler(filename=config['log_file'])
  file_handler.setFormatter(logging.Formatter(fmt='[%(asctime)s: %(levelname)s] %(message)s'))
  logger.addHandler(file_handler)


def info(msg):
  logger.info(msg)

def debug(msg):
  logger.debug(msg)
  
debug(json.dumps(config))

#========================================
# Basic methods creation
#========================================

def get_data_from_dirac_db():
  dbconnect = MySQLdb.connect(config['db_host'], config['db_user'], config['db_password'], config['db_name'])

  cursor = dbconnect.cursor()
  cursor.execute(SQL_QUERRY)
  data = cursor.fetchall()
  dbconnect.close()

  info("Rows from MySQL:   " + str(len(data)))
  return data

def convert_data_to_pandas(data):
  result = []
  for row in data:
    job_info = {
      "job_id": int(row[0]),
      "owner": row[1],
      "job_name": row[2],
      "job_group": row[3],
      "site": row[4],
      "start_time": row[5],
      "end_time": row[6],
      "status": row[7],
      "cpu_norm": float(row[8]),
      "cpu_time": float(row[9]),
      "cpu_mhz": float(row[10]),
      "wall_time": float(row[11]),
      "total_time": float(row[12]),
      "hostname": row[13].decode('UTF-8'),
      "cpu_model": row[14].decode('UTF-8'),
      "memory": float(row[15]),
      "memory_used": float(row[16]),
    }
    result.append(job_info)

  df = pd.DataFrame.from_dict(result)
  df['start_time'] = pd.to_datetime(df['start_time'], utc=True)
  df['end_time'] = pd.to_datetime(df['end_time'], utc=True)

  return(df)

def filter_dataframe(df):
  # Leave just Done and Failed jobs
  df = df.loc[(df['status'] == 'Done') | (df['status'] == 'Failed')]

  info("After filtering:   " + str(len(df)))
  debug("Rows by status:\n " + str(df.status.value_counts()))

def load_csv_database():
  if os.path.isfile(config['csv_data_path']):
    df_old = pd.read_csv(config['csv_data_path'], dtype=dtypes)
    df_old['start_time'] = pd.to_datetime(df_old['start_time'], utc=True)
    df_old['end_time'] = pd.to_datetime(df_old['end_time'], utc=True)
    
    info("Rows in csv:       " + str(len(df_old)))
    return df_old
  else:
    info("CSV database is empty")
    return None

def get_merged_data(df_old, df_new):
  bottom_time_frame = df_old['start_time'].max() - datetime.timedelta(days=7)
  debug("Last start_time in CSV: " + str(df_old['start_time'].max()))
  debug("Last start_time in new data: " + str(df_new['start_time'].max()))
  df_new = df_new.loc[df_new['start_time'] > bottom_time_frame]
  df_really_old = df_old.loc[df_old['start_time'] < bottom_time_frame]
  df_old_for_merging = df_old.loc[df_old['start_time'] >= bottom_time_frame]
  debug("Rows after removing old rows from data: " + str(len(df_new)) )
  
  merged_df = pd.merge(df_old_for_merging, df_new, on='job_id', how='outer')
  for col in df_new.columns:
    if col != 'job_id':
        merged_df[col] = merged_df.apply(lambda row: row[f'{col}_y'] if not pd.isna(row[f'{col}_y']) else row[f'{col}_x'], axis=1)
        merged_df = merged_df.drop([f'{col}_x', f'{col}_y'], axis=1)
  merged_df = pd.concat([df_really_old, merged_df])
  info("Rows added: " + str(len(merged_df) - len(df_old)))
  merged_df.sort_values("job_id")
  return merged_df

def save_dataframe_to_csv(df):
  df.to_csv(config['csv_data_path'], index=False)
  debug("CSV database updated")

#========================================
# MAIN
#========================================
def main():
 data = get_data_from_dirac_db() 
 df = convert_data_to_pandas(data)
 filter_dataframe(df)
 df_old = load_csv_database()
 if df_old is not None:
   df = get_merged_data(df_old, df)
 save_dataframe_to_csv(df)
  
main()

execution_end_time = time.time()
info("Execution duration: " + str(execution_end_time - execution_start_time) + " seconds")
