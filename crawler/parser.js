const util = require('util');
const contract_abi = require('./contract-abi');
const nft_db = require('./nft-db');
const crawler_util = require('./crawler-util');
const logger = require('./logger');
const crawler_meta = require('./crawler-metadata');

let NftList = [];

// Initialize variables
let [tokens_data, token_owners_data, transactions_data, nft_collections_data, nft_balances_data, nft_tokens_data, nft_transaction_data] = [[], [], [], [], [], [], []];

// Non standard nft filtering
let isNoneStandardNft = "";

async function isERC721Contract(network, provider, address) {
    let result = false;

    try {
        let contract = new provider.Contract(contract_abi.abiERC165, address);
        result = await contract.methods.supportsInterface(contract_abi.ERC721InterfaceId).call();
    } catch (err) {
        logger.debug("parser.js - isERC721Contract - 01 - "+err.message);
        // not nft
    }
    return result;
}

async function isERC1155Contract(network, provider, address) {
    let result = false;
    let contract = null;

    try {
        // if (block_provider.isKlaytnNetwork(network)) {
        //     // baobab tx: 0xe03331272b1e1a922ed2ba31f5e5f93f1bd8249928cf7c81208e91dff0d584ee
        //     contract = new provider.Contract(contract_abi.abiKIP13,address);
        //     result = await contract.methods.supportsInterface(contract_abi.KIP37InterfaceId).call();
        // } else {
        //     contract = new provider.Contract(contract_abi.abiERC165, address);
        //     result = await contract.methods.supportsInterface(contract_abi.ERC1155InterfaceId).call();
        // }

        // ethereum
        // cypress tx: 0x92952f1ccb04d2665c48d0f1a5b0e9360ef7317626433a4885060ce57dd40b58
        contract = new provider.Contract(contract_abi.abiERC165, address);
        result = await contract.methods.supportsInterface(contract_abi.ERC1155InterfaceId).call();
        if (result === false) {
            if (block_provider.isKlaytnNetwork(network)) { // cypress
                result = await contract.methods.supportsInterface(contract_abi.KIP37InterfaceId).call();
                if (result === false) {
                    contract = new provider.Contract(contract_abi.abiKIP13,address);
                    result = await contract.methods.supportsInterface(contract_abi.ERC1155InterfaceId).call();
                    if (result === false) {
                        result = await contract.methods.supportsInterface(contract_abi.KIP37InterfaceId).call();
                    }
                }
            }
        }
    } catch (err) {
        logger.debug("parser.js - isERC1155Contract - 01 - "+err.message);
    }
    return result;
}


//Get ERC721 TokenUri
const getERC721TokenURI = async (contract, event_id) => {
    let tokenURI = null;

    try {
        if (contract.methods.tokenURI) {
            await crawler_util.sleep(10);
            tokenURI = await contract.methods.tokenURI(event_id).call();
            if (!crawler_util.isEmptyValue(tokenURI)) {
                // remove null character
                tokenURI = tokenURI.replace(/\0/g, '');
            }
            tokenURI = tokenURI.trim();
            if (crawler_util.isEmptyValue(tokenURI)) {
                tokenURI = null;
            }
        }
    } catch {
        // ethereum contract: 0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413
        // Error: data out-of-bounds (length=31, offset=32, code=BUFFER_OVERRUN, version=abi/5.6.4)
        // not have function on contract
    }

    return tokenURI;
};

//Get ERC1155 TokenUri
const getERC1155TokenURI = async (contract, event_id) => {
    let tokenURI = null;

    try {
        tokenURI = await contract.methods.uri(event_id).call();
        if (!crawler_util.isEmptyValue(tokenURI)) {
            // remove null character
            tokenURI = tokenURI.replace(/\0/g, '');
        }
        tokenURI = tokenURI.trim();
        if (crawler_util.isEmptyValue(tokenURI)) {
            tokenURI = null;
        }
    } catch (err) {
        // logger.info(`function: getERC1155TokenURI contract address: ${contract._address}   token_id: ${event_id}  Error: ${err.message}`);
        // Error: data out-of-bounds (length=31, offset=32, code=BUFFER_OVERRUN, version=abi/5.6.4)
        // not have function on contract
    }
    return tokenURI;
};

// Json validation check
const NormalizeTokenURI = (tokenURI, tokenID) => {
    let strRet = '';

    if (tokenURI) {
        if (typeof tokenURI === 'string') {
            if (tokenURI.includes('0x{id}')) {
                strRet = tokenURI.replaceAll('0x{id}', '0x' + BigInt(tokenID).toString(16));
            } else if (tokenURI.includes('{id}')) {
                strRet = tokenURI.replaceAll('{id}', tokenID);
            } else {
                strRet = tokenURI;
            }
        }
    }
    return strRet;
};

// Connecting Direct Events and Functions By Erc20
const getERC20ContractAndEvent = async (provider, address, data, topics) => {
    let contract = null,
        event = null;
    try {
        contract = new provider.Contract(contract_abi.abiERC20, address);
    } catch {
        
    }
    try {
        event = await provider.abi.decodeLog(contract_abi.abiTransferERC20, data, topics.slice(1));
    } catch {
        try {
            event = await provider.abi.decodeLog(contract_abi.abiTransfer2ERC20, data, topics.slice(1));
        } catch {
            try {
                event = await provider.abi.decodeLog(contract_abi.abiTransfer3ERC20, data, topics.slice(1));
            } catch {
            }
        }
    }
    return [contract, event];
};

// Connecting Direct Events and Functions By Erc721
const getERC721ContractAndEvent = async (provider, address, data, topics) => {
    let contract = null,
        event = null;
    try {
        contract = new provider.Contract(contract_abi.abiERC721, address);
    } catch {
        
    }
    try {
        event = await provider.abi.decodeLog(contract_abi.abiTransferERC721, data, topics.slice(1));
    } catch {
        try {
            event = await provider.abi.decodeLog(contract_abi.abiTransferERC721_Ex_0, data, topics.slice(1));
        } catch {
            event = await provider.abi.decodeLog(contract_abi.abiTransferERC721_Ex_1, data, topics.slice(1));
        }
    }
    return [contract, event];
};

// Connecting Direct Events and Functions By Kip17
const getKIP17ContractAndEvent = async (provider, address, data, topics) => {
    let contract = null,
        event = null;

    try {
        contract = new provider.Contract(contract_abi.abiKIP17, address);
    } catch{
        
    }
    
    try {
        if (topics.length === 1) {
            event = await provider.abi.decodeParameters(contract_abi.abiTransferKIP17, data);
        } else {
            event = await provider.abi.decodeLog(contract_abi.abiTransferKIP17, data, topics.slice(1));
        }
    } catch {
        event = await provider.abi.decodeLog(contract_abi.abiTransferKIP17_Ex_0, data, topics.slice(1));
    }

    return [contract, event];
};

// Get CyptoPunk Token Id
const getCryptoPunkTokenID = async (provider, receipt, from, to) => {
    let strTokenID = '';

    for (let idx = 0; idx < receipt.logs.length; idx++) {
        let receipt_log = receipt.logs[idx];
        if (receipt_log.topics.length <= 0) {
            continue;
        }
        if (receipt_log.topics[0].toUpperCase() === contract_abi.funcCryptoPunk_PunkTransfer.toUpperCase()) {
            try {
                let decode_log = await provider.abi.decodeLog(
                    contract_abi.abiCryptoPunk_PunkTransfer,
                    receipt_log.data,
                    receipt_log.topics.slice(1)
                );
                if (
                    from.toUpperCase() === decode_log.from.toUpperCase() &&
                    to.toUpperCase() === decode_log.to.toUpperCase()
                ) {
                    strTokenID = decode_log.punkIndex;
                    break;
                }
            } catch {
            }
        } else if (receipt_log.topics[0].toUpperCase() === contract_abi.funcCryptoPunk_PunkBought.toUpperCase()) {
            try {
                let decode_log = await provider.abi.decodeLog(
                    contract_abi.abiCryptoPunk_PunkBought,
                    receipt_log.data,
                    receipt_log.topics.slice(1)
                );
                if ((from.toUpperCase() === decode_log.fromAddress.toUpperCase()) || (receipt_log.address === "0x6Ba6f2207e343923BA692e5Cae646Fb0F566DB8D" && decode_log.fromAddress.toUpperCase() === decode_log.toAddress.toUpperCase())) {
                    strTokenID = decode_log.punkIndex;
                    break;
                }
            } catch {
            }
        }
    }
    return strTokenID;
};

// Part 3 : parseERC721
const parseERC721 = async (network, provider, collection, block_timestamp, receipt_blockNumber, receipt, idxLog) => {
    block_timestamp = Number(block_timestamp);
    let contract = null,
        event = null;
    let receipt_log = receipt.logs[idxLog];
    let name = null,
        symbol = null,
        tokenURI = null,
        total_supply = null,
        deployment_date = null,
        creator = null,
        owner = null;
    let tokenId = '';
    let tokenInfo = null;

    try {
        // ethereum
        [contract, event] = await getERC721ContractAndEvent(provider, receipt_log.address, receipt_log.data, receipt_log.topics);
    } catch {
        try {
            // klaytn
            if (network === 'cypress') {
                [contract, event] = await getKIP17ContractAndEvent(provider, receipt_log.address, receipt_log.data, receipt_log.topics);
            }
        } catch (err) {
            logger.error(
                util.format(
                    `function: parseERC721[1], block_number: ${receipt_blockNumber}, transactionHash: ${receipt_log.transactionHash}, logIndex: ${receipt_log.logIndex}, Error: ${err.message}`
                )
            );
            return;
        }
    }

    let minted_time = null;
    if (event.from === crawler_util.null_address) {
        minted_time = block_timestamp;
    }

    if (!collection) {
        try {
            name = await contract.methods.name().call();
        } catch {
        }
        try {
            symbol = await contract.methods.symbol().call();
        } catch {
        }
        try {
            total_supply = await contract.methods.totalSupply().call();
        } catch {
        }
        try {
            owner = await contract.methods.owner().call();
        } catch { 
        }
        try {
            //await nft_db.addCollection(receipt_log.address, network.toLowerCase(), name, symbol, 'erc721', creator);
            nft_collections_data.push({
                network: network.toLowerCase(),
                collection_id: receipt_log.address,
                collection_name: name,
                collection_symbol: symbol,
                nft_type: "erc721",
                total_supply: total_supply,
                deployment_date: deployment_date,
                owner: owner
            });
        } catch {
        }
    } else {
        try {
            total_supply = await contract.methods.totalSupply().call();
            if (total_supply) {
                if (!collection.total_supply || (collection.total_supply && collection.total_supply !== total_supply)) {
                    await nft_db.updateCollectioTotalSupply(network.toLowerCase(), receipt_log.address, total_supply);
                }
            }
        } catch {
        }
        try {
            owner = await contract.methods.owner().call();
            if (owner) {
                if (collection.owner !== owner) {
                    await nft_db.updateCollectionOwner(network.toLowerCase(), receipt_log.address, owner);
                }
            }
        } catch {
        }
    }

    tokenId = event.tokenId;
    if (receipt_log.address.toUpperCase() === contract_abi.addrCryptoPunk.toUpperCase()) {
        let punkIndex = await getCryptoPunkTokenID(provider, receipt, event.from, event.to);
        if (punkIndex.length > 0) {
            tokenId = punkIndex;
        }
    }

    try {
        tokenURI = await getERC721TokenURI(contract, tokenId);
    } catch {
    }

    try {
        //insert 721 nft_transfer_table + transaction_type_table
        nft_transaction_data.push({
            network: network.toLowerCase(),
            collection_id: receipt_log.address,
            block_number: receipt_blockNumber,
            timestamp: block_timestamp,
            transaction_hash: receipt_log.transactionHash,
            log_id: receipt_log.logIndex,
            from: event.from,
            to: event.to,
            token_id: tokenId,
            amount: 1
        });

        tokenURI = NormalizeTokenURI(tokenURI, tokenId);
        if (tokenURI) {
            tokenInfo = await crawler_meta.crawlTokenMetadata(tokenId, tokenURI)
        }

        nft_tokens_data.push({
            network: network.toLowerCase(),
            collection_id: receipt_log.address,
            token_id: tokenId,
            nft_type: "erc721",
            block_number: receipt_blockNumber,
            minted_time: minted_time,
            token_uri: tokenURI,
            token_info: tokenInfo
        });

        if (event.from !== crawler_util.null_address) {
            let balance = '0';
            try {
                let owner = await contract.methods.ownerOf(tokenId).call();
                if(owner.toLowerCase() == event.from.toLowerCase()) balance = '1'
                else balance = '0'
            } catch (err) {
                // logger.error(`function: parseERC721 : ${err}`);
            }
            nft_balances_data.push({
                network: network.toLowerCase(),
                collection_id: receipt_log.address,
                token_id: tokenId,
                block_number: receipt_blockNumber,
                account: event.from,
                balance: balance
            });
        }
        if (event.to !== crawler_util.null_address) {
            let balance = '1';
            try {
                let owner = await contract.methods.ownerOf(tokenId).call();
                if(owner.toLowerCase() == event.to.toLowerCase()) balance = '1'
                else balance = '0'
            } catch (err) {
                // logger.error(`function: parseERC721 : ${err}`);
            }
            nft_balances_data.push({
                network: network.toLowerCase(),
                collection_id: receipt_log.address,
                token_id: tokenId,
                block_number: receipt_blockNumber,
                account: event.to,
                balance: balance
            });
        }
    } catch (err) {
        logger.error(
            util.format(`function: parseERC721[2], block_number: ${receipt_blockNumber}, transactionHash: ${receipt_log.transactionHash}, logIndex: ${receipt_log.logIndex}, Error: ${err.message}`
            )
        );
    }
};

// Part 3 : parseERC1155Single
const parseERC1155Single = async (network, provider, collection, block_timestamp, receipt_blockNumber, receipt, idxLog) => {
    let creator, tokenInfo, name, symbol, owner = null;
    const receipt_log = receipt.logs[idxLog];

    block_timestamp = Number(block_timestamp);

    let contract = null, event = null;

    try {
        event = await provider.abi.decodeLog(contract_abi.abiTransferSingle, receipt_log.data, receipt_log.topics.slice(1));
    } catch {
        try {
            event = await provider.abi.decodeLog(contract_abi.abiTransferSingle2, receipt_log.data, receipt_log.topics.slice(1));
        } catch (err) {
            logger.error(`function: parseERC1155Single[2], block_number: ${receipt_blockNumber}, transactionHash: ${receipt_log.transactionHash}, Error: ${err.message}`);
            return;
        }
    }

    try {
        contract = new provider.Contract(contract_abi.abiERC1155, receipt_log.address);
        if (!collection) {
            try {
                name = await contract.methods.name().call();
            } catch {
            }
            try {
                symbol = await contract.methods.symbol().call();
            } catch {
            }
            try {
                owner = await contract.methods.owner().call();
            } catch { 
            }
            nft_collections_data.push({
                network: network.toLowerCase(),
                collection_id: receipt_log.address,
                collection_name: name,
                collection_symbol: symbol,
                nft_type: "erc1155",
                total_supply: null,
                deployment_date: null,
                owner: owner
            });
        } else {
            try {
                owner = await contract.methods.owner().call();
                if (owner) {
                    if (collection.owner !== owner) {
                        await nft_db.updateCollectionOwner(network.toLowerCase(), receipt_log.address, owner);
                    }
                }
            } catch {
            }
        }
    } catch (err) {
        logger.error(`function: parseERC1155Single[1], block_number: ${receipt_blockNumber}, transactionHash: ${receipt_log.transactionHash}, contract address: ${receipt_log.address}, Error: ${err.message}`);
    }

    let minted_time = null;
    if (event.from === crawler_util.null_address) {
        minted_time = block_timestamp;
    }

    let tokenURI = await getERC1155TokenURI(contract, event.id);

    try {
        // await nft_db.addTransaction(network.toLowerCase(), receipt_log.address, receipt_blockNumber, block_timestamp, receipt_log.transactionHash, receipt_log.logIndex, event.from, event.to, event.id, event.value);
        nft_transaction_data.push({
            network: network.toLowerCase(),
            collection_id: receipt_log.address,
            block_number: receipt_blockNumber,
            timestamp: block_timestamp,
            transaction_hash: receipt_log.transactionHash,
            log_id: receipt_log.logIndex,
            from: event.from,
            to: event.to,
            token_id: event.id,
            amount: event.value
        });

        tokenURI = NormalizeTokenURI(tokenURI, event.id);
        if (tokenURI) {
            tokenInfo = await crawler_meta.crawlTokenMetadata(event.id, tokenURI)
        }

        //await nft_db.updateNFTToken(network.toLowerCase(), receipt_log.address, event.id, "erc1155", receipt_blockNumber, minted_time, tokenURI, tokenInfo);
        nft_tokens_data.push({
            network: network.toLowerCase(),
            collection_id: receipt_log.address,
            token_id: event.id,
            nft_type: "erc1155",
            block_number: receipt_blockNumber,
            minted_time: minted_time,
            token_uri: tokenURI,
            token_info: tokenInfo
        });

        if (event.from !== crawler_util.null_address) {
            let balance = '0';
            try {
                balance = await contract.methods.balanceOf(event.from, event.id).call();
            } catch (err) {
                logger.error(`function: parseERC1155Single : ${err}`);
            }
            nft_balances_data.push({
                network: network.toLowerCase(),
                collection_id: receipt_log.address,
                token_id: event.id,
                block_number: receipt_blockNumber,
                account: event.from,
                balance: balance
            });
        }
        if (event.to !== crawler_util.null_address) {
            let balance = '0';
            try {
                balance = await contract.methods.balanceOf(event.to, event.id).call();
            } catch (err) {
                logger.error(`function: parseERC1155Single : ${err}`);
            }
            nft_balances_data.push({
                network: network.toLowerCase(),
                collection_id: receipt_log.address,
                token_id: event.id,
                block_number: receipt_blockNumber,
                account: event.to,
                balance: balance
            });
        }
    } catch (err) {
        logger.error(`function: parseERC1155Single[3], block_number: ${receipt_blockNumber}, transactionHash: ${receipt_log.transactionHash}, Error: ${err.message}`);
    }
};

// Part 3 : parseERC1155Batch
const parseERC1155Batch = async (network, provider, collection, block_timestamp, receipt_blockNumber, receipt, idxLog) => {
    let creator, tokenInfo, name, symbol, owner = null;
    const receipt_log = receipt.logs[idxLog];

    block_timestamp = Number(block_timestamp);

    let contract = null, event = null;

    try {
        event = await provider.abi.decodeLog(contract_abi.abiTransferBatch, receipt_log.data, receipt_log.topics.slice(1));
    } catch (err) {
        try {
            event = await provider.abi.decodeLog(contract_abi.abiTransferBatch2, receipt_log.data, receipt_log.topics.slice(1));
        } catch (err) {
            logger.error(`function: parseERC1155Batch[2], block_number: ${receipt_blockNumber}, transactionHash: ${receipt_log.transactionHash}, logIndex: ${receipt_log.logIndex}, Error: ${err.message}`);
            return;
        }
    }

    try {
        try {
            contract = new provider.Contract(contract_abi.abiERC1155, receipt_log.address);
        } catch {
        }
        if (!collection) {
            try {
                name = await contract.methods.name().call();
            } catch { 
            }
            try {
                symbol = await contract.methods.symbol().call();
            } catch { 
            }
            try {
                owner = await contract.methods.owner().call();
            } catch { 
            }
            nft_collections_data.push({
                network: network.toLowerCase(),
                collection_id: receipt_log.address,
                collection_name: name,
                collection_symbol: symbol,
                nft_type: "erc1155",
                total_supply: null,
                deployment_date: null,
                owner: owner
            });
        } else {
            try {
                owner = await contract.methods.owner().call();
                if (owner) {
                    if (collection.owner !== owner) {
                        await nft_db.updateCollectionOwner(network.toLowerCase(), receipt_log.address, owner);
                    }
                }
            } catch {
            }
        }
    } catch (err) {
        logger.error(`function: parseERC1155Batch[1], block_number: ${receipt_blockNumber}, transactionHash: ${receipt_log.transactionHash}, logIndex: ${receipt_log.logIndex}, Error: ${err.message}`);
    }

    for (let i = 0; i < event.ids.length; i++) {
        let minted_time = null;
        if (event.from === crawler_util.null_address) {
            minted_time = block_timestamp;
        }

        let tokenURI = await getERC1155TokenURI(contract, event.ids[i]);

        try {
            let log_id = util.format("%d-%d", receipt_log.logIndex, i);
            nft_transaction_data.push({
                network: network.toLowerCase(),
                collection_id: receipt_log.address,
                block_number: receipt_blockNumber,
                timestamp: block_timestamp,
                transaction_hash: receipt_log.transactionHash,
                log_id: log_id,
                from: event.from,
                to: event.to,
                token_id: event.ids[i],
                amount: event.values[i]
            });

            tokenURI = NormalizeTokenURI(tokenURI, event.ids[i]);
            if (tokenURI) {
                tokenInfo = await crawler_meta.crawlTokenMetadata(event.ids[i], tokenURI)
            }

            nft_tokens_data.push({
                network: network.toLowerCase(),
                collection_id: receipt_log.address,
                token_id: event.ids[i],
                nft_type: "erc1155",
                block_number: receipt_blockNumber,
                minted_time: minted_time,
                token_uri: tokenURI,
                token_info: tokenInfo
            });

            if (event.from !== crawler_util.null_address) {
                const balance = await contract.methods.balanceOf(event.from, event.ids[i]).call();
                nft_balances_data.push({
                    network: network.toLowerCase(),
                    collection_id: receipt_log.address,
                    token_id: event.ids[i],
                    block_number: receipt_blockNumber,
                    account: event.from,
                    balance: balance
                });
            }
            if (event.to !== crawler_util.null_address) {
                const balance = await contract.methods.balanceOf(event.to, event.ids[i]).call();
                nft_balances_data.push({
                    network: network.toLowerCase(),
                    collection_id: receipt_log.address,
                    token_id: event.ids[i],
                    block_number: receipt_blockNumber,
                    account: event.to,
                    balance: balance
                });
            }
        } catch (err) {
            logger.error(`function: parseERC1155Batch[3], block_number: ${receipt_blockNumber}, transactionHash: ${receipt_log.transactionHash}, logIndex: ${receipt_log.logIndex}, Error: ${err.message}`);
        }
    }
};

// Part 3 : parseToken
const parseToken = async (network, provider, token, block_timestamp, receipt_blockNumber, receipt, idxLog) => {
    const receipt_log = receipt.logs[idxLog];
    let name = "", symbol = "", total_supply = "", decimals = 0, balance = 0;
    block_timestamp = Number(block_timestamp);

    try {
        [contract, event] = await getERC20ContractAndEvent(provider, receipt_log.address, receipt_log.data, receipt_log.topics);
    } catch (err) {
        logger.error(`function: parseToken[1], block_number: ${receipt_blockNumber}, transactionHash: ${receipt_log.transactionHash}, logIndex: ${receipt_log.logIndex}, Error: ${err.message}`);
        return;
    }

    if (!token) {
        try {
            name = await contract.methods.name().call();
        } catch (error) {
            try {
                name = await crawler_util.convertToBytes32(BigInt(error.value));
            } catch {

            }

        }
        try {
            symbol = await contract.methods.symbol().call();
        } catch (error) {
            try {
                symbol = await crawler_util.convertToBytes32(BigInt(error.value));
            } catch {

            }
        }
        try {
            decimals = await contract.methods.decimals().call();
        } catch {
        }
        try {
            total_supply = await contract.methods.totalSupply().call();
        } catch {
        }
        tokens_data.push({
            network: network.toLowerCase(),
            token_address: receipt_log.address,
            name,
            symbol,
            decimals,
            total_supply
        });

    }

    try {
        transactions_data.push({
            network: network.toLowerCase(),
            token_address: receipt_log.address,
            block_number: receipt_blockNumber,
            timestamp: block_timestamp,
            transaction_hash: receipt_log.transactionHash,
            log_id: receipt_log.logIndex,
            from: event.from,
            to: event.to,
            amount: event.value,
            gas_used: receipt.gasUsed
        });
        if (event.from !== crawler_util.null_address) {
            balance = 0;
            try {
                balance = await contract.methods.balanceOf(event.from).call();
            } catch {
            }
            token_owners_data.push({
                network: network.toLowerCase(),
                token_address: receipt_log.address,
                owner: event.from,
                balance: balance
            });
        }
        if (event.to !== crawler_util.null_address) {
            balance = 0;
            try {
                balance = await contract.methods.balanceOf(event.to).call();
            } catch {
            }
            token_owners_data.push({
                network: network.toLowerCase(),
                token_address: receipt_log.address,
                owner: event.to,
                balance: balance
            });
        }
    } catch (err) {
        logger.error(`function: parseToken[2], block_number: ${receipt_blockNumber}, transactionHash: ${receipt_log.transactionHash}, logIndex: ${receipt_log.logIndex}, Error: ${err.message}`);
    }
}

// Part 2: Parsing logs
const parseLogs = async (network, provider, block_timestamp, receipt) => {
    try {
        for (const [idx, log] of receipt.logs.entries()) {
            if (log.topics.length === 0) {
                continue;
            }


            // Non standard nft filtering
            if(log.address) isNoneStandardNft = contract_abi.noneStandardNft.some(data => data.toLowerCase() === log.address.toLowerCase());

            if(log.topics[0].toLowerCase() === "0x2771bca31dd40ca5838bfc40fc5063e49ff49235e90223669dc5d81916e52d04") {
                let name,symbol,owner,total_supply = null;
                let contractAddress = `0x${log.data.slice(90, 130)}`
                let isERC721 = await isERC721Contract(network, provider, contractAddress);
                if(!isERC721) isERC1155 = await isERC1155Contract(network, provider, contractAddress);
                if(isERC721) {
                    contract = new provider.Contract(contract_abi.abiERC721, contractAddress);
                    try {
                        name = await contract.methods.name().call();
                    } catch { 
                    }
                    try {
                        symbol = await contract.methods.symbol().call();
                    } catch { 
                    }
                    try {
                        owner = await contract.methods.owner().call();
                    } catch { 
                    }
                    try {
                        total_supply = await contract.methods.totalSupply().call();
                    } catch { 
                    }
                    await nft_db.addCollection(network.toLowerCase(), contractAddress, name, symbol, "erc721", receipt.to, total_supply, block_timestamp, owner);
                } else if(isERC1155) {
                    contract = new provider.Contract(contract_abi.abiERC1155, contractAddress);
                    try {
                        name = await contract.methods.name().call();
                    } catch { 
                    }
                    try {
                        symbol = await contract.methods.symbol().call();
                    } catch { 
                    }
                    try {
                        owner = await contract.methods.owner().call();
                    } catch { 
                    }
                    await nft_db.addCollection(network.toLowerCase(), contractAddress, name, symbol, "erc1155", receipt.to, null, block_timestamp, owner);
                }
            }

            if (log.topics[0].toUpperCase() === contract_abi.funcTransfer.toUpperCase()) {
                // NFT(ERC721) Transfer
                // if ((log.topics.length === 4 && log.topics[3] != crawler_util.null_token_id && !bERC20) || isNoneStandardNft) {
                if ((log.topics.length === 4) || isNoneStandardNft) {
                    let bERC721 = false;
                    const collection = await nft_db.getCollection(network, log.address);
                    if(collection && collection.nft_type === 'erc721'){
                        bERC721 = true;
                    }else{
                        bERC721 = await isERC721Contract(network, provider, log.address);
                    }
                    if(bERC721) {
                        await parseERC721(network, provider, collection, block_timestamp, receipt.blockNumber, receipt, idx);
                    }
                }
            }

            // NFT(ERC1155) TransferSingle
            if (log.topics[0].toUpperCase() === contract_abi.funcTransferSingle.toUpperCase() && log.topics.length === 4) {
                const collection = await nft_db.getCollection(network, log.address);
                await parseERC1155Single(network, provider, collection, block_timestamp, receipt.blockNumber, receipt, idx);
            }

            // NFT(ERC1155) TransferBatch
            if (log.topics[0].toUpperCase() === contract_abi.funcTransferBatch.toUpperCase() && log.topics.length === 4) {
                const collection = await nft_db.getCollection(network, log.address);
                await parseERC1155Batch(network, provider, collection, block_timestamp, receipt.blockNumber, receipt, idx);
            }

            await crawler_util.sleep(10);
        }
    } catch (err) {
        logger.error(
            util.format(`function: parseLogs, block_number: ${receipt.blockNumber}, transactionHash: ${receipt.transactionHash}, Error: ${err.message}`)
        );
    }
};

// Part 1: Parsing transaction details
const parseTransactionDetails = async (network, provider, block_timestamp, receipt) => {
    if (!receipt) {
        // rejected transactions
        // cypress tx: '0xbee58a5c71bfa976dd04b897c5e7f7449b547ebaa819cd58f0f58d943fab0bee'
        return;
    }

    // Non standard nft filtering
    if(receipt.contractAddress) isNoneStandardNft = contract_abi.noneStandardNft.some(data => data.toLowerCase() === receipt.contractAddress.toLowerCase());
    
    let bERC20, bERC721, bERC1155 = null;

    // deploy smart contract
    if (!crawler_util.isEmptyValue(receipt.contractAddress) && !crawler_util.isEmptyValue(receipt.from) && crawler_util.isEmptyValue(receipt.to)) {
        let name, symbol, decimals, contract, creator, total_supply, owner = null;
        
        try {
            bERC721 = await isERC721Contract(network, provider, receipt.contractAddress);
        } catch (err) {
            logger.error(`function: bERC721 : ${err}`);
        }
        
        try {
            if (!bERC721) bERC1155 = await isERC1155Contract(network, provider, receipt.contractAddress);
        } catch (err) {
            logger.error(`function: bERC1155 : ${err}`);
        }


        if (bERC1155) {
            try {
                contract = new provider.Contract(contract_abi.abiERC1155, receipt.contractAddress);
            } catch {
            }
            try {
                name = await contract.methods.name().call();
            } catch (err) {
                logger.error(`function: contract.methods.name().call() : ${err}`);
            }
            try {
                symbol = await contract.methods.symbol().call();
            } catch (err) {
                logger.error(`function: contract.methods.symbol().call() : ${err}`);
            }
            try {
                owner = await contract.methods.owner().call();
            } catch (err) {
                logger.error(`function: contract.methods.owner() : ${err}`);
            }
            if (!creator) {
                creator = receipt.from;
            }

            // bERC1155 collection collect
            await nft_db.addCollection(network.toLowerCase(), receipt.contractAddress, name, symbol, "erc1155", creator, null, block_timestamp, owner);
            return;
        } else if (bERC721 || isNoneStandardNft) {
            try {
                contract = new provider.Contract(contract_abi.abiERC721, receipt.contractAddress);
            } catch {
            }
            try {
                name = await contract.methods.name().call();
            } catch (err) {
                logger.error(`function: contract.methods.name().call() : ${err}`);
                return;
            }
            try {
                symbol = await contract.methods.symbol().call();
            } catch (err) {
                logger.error(`function: contract.methods.symbol().call() : ${err}`);
            }
            try {
                total_supply = await contract.methods.totalSupply().call();
            } catch (err) {
                logger.error(`function: contract.methods.totalSupply() : ${err}`);
            }
            try {
                owner = await contract.methods.owner().call();
            } catch (err) {
                logger.error(`function: contract.methods.owner() : ${err}`);
            }
            if (!creator) {
                creator = receipt.from;
            }
            try {
                if (name) {
                    // bERC721 컬렉션 추가
                    await nft_db.addCollection(network.toLowerCase(), receipt.contractAddress, name, symbol, "erc721", creator, total_supply, block_timestamp, owner);
                    return;
                }
                return;
            } catch (err) {
                logger.error(`function: parseTransactionDetails : ${err}`);
            }
        }
    } 
};

// Main function to parse the transaction receipt
const parseTransactionReceipt = async (network, provider, block_timestamp, receipt) => {
    // let bERC20 = await parseTransactionDetails(network, provider, block_timestamp, receipt);
    await parseTransactionDetails(network, provider, block_timestamp, receipt);
    // await parseLogs(network, provider, block_timestamp, receipt, bERC20);
    await parseLogs(network, provider, block_timestamp, receipt)
};

const parseTransactionReceipts = async (network, provider, block) => {
    try {
        if (block.transactions_receipt) {
            for (const receipt of block.transactions_receipt) {
                // Run parseTransactionReceipt with receive value
                await parseTransactionReceipt(network, provider, Number(block.timestamp), receipt);
            }
        }
    } catch (err) {
        logger.error(`function: parseTransactionReceipts, block_number: ${block.number}, Error: ${err.message}`);
    }
}

const parseBlock = async (network, provider, block) => {
    try {
        await parseTransactionReceipts(network, provider, block);

        // nft
        if(nft_collections_data.length > 0) {
            await nft_db.addCollectionList(nft_collections_data);
        }
        if(nft_balances_data.length > 0) {
            await nft_db.updateBalanceList(nft_balances_data);
        }
        if(nft_tokens_data.length > 0) {
            await nft_db.updateNFTTokenList(nft_tokens_data);
        }
        if(nft_transaction_data.length > 0) {
            await nft_db.addNFTTransactionList(nft_transaction_data);
        }

        [tokens_data, token_owners_data, transactions_data, nft_collections_data, nft_balances_data, nft_tokens_data, nft_transaction_data] = [[], [], [], [], [], [], []];

    } catch (err) {
        logger.error(`function: parseBlock, block_number: ${block.number}, Error: ${err.message}`);
    }

}

module.exports = { parseBlock };

