require('dotenv').config();
const endpoints = process.env.INFURA_ENDPOINT;


// let config = require('../config/config.json');
// const network = 'ethereum';
// const endpoints = config.endpoints[network];

// const endpoints = 'https://mainnet.infura.io/v3/faa03c7fb045413cab22b4fb6a74796f';

// 0. terminal일 경우 - node 접속
// node //(없으면 설치)

// 1. Web3.js 선언 (없으면 설치)
const { Web3 } = require('web3');

// 2. SDK에 Infura RPC 연결
// Endpoint https://app.infura.io/dashboard/ethereum/faa03c7fb045413cab22b4fb6a74796f/settings/endpoints
const web3 = new Web3(endpoints); 

(async () => {
  try {
    // 3. 블록 데이터 조회해보기
    const currentBlockNumber = await web3.eth.getBlockNumber();
    console.log('Current Block Number:', currentBlockNumber);

    const blockNumberToCheck = 12345; // Replace with the block number you want to check
    const transactionCount = await web3.eth.getBlockTransactionCount(blockNumberToCheck);
    console.log(`Transaction Count in Block ${blockNumberToCheck}:`, transactionCount);

    const blockNumberToFetch = 12345; // Replace with the block number you want to fetch from
    const transactionIndexToFetch = 0; // Replace with the transaction index you want to fetch
    const transaction = await web3.eth.getTransactionFromBlock(blockNumberToFetch, transactionIndexToFetch);
    console.log(`Transaction at Block ${blockNumberToFetch}, Index ${transactionIndexToFetch}:`, transaction);

    const transactionHashToFetch = '0xa3aeb615c008ecba6baa6aa2b3e4ca0eadf67c2b30726c3bdd739ba8e8a47fa7'; // Replace with the actual transaction hash
    const fetchedTransaction = await web3.eth.getTransaction(transactionHashToFetch);
    console.log(`Transaction with Hash ${transactionHashToFetch}:`, fetchedTransaction);

    // 4. ABI 정의 - Application Binary Interface
    const minABI = [
      {
        constant: true,
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        type: 'function',
      },
    ];

    const wallet_address = '0xcEe284F754E854890e311e3280b767F80797180d'; // 사용자 지갑 주소
    const token_address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // 컨트랙트 주소

    // 5. 컨트랙트 인스턴스 생성
    const contract = new web3.eth.Contract(minABI, token_address); // 컨트랙트 인스턴스

    // 6. 해당 컨트랙트의 balanceOf 함수 실행 (wallet_address가 보유한 contract의 토큰 갯수)
    const balance = await contract.methods.balanceOf(wallet_address).call({ from: wallet_address }); // from 속성 추가
    console.log(`Balance of ${wallet_address} in the contract: ${balance}`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
})();
