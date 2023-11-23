# https://docs.etherscan.io/api-endpoints/tokens

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
# collection info 호출 
collection_url = f'https://api.etherscan.io/api?module=token&action=tokeninfo&contractaddress={collection_id}&apikey={etherscan_api}'
response = get(collection_url)
collectioninfo = response.json()
print(collectioninfo)


