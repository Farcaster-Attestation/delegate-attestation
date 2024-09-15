import os
from dotenv import load_dotenv
from google.cloud import storage, bigquery
from google.oauth2 import service_account
from datetime import datetime, timedelta, timezone, time
import pandas as pd
import requests
import json
from fastapi import FastAPI

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
bucket = storage_client.bucket('dynamic_attestation_public')

app = FastAPI()

@app.post("/execute")
def execute():
  print('execute')
  checkpoint_blob = bucket.blob('mvp/checkpoint.txt')
  checkpoint = ''
  if checkpoint_blob.exists():
    checkpoint = checkpoint_blob.download_as_string().decode('utf-8')
  # query from bigquery
  query = """
    SELECT delegate,sum(cast(amount as numeric)) as voting_power FROM `curia-dao.curia_op_indexer.holders` where delegate is not null group by delegate order by sum(cast(amount as numeric)) desc limit 100
  """
  query_job = bigquery_client.query(query)
  delegates = []
  rank = 1
  current = datetime.now(timezone.utc)
  begin_of_day = datetime.combine(current, time.min)
  data_date = (begin_of_day - timedelta(days=1))
  for row in query_job:
    delegates.append({
      'rank': rank,
      'delegate': row[0],
      'amount': str(row[1]),
      'date': data_date.strftime("%Y-%m-%d"),
      'fetch_timestamp': current.strftime("%Y-%m-%d %H:%M:%S %Z%z")
    })
    rank += 1
  # write json file
  df = pd.DataFrame(delegates)
  df.to_json('delegates_without_partial_vp.json', orient='records')
  blob = bucket.blob(f'mvp/{current.strftime("%Y-%m-%d")}/delegates_without_partial_vp.json')
  blob.upload_from_filename('delegates_without_partial_vp.json')
  blob.make_public()
  os.remove('delegates_without_partial_vp.json')
  # call curia api
  params = {
    'limit': 100,
    'page': 1,
    'sort': 'delegateToken',
    'isAsc': 'false'
  }
  url = 'https://prod.op.api.curiahub.xyz/api/delegates'
  results = requests.get(url, params=params).json()
  all_delegates = []
  for delegate in results['delegates']:
    all_delegates.append({
      'rank': delegate['delegateRank'],
      'delegate': delegate['delegateAddress'],
      'ens_address': delegate['ensAddress'],
      'voting_power': delegate['delegateToken'],
      'vp': delegate['legacyDelegate'],
      'partial_vp': delegate['partialDelegate'],
      'date': data_date.strftime("%Y-%m-%d"),
      'fetch_timestamp': current.strftime("%Y-%m-%d %H:%M:%S %Z%z")
    })
  # write json file
  df = pd.DataFrame(all_delegates)
  df.to_json('delegates_with_partial_vp.json', orient='records')
  blob = bucket.blob(f'mvp/{current.strftime("%Y-%m-%d")}/delegates_with_partial_vp.json')
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
  blob = bucket.blob(f'mvp/{current.strftime("%Y-%m-%d")}/attestation_without_partial_vp.json')
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
  blob = bucket.blob(f'mvp/{current.strftime("%Y-%m-%d")}/attestation_with_partial_vp.json')
  blob.upload_from_filename('attestation_with_partial_vp.json')
  blob.make_public()
  os.remove('attestation_with_partial_vp.json')

  with open('checkpoint.txt', 'w') as f:
    f.write(current.strftime("%Y-%m-%d"))
  blob = bucket.blob('mvp/checkpoint.txt')
  blob.upload_from_filename('checkpoint.txt')
  os.remove('checkpoint.txt')