const fs = require('fs');
const path = require('path');
require('dotenv').config();
const endpoints = process.env.ETHEREUM_ENDPOINT;
const blockNumber = 17516353;

// 1. Web3.js 선언 (없으면 설치)
const { Web3 } = require('web3');

// 2. SDK에 Infura RPC 연결
const web3 = new Web3(endpoints);


// data calling
function replacer(key, value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

(async () => {
  try {
    // 3. 특정 블록의 정보를 가져오기
    const blockNumberToCheck = blockNumber ; // 조회하려는 블록 번호
    const blockInfo = await web3.eth.getBlock(blockNumberToCheck, true); // 'true'를 전달하여 트랜잭션 정보를 포함

    // BigInt 값을 문자열로 변환
    const blockInfoWithStringBigInt = JSON.parse(JSON.stringify(blockInfo, replacer));

    // JSON 데이터를 폴더에 저장
    const outputFolder = 'export';
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder);
    }

    const outputFile = path.join(outputFolder, 'blockInfo.json');
    const dataToSave = JSON.stringify(blockInfoWithStringBigInt, null, 2); // 2는 JSON 데이터를 들여쓰기하기 위한 공백 수
    fs.writeFileSync(outputFile, dataToSave, 'utf-8');

    console.log(`Block Information saved to ${outputFile}`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
})();