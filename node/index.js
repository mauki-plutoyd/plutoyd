const watcher = require ('./watcher');
const config = require('./config');
const Repository = require('./repository');
const Express = require('express');
const Parser = require('body-parser');
const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.HttpProvider(config.mainnet.host));

const app = Express();
app.use(Parser.json());
app.use(Parser.urlencoded({ extended: true }));

watcher.startWatching();

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
    })
    .catch(console.error);
    

    res.send('user_id: ' + req.body.user_id);
});

app.get('/user/:idx', async (req, res) => {
    console.log('get userinfo : ' + req.params.idx);
    res.send('You have requested to get user[' + req.params.idx + '].')
});

const server = app.listen(8088, () => console.log);