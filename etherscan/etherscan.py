# https://docs.etherscan.io/
# https://docs.etherscan.io/api-endpoints/blocks

from requests import get
import os
from dotenv import load_dotenv
import time
import datetime

# .env 파일 로드
load_dotenv()
api_key = os.environ['API_KEY']
etherscan_api = api_key

# 시간 설정 
targettime = int(time.time()) # current time 
print(targettime)

humantime = datetime.datetime.fromtimestamp(targettime).strftime('%Y.%m.%d. %H.%M.%S')
print(humantime)

# 실시간 block 번호 호출 
blocknum_url = f'https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp={targettime}&closest=before&apikey={etherscan_api}'
response = get(blocknum_url)
blocknum = response.json()

# 키를 사용하여 block 번호 추출 
blocknum = blocknum['result']
print(blocknum)

# block 번호로 정보 호출 
block_url = f'https://api.etherscan.io/api?module=block&action=getblockreward&blockno={blocknum}&apikey={etherscan_api}'
response = get(block_url)
blockdata = response.json()
print(blockdata)


