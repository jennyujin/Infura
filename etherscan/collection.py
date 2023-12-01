# https://docs.etherscan.io/api-endpoints/tokens
# https://docs.etherscan.io/api-endpoints/accounts

from requests import get
import os
from dotenv import load_dotenv
import time
import datetime

load_dotenv()
api_key = os.environ['API_KEY']
etherscan_api = api_key

# collection id
collection_id = '0xED5AF388653567Af2F388E6224dC7C4b3241C544' #azuki

## API PRO account 필요 
## collection info 호출 
# collection_url = f'https://api.etherscan.io/api?module=token&action=tokeninfo&contractaddress={collection_id}&apikey={etherscan_api}'
# response = get(collection_url)
# collectioninfo = response.json()
# print(collectioninfo)

# Total Nodes Count
nodecount_url = f'https://api.etherscan.io/api?module=stats&action=nodecount&apikey={etherscan_api}'
response = get(nodecount_url)
nodecount = response.json()
# print(nodecount)

# Ether Balance 
# currency = wei
ethbalance_url = f'https://api.etherscan.io/api?module=account&action=balancemulti&address=0xddbd2b932c763ba5b1b7ae3b362eac3e8d40121a,0x63a9975ba31b0b9626b34300f7f627147df1f526,0x198ef1ec325a96cc354c7266a038be8b5c558f67&tag=latest&apikey={etherscan_api}'
response = get(ethbalance_url)
ethbalance = response.json()
# print(ethbalance)

# Internal Transactions by Transaction Hash
txhash = '0x40eb908387324f2b575b4879cd9d7188f69c8fc9d87c901b9e2daaea4b442170'
txhash_url = f'https://api.etherscan.io/api?module=account&action=txlistinternal&txhash={txhash}&apikey={etherscan_api}'
response = get(txhash_url)
txhash = response.json()
print(txhash)
