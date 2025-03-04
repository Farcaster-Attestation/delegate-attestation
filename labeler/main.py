import os
from dotenv import load_dotenv
load_dotenv()

from google.cloud import storage, bigquery
from google.oauth2 import service_account
from datetime import datetime, timedelta, timezone, time
import pandas as pd
import requests
import json
import duckdb
from fastapi import FastAPI
from subgraph import query_delegates, query_subdelegates, get_proxy_address, fetch_daily_delegates, fetch_daily_subdelegates

def save_to_storage(datetime,filename, delegates, bucket):
  df = pd.DataFrame(delegates)
  df.to_json(filename, orient='records')
  blob = bucket.blob(f'mvp/{datetime}/delegates_without_partial_vp.json')
  blob.upload_from_filename('delegates_without_partial_vp.json')
  blob.make_public()
  os.remove(filename)

def calculate_diff(checkpoint_delegates_json, current_delegates_json):
  checkpoint_delegates = map(lambda x: x['delegate'], checkpoint_delegates_json)
  current_delegates = map(lambda x: x['delegate'], current_delegates_json)
  checkpoint = set(list(checkpoint_delegates))
  current = set(list(current_delegates))
  revoke = checkpoint - current
  issue = current - checkpoint
  return list(revoke), list(issue)

load_dotenv()
info = {
  "project_id": os.getenv("GCP_PROJECT_ID"),
  "client_email": os.getenv("GCP_CLIENT_EMAIL"),
  "private_key": os.getenv("GCP_PRIVATE_KEY").replace("\\n","\n"),
  "token_uri": "https://oauth2.googleapis.com/token"
}
credential = service_account.Credentials.from_service_account_info(info)
storage_client = storage.Client(credentials=credential)
bigquery_client = bigquery.Client(credentials=credential)
bucket_name = os.getenv("GCP_BUCKET_NAME")
bucket = storage_client.bucket(bucket_name)

app = FastAPI()

def execute(date):
  print('execute')
  # update data first
  begin_of_day = datetime.combine(date, time.min)
  data_date = (begin_of_day - timedelta(days=1))
  data_date_str = data_date.strftime("%Y-%m-%d")
  delegates_df = query_delegates(data_date_str)
  fetch_daily_delegates(data_date.timestamp())
  fetch_daily_subdelegates(data_date.timestamp())
  # load checkpoint
  checkpoint_blob = bucket.blob('mvp/checkpoint.txt')
  checkpoint = ''
  if checkpoint_blob.exists():
    checkpoint = checkpoint_blob.download_as_string().decode('utf-8')
  # calculate direct voting power
  delegates = []
  rank = 1
  for row in delegates_df.itertuples():
    if rank > 100:
      break
    delegates.append({
      'rank': rank,
      'delegate': row.delegate,
      'amount': row.directVotingPower,
      'date': data_date.strftime("%Y-%m-%d"),
      'fetch_timestamp': date.strftime("%Y-%m-%d %H:%M:%S %Z%z")
    })
    rank += 1
  # write json file
  all_df = pd.DataFrame(delegates)
  all_df.to_json('delegates_without_partial_vp.json', orient='records')
  blob = bucket.blob(f'mvp/{date.strftime("%Y-%m-%d")}/delegates_without_partial_vp.json')
  blob.upload_from_filename('delegates_without_partial_vp.json')
  blob.make_public()
  os.remove('delegates_without_partial_vp.json')
  # calculate with advanced voting power
  ## get subdelegations
  subdelegations_df = query_subdelegates(data_date_str)
  all_subdelegations = subdelegations_df.to_dict(orient='records')
  delegate_map = {}
  proxy_map = {}
  for row in delegates_df.itertuples():
    delegate_map[row.delegate] = {
      'directVotingPower': int(row.directVotingPower),
      'advancedVotingPower': 0,
      'tempVotingPower': int(row.directVotingPower)
    }
  for subdelegate in all_subdelegations:
    from_address = subdelegate['from']
    if from_address not in proxy_map:
      proxy_address = get_proxy_address(from_address)
      proxy_map[from_address] = proxy_address
    proxy_address = proxy_map[from_address]
    if proxy_address not in delegate_map:
      delegate_map[proxy_address] = {
        'directVotingPower': 0,
        'advancedVotingPower': 0,
        'tempVotingPower': 0
      }
    if subdelegate['to'] not in delegate_map:
      delegate_map[subdelegate['to']] = {
        'directVotingPower': 0,
        'advancedVotingPower': 0,
        'tempVotingPower': 0
      }
    source_delegate = delegate_map[proxy_address]
    target_delegate = delegate_map[subdelegate['to']]
    allowance_type = subdelegate['allowanceType']
    allowance = int(subdelegate['allowance'])
    if allowance_type == 0:
      # absolute
      delegated_vp = min(allowance, source_delegate['tempVotingPower'])
      target_delegate['advancedVotingPower'] += delegated_vp
      source_delegate['tempVotingPower'] -= delegated_vp
    else:
      # relative
      delegated_vp = 0
      if allowance > 100000:
        delegated_vp = source_delegate['tempVotingPower']
      else:
        delegated_vp = source_delegate['directVotingPower'] * allowance / 100000
        delegated_vp = min(delegated_vp, source_delegate['tempVotingPower'])
      target_delegate['advancedVotingPower'] += delegated_vp
      source_delegate['tempVotingPower'] -= delegated_vp
    
  advanced_delegates = []
  for delegate in delegate_map:
    advanced_delegates.append({
      'delegate': delegate,
      'directVotingPower': delegate_map[delegate]['directVotingPower'] / 1e18,
      'advancedVotingPower': delegate_map[delegate]['advancedVotingPower'] / 1e18,
      'totalVotingPower': (delegate_map[delegate]['directVotingPower'] + delegate_map[delegate]['tempVotingPower'])/1e18,
      'date': data_date.strftime("%Y-%m-%d"),
      'fetch_timestamp': date.strftime("%Y-%m-%d %H:%M:%S %Z%z")
    })
  df = pd.DataFrame(advanced_delegates)
  con = duckdb.connect()
  con.execute("CREATE TABLE delegates as select * from df")
  results = con.execute("SELECT * FROM delegates order by cast(totalVotingPower as double) desc limit 100")
  temp_delegates = results.fetchdf().to_dict(orient='records')
  all_delegates = []
  rank = 1
  for delegate in temp_delegates:
    all_delegates.append({
      'rank': rank,
      'delegate': delegate['delegate'],
      'vp': delegate['directVotingPower'],
      'partial_vp': delegate['advancedVotingPower'],
      'voting_power': delegate['totalVotingPower'],
      'date': data_date.strftime("%Y-%m-%d"),
      'fetch_timestamp': date.strftime("%Y-%m-%d %H:%M:%S %Z%z")
    })
    rank += 1
  df = pd.DataFrame(all_delegates)
  df.to_json('delegates_with_partial_vp.json', orient='records')
  blob = bucket.blob(f'mvp/{date.strftime("%Y-%m-%d")}/delegates_with_partial_vp.json')
  blob.upload_from_filename('delegates_with_partial_vp.json')
  blob.make_public()
  os.remove('delegates_with_partial_vp.json')

  # prepare list of delegates by comparing with latest checkpoint
  checkpoint_delegates_json = []
  if checkpoint != '':
    print(checkpoint)
    checkpoint_delegates_text = bucket.blob(f'mvp/{checkpoint}/delegates_without_partial_vp.json').download_as_string().decode('utf-8')
    checkpoint_delegates_json = json.loads(checkpoint_delegates_text)
  revoke_delegates, issue_delegates = calculate_diff(checkpoint_delegates_json, delegates)
  attestation_info = {
    'issue': issue_delegates,
    'revoke': revoke_delegates,
    'date': data_date.strftime("%Y-%m-%d"),
  }
  with open('attestation_without_partial_vp.json', 'w') as f:
    json.dump(attestation_info, f)
  blob = bucket.blob(f'mvp/{date.strftime("%Y-%m-%d")}/attestation_without_partial_vp.json')
  blob.upload_from_filename('attestation_without_partial_vp.json')
  blob.make_public()
  os.remove('attestation_without_partial_vp.json')

  checkpoint_all_delegates_json = []
  if checkpoint != '':
    checkpoint_all_delegates_text = bucket.blob(f'mvp/{checkpoint}/delegates_with_partial_vp.json').download_as_string().decode('utf-8')
    checkpoint_all_delegates_json = json.loads(checkpoint_all_delegates_text)
  revoke_all_delegates, issue_all_delegates = calculate_diff(checkpoint_all_delegates_json, all_delegates)
  attestation_info = {
    'issue': issue_all_delegates,
    'revoke': revoke_all_delegates,
    'date': data_date.strftime("%Y-%m-%d"),
  }
  with open('attestation_with_partial_vp.json', 'w') as f:
    json.dump(attestation_info, f)
  blob = bucket.blob(f'mvp/{date.strftime("%Y-%m-%d")}/attestation_with_partial_vp.json')
  blob.upload_from_filename('attestation_with_partial_vp.json')
  blob.make_public()
  os.remove('attestation_with_partial_vp.json')

  with open('checkpoint.txt', 'w') as f:
    f.write(date.strftime("%Y-%m-%d"))
  blob = bucket.blob('mvp/checkpoint.txt')
  blob.upload_from_filename('checkpoint.txt')
  os.remove('checkpoint.txt')

@app.post("/fetch/:{date}")
def handle_fetch(date: str):
  print('fetch')
  data_date = datetime.strptime(date, "%Y-%m-%d")
  fetch_daily_delegates(data_date.timestamp())
  fetch_daily_subdelegates(data_date.timestamp())

@app.post("/execute")
def handle_execute():
  current = datetime.now(timezone.utc)
  execute(current)

@app.post("/execute/:{date}")
def handle_execute(date: str):
  current = datetime.strptime(date, "%Y-%m-%d")
  execute(current)