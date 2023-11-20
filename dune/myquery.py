from dune_client.client import DuneClient

# `dotenv` 라이브러리를 불러와 `.env` 파일의 환경 변수를 불러옵니다.
import dotenv

# 현재 디렉토리에 있는 `.env` 파일의 환경 변수를 불러옵니다.
dotenv.load_dotenv(".env")
# 환경 변수를 사용하여 `DuneClient` 인스턴스를 생성합니다.
dune = DuneClient.from_env()
# Dune 쿼리 ID 1215383의 최신 결과를 가져옵니다. 결과는 최대 8시간 동안 캐시됩니다.
results = dune.get_latest_result(3214602, max_age_hours=8)

# 가져온 결과를 콘솔에 출력합니다.
print(results)