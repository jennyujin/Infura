from requests import get
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()
api_key = os.environ['API_KEY']

etherscan_api = api_key
targettime = 1664550000 # 2022-10-01 00:00:00
# blocknum_url = f'https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp={targettime}&closest=before&apikey={etherscan_api}'
blocknum_url = """https://api.etherscan.io/api?module=block&action=getblocknobytime
                    &timestamp={targettime}&closest=before&apikey={etherscan_api}"""

response = get(blocknum_url)
data = response.json()
print(data)