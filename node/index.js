const watcher = require ('./watcher');
const Batch = require('./batch');
const Config = require('./config');
const Repository = require('./repository');
const Express = require('express');
const Parser = require('body-parser');
const Web3 = require('web3');
const Contracts = require('./contracts');
const Code = require('./code');
const Abi = require('./abi');

const web3 = new Web3(new Web3.providers.HttpProvider(Config.mainnet.host));

const pointExchangeRate = 1;
const tokenExchangeRate = 1;
const exchangeFee = 10;
const transferFee = 1;
const characterPrice = 1;

const app = Express();

app.use(Parser.json());
app.use(Parser.urlencoded({ extended: true }));

// watcher.startWatching();
Batch.startBatchProcess();
Repository.insertSkills();
Repository.insertSkins();

app.post('/user/create', async (req, res) => {
    console.log('user-create requested');
    console.log('user_id: ' + req.body.user_id);
    
    const account = web3.eth.accounts.create();
    console.log('created account: ' + JSON.stringify(account));

    const now = new Date();
    Repository.createUser({
        user_id: req.body.user_id,
        address: account.address,
        priv_key: account.privateKey,
        create_dt: now,
        update_dt: now
    }).then(() => {
        console.log('user created');
        res.send('user_id: ' + req.body.user_id);
    })
    .catch(err => {
        console.error(err);
        res.send('ERR: ' + err);
    });    
});

app.post('/user/exchange-point', async (req, res) => {
    var userIdx = req.body.idx;
    var token = req.body.token;
    var amount = token * pointExchangeRate;
    
    await Repository.exchagnePoint(userIdx, token, amount);
    res.send('success');
});

app.post('/user/exchange-token', async (req, res) => {
    var userIdx = req.body.idx;
    var point = req.body.point;
    var amount = point * tokenExchangeRate;

    await Repository.exchangeToken(userIdx, point, amount, exchangeFee);
    res.send('success');
});

app.post('/user/transfer', async (req, res) => {
    var userIdx = req.body.idx;
    var toIdx = req.body.to;
    var point = req.body.point;
    var amount = point * tokenExchangeRate;

    await Repository.transferPoint(userIdx, toIdx, point, transferFee);
    res.send('success');
});

app.get('/user/:idx', async (req, res) => {
    console.log('get userinfo : ' + req.params.idx);
    res.send('You have requested to get user[' + req.params.idx + '].')
});

app.post('/character/create', async (req, res) => {
    var userIdx = req.body.idx;
    var charName = req.body.name;
    console.log('get userinfo : idx: ' + userIdx + ', name: ' + charName);

    var userInfo = await Repository.getUserInfo(userIdx);
    if (userInfo) {
        var ui = userInfo.dataValues;
        var nonce = await Batch.getNonce(ui.address);
        var hash;
        console.log('Nonce of CreateCharacter: ' + nonce);
        console.log('UserInfo', ui);

        var tx = Batch.makeContractTransaction(ui.address, 0, Contracts.character, nonce);
        await Batch.sendTransaction(tx, ui.priv_key, async (txHash) => {
            console.log('TxHash  of CreateCharacter: ' + txHash);
            hash = txHash;
        }, async (receipt) => {
            console.log('Receipt of CreateCharacter', receipt);
            await Repository.createCharacter(userIdx, charName, receipt.contractAddress, hash);
            
            const character = new web3.eth.Contract(Abi.character, receipt.contractAddress); 
            
            for (var skill of Code.skills) {
                nonce = await Batch.getNonce(ui.address);
                console.log('Nonce of AddSkill: ' + nonce);
                var abi = character.methods.addSkill(skill.id, Math.floor(Math.random() * 5) + 1).encodeABI();
                var tx = Batch.makeContractTransaction(ui.address, receipt.contractAddress, abi, nonce);
                await Batch.sendTransaction(tx, ui.priv_key, (txHash) => {
                    console.log('TxHash of AddSkill: ' + txHash);
                }, (receipt) => {
                    console.log('Receipt of AddSkill: ', receipt.blockHash);
                });
            } 
            
            for (var skin of Code.skins) {
                nonce = await Batch.getNonce(ui.address);
                console.log('Nonce of AddCostume: ' + nonce);
                var abi = character.methods.addCostume(skin.id, 1).encodeABI();
                var tx = Batch.makeContractTransaction(ui.address, receipt.contractAddress, abi, nonce);
                await Batch.sendTransaction(tx, ui.priv_key, (txHash) => {
                    console.log('TxHash of AddCostume: ' + txHash);
                }, (receipt) => {
                    console.log('Receipt of AddCostume: ', receipt.blockHash);
                });
            } 
        });
        
        await Repository.burnPoint(userIdx, characterPrice);
        res.send('success');
    } else {
        res.send('Failed: Not existed user(id: ' + userIdx + ')');
    }    
});

app.post('/character', async (req, res) => {
    var userIdx = req.body.idx;
    var charName = req.body.name;

    console.log('get userinfo : idx: ' + userIdx + ', name: ' + charName);
    var charInfo = await Repository.getCharacterInfo(userIdx, charName);
    if (charInfo) {
        var ci = charInfo.dataValues;
        console.log('CharacterInfo', ci);

        const character = new web3.eth.Contract(Abi.character, ci.address);
        
        var charDetail = {skills: {}, skins: {}};
        for (var skill of Code.skills) {
            var point = await character.methods.getSkillPoint(skill.id).call({ from: Config.mynet.address });
            charDetail.skills[skill.name] = point;
        }

        for (var skin of Code.skins) {
            var id = await character.methods.getCostumeId(skin.id).call({ from: Config.mynet.address });
            charDetail.skins[skin.name] = id;
        }

        res.send(charDetail)
    }
});

const server = app.listen(8088, () => console.log);
