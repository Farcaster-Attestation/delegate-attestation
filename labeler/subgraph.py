import requests
import json
from google.cloud import storage, bigquery
from google.oauth2 import service_account
from datetime import datetime, timedelta, timezone, time
from time import sleep
from web3 import Web3
import os

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

url = os.getenv("SUBGRAPH_URL")
api_key = os.getenv("SUBGRAPH_API_KEY")
daily_balance_table_id = os.getenv("BIGQUERY_DAILY_BALANCE_TABLE_ID")
daily_delegate_table_id = os.getenv("BIGQUERY_DAILY_DELEGATE_TABLE_ID")
daily_subdelegate_table_id = os.getenv("BIGQUERY_DAILY_SUBDELEGATE_TABLE_ID")
web3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
alligator_address = Web3.to_checksum_address(os.getenv("ALLIGATOR_ADDRESS"))
with open('AlligatorOPV5.json') as f:
  alligator_abi = json.load(f)
alligator = web3.eth.contract(address=alligator_address, abi=alligator_abi)

def fetch_daily_balances(date: int):
  print(date)
  # check and create table if not exists
  try:
    table = bigquery_client.get_table(daily_balance_table_id)
  except:
    schema = [
      bigquery.SchemaField("date", "DATE", mode="REQUIRED"),
      bigquery.SchemaField("account", "STRING", mode="REQUIRED"),
      bigquery.SchemaField("balance", "STRING", mode="REQUIRED")
    ]
    partition = bigquery.TimePartitioning(
      bigquery.TimePartitioningType.DAY,
      "date"
    )
    table = bigquery.Table(daily_balance_table_id, schema=schema)
    table.time_partitioning = partition
    table.clustering_fields = ["account"]
    table = bigquery_client.create_table(table)
  # delete existing data
  dateString = datetime.fromtimestamp(date, timezone.utc).strftime("%Y-%m-%d")
  bigquery_client.query(f"DELETE FROM `{daily_balance_table_id}` WHERE date = '{dateString}'")
  # query from subgraph
  skip = 0
  last_id = ""
  while True:
    balanceObjects = []
    query = """
    query getDailyBalances($datetime: Int!, $skip: Int!, $last_id: String) {
      dailyBalances(where:{date: $datetime, id_gt: $last_id }, orderBy: account, orderDirection: asc, first:1000) {
        id
        date
        account
        balance
      }
    }
    """
    variables = {
      "datetime": int(date),
      "skip": skip,
      "last_id": last_id
    }
    json = {
      "query": query,
      "variables": variables
    }
    header = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + api_key
    }
    response = requests.post(url, json=json, headers=header)
    data = response.json()
    print(skip)
    balances = data['data']['dailyBalances']
    for balance in balances:
      balanceObjects.append({
        "date": datetime.fromtimestamp(balance['date'], timezone.utc).strftime("%Y-%m-%d") ,
        "account": balance['account'],
        "balance": balance['balance']
      })
    skip += 1000
    sleep(5)
    print(len(balanceObjects))
    if len(balanceObjects) > 0:
      bigquery_client.insert_rows_json(daily_balance_table_id, balanceObjects)
      last_id = balances[-1]['id']
    if len(balances) < 1000:
      break

def fetch_daily_delegates(date: int):
  print(date)
  # check and create table if not exists
  try:
    table = bigquery_client.get_table(daily_delegate_table_id)
  except:
    schema = [
      bigquery.SchemaField("date", "DATE", mode="REQUIRED"),
      bigquery.SchemaField("delegate", "STRING", mode="REQUIRED"),
      bigquery.SchemaField("directVotingPower", "STRING", mode="REQUIRED")
    ]
    partition = bigquery.TimePartitioning(
      bigquery.TimePartitioningType.DAY,
      "date"
    )
    table = bigquery.Table(daily_delegate_table_id, schema=schema)
    table.time_partitioning = partition
    table.clustering_fields = ["delegate"]
    table = bigquery_client.create_table(table)
  # delete existing data
  dateString = datetime.fromtimestamp(date, timezone.utc).strftime("%Y-%m-%d")
  bigquery_client.query(f"DELETE FROM `{daily_delegate_table_id}` WHERE date = '{dateString}'")
  # query from subgraph
  skip = 0
  last_id = ""
  while True:
    delegatesObjects = []
    query = """
    query getDailyDelegates($datetime: Int!, $skip: Int!, $last_id: String) {
      dailyDelagates(where:{date: $datetime, id_gt: $last_id }, orderBy: delegate, orderDirection: asc, first:1000) {
        id
        date
        delegate
        directVotingPower
      }
    }
    """
    variables = {
      "datetime": int(date),
      "skip": skip,
      "last_id": last_id
    }
    json = {
      "query": query,
      "variables": variables
    }
    header = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + api_key
    }
    response = requests.post(url, json=json, headers=header)
    data = response.json()
    print(data)
    delegates = data['data']['dailyDelagates']
    for delegate in delegates:
      delegatesObjects.append({
        "date": datetime.fromtimestamp(delegate['date'], timezone.utc).strftime("%Y-%m-%d") ,
        "delegate": delegate['delegate'],
        "directVotingPower": delegate['directVotingPower']
      })
    skip += 1000
    sleep(5)
    print(skip)
    if len(delegatesObjects) > 0:
      bigquery_client.insert_rows_json(daily_delegate_table_id, delegatesObjects)
      last_id = delegates[-1]['id']
    if len(delegates) < 1000:
      break

def fetch_daily_subdelegates(date: int):
  print(date)
  # check and create table if not exists
  try:
    table = bigquery_client.get_table(daily_subdelegate_table_id)
  except:
    schema = [
      bigquery.SchemaField("date", "DATE", mode="REQUIRED"),
      bigquery.SchemaField("from", "STRING", mode="REQUIRED"),
      bigquery.SchemaField("to", "STRING", mode="REQUIRED"),
      bigquery.SchemaField("maxRedelegations", "INT64", mode="REQUIRED"),
      bigquery.SchemaField("blocksBeforeVoteCloses", "INT64", mode="REQUIRED"),
      bigquery.SchemaField("notValidBefore", "INT64", mode="REQUIRED"),
      bigquery.SchemaField("notValidAfter", "INT64", mode="REQUIRED"),
      bigquery.SchemaField("customRule", "STRING", mode="REQUIRED"),
      bigquery.SchemaField("allowanceType", "INT64", mode="REQUIRED"),
      bigquery.SchemaField("allowance", "STRING", mode="REQUIRED")
    ]
    partition = bigquery.TimePartitioning(
      bigquery.TimePartitioningType.DAY,
      "date"
    )
    table = bigquery.Table(daily_subdelegate_table_id, schema=schema)
    table.time_partitioning = partition
    table.clustering_fields = ["from", "to"]
    table = bigquery_client.create_table(table)
  # delete existing data
  dateString = datetime.fromtimestamp(date, timezone.utc).strftime("%Y-%m-%d")
  bigquery_client.query(f"DELETE FROM `{daily_subdelegate_table_id}` WHERE date = '{dateString}'")
  # query from subgraph
  skip = 0
  last_id = ""
  while True:
    subdelegatesObjects = []
    query = """
    query getDailySubdelegates($datetime: Int!, $skip: Int!, $last_id: String) {
      dailySubDelegations(where:{date: $datetime, id_gt: $last_id }, orderBy: id, orderDirection: asc, first:1000) {
        id
        date
        from
        to
        maxRedelegations
        blocksBeforeVoteCloses
        notValidBefore
        notValidAfter
        customRule
        allowanceType
        allowance
      }
    }
    """
    variables = {
      "datetime": int(date),
      "skip": skip,
      "last_id": last_id
    }
    json = {
      "query": query,
      "variables": variables
    }
    header = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + api_key
    }
    response = requests.post(url, json=json, headers=header)
    data = response.json()
    subdelegates = data['data']['dailySubDelegations']
    for subdelegate in subdelegates:
      subdelegatesObjects.append({
        "date": datetime.fromtimestamp(subdelegate['date'], timezone.utc).strftime("%Y-%m-%d") ,
        "from": subdelegate['from'],
        "to": subdelegate['to'],
        "maxRedelegations": int(subdelegate['maxRedelegations']),
        "blocksBeforeVoteCloses": int(subdelegate['blocksBeforeVoteCloses']),
        "notValidBefore": int(subdelegate['notValidBefore']),
        "notValidAfter": int(subdelegate['notValidAfter']),
        "customRule": subdelegate['customRule'],
        "allowanceType": int(subdelegate['allowanceType']),
        "allowance": subdelegate['allowance']
      })
    skip += 1000
    sleep(5)
    print(skip)
    if len(subdelegatesObjects) > 0:
      bigquery_client.insert_rows_json(daily_subdelegate_table_id, subdelegatesObjects)
      last_id = subdelegates[-1]['id']
    if len(subdelegates) < 1000:
      break

def query_delegates(date_str: str):
  query = f"""
  WITH RankedDelegates AS (
  SELECT
    delegate,
    directVotingPower,
    date,
    ROW_NUMBER() OVER (PARTITION BY delegate ORDER BY date DESC) AS rn
  FROM `{daily_delegate_table_id}`
  WHERE date <= '{date_str}')
  SELECT
    delegate,
    directVotingPower,
    date
  FROM RankedDelegates
  WHERE rn = 1
  and directVotingPower != '0'
  order by SAFE_CAST(directVotingPower as decimal) desc
  """
  query_job = bigquery_client.query(query)
  df = query_job.to_dataframe()
  return df

def query_subdelegates(date_str: str):
  query = f"""
  WITH RankedSubdelegate AS (
  SELECT
    `from`,
    `to`,
    maxRedelegations,
    blocksBeforeVoteCloses,
    notValidBefore,
    notValidAfter,
    customRule,
    allowanceType,
    allowance,
    date,
    ROW_NUMBER() OVER (PARTITION BY concat(`from`,`to`) ORDER BY date DESC) AS rn
  FROM `{daily_subdelegate_table_id}`
  where date <= '{date_str}')
  SELECT
    `from`,
    `to`,
    maxRedelegations,
    blocksBeforeVoteCloses,
    notValidBefore,
    notValidAfter,
    customRule,
    allowanceType,
    allowance,
    date
  FROM RankedSubdelegate
  WHERE rn = 1
  order by `from` asc, date asc, `to` asc
  """
  query_job = bigquery_client.query(query)
  df = query_job.to_dataframe()
  return df

def get_proxy_address(owner: str):
  address = alligator.functions.proxyAddress(Web3.to_checksum_address(owner)).call()
  return address.lower()