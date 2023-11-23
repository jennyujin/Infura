// node infura/test2.js         

require('dotenv').config();
const { Web3 } = require('web3');

// .env 파일에서 변수 불러오기
const infuraUrl = process.env.ETHEREUM_ENDPOINT;

// 이하 코드에서 infuraUrl을 사용할 수 있습니다.
console.log('Infura URL:', infuraUrl);

// web3 객체 생성 및 프로바이더 설정
// SDK에 Infura RPC 연결
const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));

(async () => {
  try {
    // 블록 데이터 조회
    const currentBlockNumber = await web3.eth.getBlockNumber(); // Get the current block number.
    console.log('Current Block Number:', currentBlockNumber);

    const blockNumberToCheck = 12345; // Replace with the block number you want to check
    const transactionCount = await web3.eth.getBlockTransactionCount(blockNumberToCheck); // transactionCount
    console.log(`Transaction Count in Block ${blockNumberToCheck}:`, transactionCount);

    const blockNumberToFetch = 12345; // Replace with the block number you want to fetch from
    const transactionIndexToFetch = 0; // Replace with the transaction index you want to fetch
    const transaction = await web3.eth.getTransactionFromBlock(blockNumberToFetch, transactionIndexToFetch);
    console.log(`Transaction at Block ${blockNumberToFetch}, Index ${transactionIndexToFetch}:`, transaction);

    const transactionHashToFetch = '0xa3aeb615c008ecba6baa6aa2b3e4ca0eadf67c2b30726c3bdd739ba8e8a47fa7'; // Replace with the actual transaction hash
    const fetchedTransaction = await web3.eth.getTransaction(transactionHashToFetch);
    console.log(`Transaction with Hash ${transactionHashToFetch}:`, fetchedTransaction);

    // ABI 정의 - Application Binary Interface
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

    // 컨트랙트 인스턴스 생성
    const contract = new web3.eth.Contract(minABI, token_address); // 컨트랙트 인스턴스

    // 해당 컨트랙트의 balanceOf 함수 실행 
    // wallet_address가 보유한 contract의 토큰 개수
    const balance = await contract.methods.balanceOf(wallet_address).call({ from: wallet_address }); // from 속성 추가
    console.log(`Balance of ${wallet_address} in the contract: ${balance}`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
})();
