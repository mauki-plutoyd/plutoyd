const config = require('./config');
const abi = require('./abi');
const Web3 = require('web3');
const Repository = require('./repository');
const code = require('./code');

const web3 = new Web3(new Web3.providers.HttpProvider(config.mynet.host));
const point = new web3.eth.Contract(abi.point, config.mynet.pointAddress);

function startBatchProcess() {
    setInterval(async () => {
        var nonce = await web3.eth.getTransactionCount(config.mynet.address, 'pending')
        console.log('startBatchProcess: nonce = ' + nonce);
        var result = await Repository.getPointTransactionList();
        result.forEach(async (item) => {
            // console.log('Item values: ', item);
            var data = item.dataValues;
            var abi;
            var tx;
            switch (data.code) {
                case code.transaction.BURN:
                    console.log('Nonce of Burn: ' + nonce);
                    abi = point.methods.burn(data.to, data.amount * (-1)).encodeABI();
                    tx = makeContractTransaction(config.mynet.address, config.mynet.pointAddress, abi, nonce);
                    await sendTransaction(tx, config.mynet.privateKey, async (hash) => {
                        console.log();
                        // update transactin hash
                        await Repository.updateTransactionHash(data.idx, hash);
                    }, async (receipt) => {
                        console.log('receipt', receipt);
                        await Repository.updateExchangePointConfirm(data.idx, true, data.to, data.amount);
                    });
                    break;
                case code.transaction.EXCHANGE_POINT:
                    abi = point.methods.mint(data.to, data.amount).encodeABI();
                    tx = makeContractTransaction(config.mynet.address, config.mynet.pointAddress, abi, nonce);
                    await sendTransaction(tx, config.mynet.privateKey, async (hash) => {
                        console.log();
                        // update transactin hash
                        await Repository.updateTransactionHash(data.idx, hash);
                    }, async (receipt) => {
                        console.log('receipt', receipt);
                        await Repository.updateExchangePointConfirm(data.idx, true, data.to, data.amount);
                    });
                    break;
                case code.transaction.EXCHANGE_TOKEN:
                    abi = point.methods.burn(data.to, data.amount + data.fee).encodeABI();
                    tx = makeContractTransaction(config.mynet.address, config.mynet.pointAddress, abi, nonce);
                    await sendTransaction(tx, config.mynet.privateKey, async (hash) => {
                        console.log();
                        // update transactin hash
                        await Repository.updateTransactionHash(data.idx, hash);
                    }, async (receipt) => {
                        console.log('receipt', receipt);
                        await Repository.updateExchangeTokenConfirm(data.idx, true, data.to, data.amount, data.fee);
                    });
                    break;
                case code.transaction.MINT:
                    break;
                case code.transaction.TRANSFER:
                    abi = point.methods.transfer(data.from, data.to, data.amount).encodeABI();
                    tx = makeContractTransaction(config.mynet.address, config.mynet.pointAddress, abi, nonce);
                    await sendTransaction(tx, config.mynet.privateKey, async (hash) => {
                        console.log();
                        // update transactin hash
                        await Repository.updateTransactionHash(data.idx, hash);
                    }, async (receipt) => {
                        console.log('receipt', receipt);
                        await Repository.updateExchangePointConfirm(data.idx, true, data.to, data.amount);
                        await Repository.burnPoint(data.user_idx, data.fee);
                    });
                    break;
                default:
                    return;
            }
            nonce++;
        });        
    }, 5000);
}

const gasLimit = 4200000;

const makeContractTransaction = (from, to, data, nonce) => {
    return {
        from: from,
        to: to,
        data: data,
        gasLimit: web3.utils.toHex(gasLimit),
        nonce: web3.utils.toHex(nonce),
    }
};

const sendTransaction = async (tx, privKey, updateFunc, confirmFunc) => {
    return web3.eth.accounts.signTransaction(tx, privKey)
        .then(signed => {
            return web3.eth.sendSignedTransaction(signed.rawTransaction)
                .once('transactionHash', (transactionHash) => {
                    updateFunc(transactionHash);
                })
                .once('receipt', (receipt) => {
                    if (!receipt.status) {
                        throw new Error('failed to execute point transaction');
                    }
                    confirmFunc(receipt);
                })
                .then(() => {
                    return true;
                })
                .catch(error => {
                    throw error;
                });
        })
        .catch(error => {
            console.log('failed to sign the transaction: ' + error);
            return false;
        });
}

module.exports = {
    startBatchProcess,
    makeContractTransaction,
    sendTransaction,
    getNonce: async (address) => await web3.eth.getTransactionCount(address, 'pending')
};

