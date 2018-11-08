const config = require('./config');
const abi = require('./abi');
const Web3 = require('web3');
const Repository = require('./repository');

const web3 = new Web3(new Web3.providers.HttpProvider(config.mainnet.host));
const erc20 = new web3.eth.Contract(abi.token, config.mainnet.tokenAddress);


// Repository.getBlockchainInfo('eth-mainnet').then(blockInfo => {
//     console.log(JSON.stringify(blockInfo))
//     process.exit();
// });

async function syncToDB(blockNumber) {
    await web3.eth.getBlock(blockNumber).then(block => {
        // console.log(JSON.stringify(block));
        block.transactions.forEach((txHash, id) => {
            web3.eth.getTransaction(txHash).then(txInfo => {
                txInfo['create_dt'] = new Date();
                txInfo['value'] = web3.utils.fromWei(txInfo['value'], 'ether');
                Repository.createTransaction(txInfo);
                if (txInfo.to && txInfo.to.toLowerCase() === config.mainnet.tokenAddress.toLowerCase()) {
                    console.log(JSON.stringify(txInfo));
                    var hash = txInfo.input.substring(2, 10).toLowerCase();
                    switch (config.tokenFuncHash[hash]) {
                        case 'mint':
                            //  owner의 balance를 조회해서 DB에 update
                            erc20.methods.owner().call()
                                .then(owner => {
                                    erc20.methods.balanceOf(owner).call().then(balance => {
                                        Repository.upsertTokenbalance(owner, balance);
                                    });
                                });
                            break;
                        case 'transfer':
                            var params = web3.eth.abi.decodeParameters(abi.transferInputs, txInfo.input.substring(11));

                            var to = params[0];
                            var value = web3.utils.hexToNumber(params[1]);
                            console.log('params: to - ' + to + ', value - ' + value);
                            erc20.methods.balanceOf(txInfo.from).call().then(result => {
                                console.log('balanceOf From: ' + JSON.stringify(result));
                                Repository.upsertTokenbalance(txInfo.from, result);
                            });
                            erc20.methods.balanceOf(to).call().then(result => {
                                console.log('balanceOf To: ' + JSON.stringify(result));
                                Repository.upsertTokenbalance(to, result);
                            });
                            break;
                        case 'transferFrom':
                            var params = web3.eth.abi.decodeParameters(abi.transferFromInputs, txInfo.input.substring(11));

                            var from = params[0];
                            var to = params[1];
                            var value = web3.utils.hexToNumber(params[2]);
                            console.log('params: from - ' + from + 'to - ' + to + ', value - ' + value);
                            erc20.methods.balanceOf(txInfo.from).call().then(result => {
                                console.log('balanceOf From: ' + JSON.stringify(result));
                                Repository.upsertTokenbalance(from, result);
                            });
                            erc20.methods.balanceOf(to).call().then(result => {
                                console.log('balanceOf To: ' + JSON.stringify(result));
                                Repository.upsertTokenbalance(to, result);
                            });

                            break;
                        default:
                            break;
                    }
                }
            });
        });
    });
    await Repository.updateBlockchainInfo('eth-mainnet', blockNumber);
}

function startWatching() {
    var blockLimit = 10;

    setInterval(() => {
        Repository.getBlockchainInfo('eth-mainnet').then(blockInfo => {
            web3.eth.getBlockNumber().then(async (number) => {
                if (blockInfo.block_number >= number - blockInfo.confirmation) {
                    return;
                } else {
                    var startNo = blockInfo.block_number + 1;
                    var endNo = Math.min(startNo + blockLimit, number - blockInfo.confirmation + 1);
                    for (var i = startNo; i < endNo; i++) {
                        await syncToDB(i);
                    }
                }
            });
        });
    }, 1000);
}

module.exports = {
    startWatching: startWatching
};


// 0x66548ba3e6d334f20566da16ffdf9e5d4aff4fe4
// 66548ba3e6d334f20566da16ffdf9e5d4aff4fe40
// 000000000000000000000000bf2bdb676775b023ee2f1227efb679aa50263d9d

// 유저 테이블 설계
//     - idx : autoIncremental
//     - id : string
//     - priv_net_address
//     - priv_key
//     - balance
//     - token -> gold -> skillpoint (1분당 하나씩) -> 캐릭터 성장

// express 설치
// body parser (JSON.parsing) 설치

//  ERC20   minting 여러번 할 수 있도록 수정, owner만 할수 있도록


// API 설계해서 미리 만들어 넣고, 기본 응답되도록 구현

