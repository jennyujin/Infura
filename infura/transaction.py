from web3 import Web3
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()
api_key = os.environ['Jenny_API_Key']

# Ethereum 노드에 연결
web3 = Web3(Web3.HTTPProvider(f'https://mainnet.infura.io/v3/{api_key}'))

# 블록 번호
block_number = 18609292

# 트랜잭션 해시
transaction_hash = '0x5ff892c3806d5682ff9ab170e3ef5f47da4b71320315acd1fd07287e0ed1d46a'

# 로그 ID
log_id = 471

# 블록 정보 조회
block = web3.eth.get_block(block_number)

# 트랜잭션 정보 조회
transaction = web3.eth.get_transaction(transaction_hash)

# 트랜잭션 리시트 정보 조회
receipt = web3.eth.get_transaction_receipt(transaction_hash)

# 특정 로그 ID가 있는지 확인
log_data = None
for log in receipt['logs']:
    if log['logIndex'] == log_id:
        log_data = log
        break

# 출력
if log_data:
    print("Log Details:")
    print(f"From: {transaction['from']}")
    print(f"To: {transaction['to']}")
    print(f"Transaction Hash: {log_data['transactionHash'].hex()}")
    print(f"Block Number: {log_data['blockNumber']}")
    print(f"Log Index: {log_data['logIndex']}")
    print(f"Data: {log_data['data']}")
    print(f"Topics: {log_data['topics']}")
    # 로우 데이터 출력
    print("Transaction Raw Data:")
    print(transaction)
    print("Log Raw Data:")
    print(log_data)
else:
    print(f"No log with ID {log_id} found in block {block_number} for transaction {transaction_hash}.")
