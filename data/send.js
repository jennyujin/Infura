const Web3 = require('web3');
const { ETH_DATA_FORMAT, DEFAULT_RETURN_FORMAT } = require('web3');

async function main() {
  // Configuring the connection to an Ethereum node
  const network = process.env.ETHEREUM_NETWORK;
  const web3 = new Web3(
    new Web3.providers.HttpProvider(
      `https://${network}.infura.io/v3/${process.env.INFURA_API_KEY}`,
    ),
  );

  // Creating a signing account from a private key
  const signer = web3.eth.accounts.privateKeyToAccount(
    process.env.SIGNER_PRIVATE_KEY,
  );

  // Estimating the gas limit
  const limit = await web3.eth.estimateGas({
    from: signer.address,
    to: '0xAED01C776d98303eE080D25A21f0a42D94a86D9c',
    value: web3.utils.toWei('0.0001', 'ether'),
  });

  // Creating the transaction object
  const tx = {
    from: signer.address,
    to: '0xAED01C776d98303eE080D25A21f0a42D94a86D9c',
    value: web3.utils.toWei('0.0001', 'ether'),
    gas: limit,
    nonce: await web3.eth.getTransactionCount(signer.address),
    maxPriorityFeePerGas: web3.utils.toWei('3', 'gwei'),
    maxFeePerGas: web3.utils.toWei('3', 'gwei'),
    chainId: 1, // Use the correct chain ID (e.g., 1 for Ethereum mainnet).
    type: 2, // EIP-1559 transaction type
  };

  // Signing the transaction
  const signedTx = await web3.eth.accounts.signTransaction(tx, signer.privateKey);

  // Sending the signed transaction
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

  // Logging the transaction hash
  console.log(`Transaction hash: ${receipt.transactionHash}`);

  // Waiting for the transaction to be mined
  await receipt.wait();

  // Logging the block number where the transaction was mined
  console.log(`Mined in block ${receipt.blockNumber}`);
}

require('dotenv').config();
main();
