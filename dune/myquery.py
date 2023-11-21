from dune_client.client import DuneClient
import dotenv
import os
import csv

dotenv.load_dotenv(".env")

file_path = os.path.abspath("./export/nft_trades.csv")

dune = DuneClient.from_env()
results = dune.get_latest_result(3214602, max_age_hours=8)

# Check if the 'data' attribute exists in the ResultsResponse
if hasattr(results, 'result') and hasattr(results.result, 'rows'):
    rows = results.result.rows
else:
    # Provide a default or handle the case when 'rows' is not available
    rows = []  # Replace with default rows or handle accordingly

# Check if the 'metadata' attribute exists in the ResultsResponse
if hasattr(results, 'result') and hasattr(results.result, 'metadata'):
    # Use column names if available
    column_names = results.result.metadata.column_names
else:
    # Provide a default or handle the case when metadata.column_names is not available
    column_names = ['blockchain', 'nft_contract_address', 'project_contract_address',
                    'token_id', 'evt_type', 'trade_category', 'trade_type', 'tx_hash', 'block_time', 'block_number',
                    'amount_raw', 'amount_original', 'amount_usd', 'currency_contract',
                    'currency_symbol', 'project', 'number_of_items', 'tx_from', 'tx_to']  # Replace with actual column names

# Write results to CSV file
with open(file_path, "w", newline='') as f:
    writer = csv.writer(f)
    writer.writerow(column_names)

    for row in rows:
        # Ensure columns are written in the correct order
        writer.writerow([row.get(col, '') for col in column_names])
