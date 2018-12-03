const Config = require('./config');
const Sequelize = require('sequelize');
const query = require('./query');
const code = require('./code');

const sequelize = new Sequelize(Config.database.schema, Config.database.username, Config.database.password, {
    host: Config.database.host,
    port: Config.database.port,
    dialect: 'mysql',
    define: {
        timestamps: false,
        freezeTableName: true,
    },
    timezone: '+09:00',
    pool: {
        max: 5,
        min: 1,
        acquire: 3000,
        idle: 10000
    },
    operatorsAliases: false
});

const transaction = sequelize.define('transaction', {
    idx: { type: Sequelize.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    hash: { type: Sequelize.STRING(80), allowNull: false },
    nonce: { type: Sequelize.INTEGER, allowNull: false },
    blockHash: { type: Sequelize.STRING(80), allowNull: false },
    blockNumber: { type: Sequelize.INTEGER, allowNull: true },
    transactionIndex: { type: Sequelize.INTEGER, allowNull: true },
    from: { type: Sequelize.STRING(42), allowNull: false },
    to: { type: Sequelize.STRING(42), allowNull: false },
    value: { type: Sequelize.DECIMAL(16, 8), allowNull: false },
    gas: { type: Sequelize.INTEGER, allowNull: false },
    gasPrice: { type: Sequelize.STRING(45), allowNull: false },
    input: { type: Sequelize.STRING(1024), allowNull: false },
    create_dt: { type: Sequelize.DATE, allowNull: false }
});

const blockchain = sequelize.define('blockchain', {
    idx: { type: Sequelize.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING(45), allowNull: false },
    confirmation: { type: Sequelize.INTEGER, allowNull: false },
    block_number: { type: Sequelize.BIGINT, allowNull: false },
    create_dt: { type: Sequelize.STRING(45), allowNull: false }
});

const tokenBalance = sequelize.define('token_balance', {
    address: { type: Sequelize.STRING(42), allowNull: false },
    balance: { type: Sequelize.BIGINT, allowNull: false}
});

const user = sequelize.define('user', {
    idx: { type: Sequelize.BIGINT, allowNull: false, primaryKey: true, autoIncrement: true },
    user_id: { type: Sequelize.STRING(45), allowNull: false },
    token: { type: Sequelize.BIGINT, defaultValue: 0, allowNull: false },
    point: { type: Sequelize.BIGINT, defaultValue: 0, allowNull: false },
    pend_token: { type: Sequelize.BIGINT, defaultValue: 0, allowNull: false },
    pend_point: { type: Sequelize.BIGINT, defaultValue: 0, allowNull: false },
    address: { type: Sequelize.STRING(42), allowNull: false },
    priv_key: { type: Sequelize.STRING(66), allowNull: false },
    create_dt: { type: Sequelize.DATE, allowNull: false },
    update_dt: { type: Sequelize.DATE, allowNull: false }
});

const pointTransaction = sequelize.define('point_transaction', {
    idx: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
    user_idx: Sequelize.BIGINT,
    amount: Sequelize.BIGINT,
    from: Sequelize.STRING(42),
    to: Sequelize.STRING(42),
    code: Sequelize.TINYINT,
    hash: Sequelize.STRING(70),
    create_dt: Sequelize.DATE,
    update_dt: Sequelize.DATE,
    confirm: Sequelize.BOOLEAN,
    fee: Sequelize.BIGINT,
});

const codeTable = sequelize.define('code', {
    type: { type: Sequelize.TINYINT, primaryKey: true },
    id: { type: Sequelize.INTEGER, primaryKey: true },
    name: Sequelize.STRING(45)
});

const character = sequelize.define('character', {
    idx: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
    user_idx: Sequelize.BIGINT,
    name: Sequelize.STRING(45),
    address: Sequelize.STRING(42),
    hash: Sequelize.STRING(70),
    create_dt: Sequelize.DATE,
    update_dt: Sequelize.DATE,
});

module.exports = {
    getBlockchainInfo: async function (name) {
        return await blockchain.findOne({
            where: {
                name: name
            }
        });
    },
    updateBlockchainInfo: async function (name, blockNumber) {
        return await blockchain.update({
            block_number: blockNumber,
        }, {
            where: {
                name: name
            }
        });
    },
    createTransaction: async function (txInfo) {
        return await transaction.build(txInfo).save();
    },
    upsertTokenbalance: async function (address, balance) {
        return await tokenBalance.upsert({
            address: address,
            balance: balance
        });
    },
    createUser: async function (userInfo) {
        return await user.build(userInfo).save();
    },
    updateUserToken: async function (address, amount) {
        let values = {
            address: address,
            amount: amount,
        };
        return await sequelize.query(query.updateUserToken, { replacements: values })
            .spread(function (results, metadata) {
                // console.log(results);
            }, function (err) {
                console.error(err);
            });
    },
    exchagnePoint: async function (idx, token, amount) {
        try {
            var t = await sequelize.transaction();
            let result = await user.findOne({
                where: { idx: idx },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            // console.log(result);
            if (result.dataValues.token < token) {
                throw 'Not enough token';
            } else {
                await user.update({
                    token: result.dataValues.token - token,
                    pend_point: result.dataValues.pend_point + amount
                }, {
                    where: {
                        idx: idx
                    },
                    transaction: t
                });

                await pointTransaction.build({
                    user_idx: idx,
                    amount: amount,
                    to: result.dataValues.address,
                    code: code.transaction.EXCHANGE_POINT,
                    create_dt: new Date(),
                    update_dt: new Date()
                }).save({
                    transaction: t
                });
            }
            t.commit();
            // return new Promise.resolve(true);
        } catch (e) {
            console.error(e);
            t.rollback();
            // return new Promise.reject(e);
        }
    },
    exchangeToken: async function (idx, point, amount, fee) {
        try {
            var t = await sequelize.transaction();
            let result = await user.findOne({
                where: { idx: idx },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            // console.log(result);
            if (result.dataValues.point - fee < point) {
                throw 'Not enough point';
            } else {
                await user.update({
                    point: result.dataValues.point - point - fee,
                    pend_token: result.dataValues.pend_token + amount
                }, {
                    where: {
                        idx: idx
                    },
                    transaction: t
                });

                await pointTransaction.build({
                    user_idx: idx,
                    amount: amount,
                    fee: fee,
                    to: result.dataValues.address,
                    code: code.transaction.EXCHANGE_TOKEN,
                    create_dt: new Date(),
                    update_dt: new Date()
                }).save({
                    transaction: t
                });
            }
            t.commit();
            // return new Promise.resolve(true);
        } catch (e) {
            console.error(e);
            t.rollback();
            // return new Promise.reject(e);
        }
    },
    transferPoint: async function (idx, to, amount, fee) {
        try {
            var t = await sequelize.transaction();
            let fromUser = await user.findOne({
                where: { idx: idx },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            // console.log(fromUser);
            if (fromUser.dataValues.point - fee < amount) {
                throw 'Not enough point';
            } else {
                await user.update({
                    point: fromUser.dataValues.point - amount
                }, {
                    where: {
                        idx: idx
                    },
                    transaction: t
                });

                let toUser = await user.findOne({
                    where: { idx: to },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });

                await user.update({
                    pend_point: toUser.dataValues.pend_point + amount
                }, {
                    where: {
                        idx: to
                    },
                    transaction: t
                });

                await pointTransaction.build({
                    user_idx: idx,
                    amount: amount,
                    fee: fee,
                    from: fromUser.dataValues.address,
                    to: toUser.dataValues.address,
                    code: code.transaction.TRANSFER,
                    create_dt: new Date(),
                    update_dt: new Date()
                }).save({
                    transaction: t
                });
            }
            t.commit();
            // return new Promise.resolve(true);
        } catch (e) {
            console.error(e);
            t.rollback();
            // return new Promise.reject(e);
        }
    },
    burnPoint: async function (idx, amount) {
        try {
            var t = await sequelize.transaction();
            let result = await user.findOne({
                where: { idx: idx },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });
            // console.log(result);
            if (result.dataValues.point < amount) {
                throw 'Not enough point';
            } else {
                await user.update({
                    pend_point: result.dataValues.pend_point - amount
                }, {
                    where: {
                        idx: idx
                    },
                    transaction: t
                });

                await pointTransaction.build({
                    user_idx: idx,
                    amount: (-1) * amount,
                    to: result.dataValues.address,
                    code: code.transaction.BURN,
                    create_dt: new Date(),
                    update_dt: new Date()
                }).save({
                    transaction: t
                });
            }
            t.commit();
            // return new Promise.resolve(true);
        } catch (e) {
            console.error(e);
            t.rollback();
            // return new Promise.reject(e);
        }
    },
    getPointTransactionList: async function() {
        return await pointTransaction.findAll({
            where: { confirm: false },
            order: [
                ['create_dt', 'ASC']
            ]
        });
    },
    updateTransactionHash: async (idx, hash) => {
        return await pointTransaction.update({
            hash: hash
        }, {
            where: {
                idx: idx
            }
        });
    },
    updateExchangePointConfirm: async (idx, confirm, to, amount) => {
        try {
            var t = await sequelize.transaction();
            await pointTransaction.update({
                confirm: confirm,
                update_dt: new Date()
            }, {
                where: {
                    idx: idx
                },
                transaction: t
            });

            let { dataValues } = await user.findOne({
                where: { address: to },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            // if (amount <= dataValues.pend_point) {
                await user.update({
                    point: dataValues.point + amount,
                    pend_point: dataValues.pend_point - amount
                }, {
                    where: { address: to },
                    transaction: t
                });
            // } else {
            //     console.error('Not enough pended point');
            // }

            t.commit();
            // return new Promise.resolve(true);
        } catch (e) {
            console.error(e);
            t.rollback();
            // return new Promise.reject(e);
        }
    },
    updateExchangeTokenConfirm: async (idx, confirm, to, amount) => {
        try {
            var t = await sequelize.transaction();
            await pointTransaction.update({
                confirm: confirm,
                update_dt: new Date()
            }, {
                where: {
                    idx: idx
                },
                transaction: t
            });

            let { dataValues } = await user.findOne({
                where: { address: to },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (amount <= dataValues.pend_token) {
                await user.update({
                    token: dataValues.token + amount,
                    pend_token: dataValues.pend_token - amount
                }, {
                    where: { address: to },
                    transaction: t
                });
            } else {
                console.error('Not enough pended token');
            }

            t.commit();
            // return new Promise.resolve(true);
        } catch (e) {
            console.error(e);
            t.rollback();
            // return new Promise.reject(e);
        }
    },
    insertSkills: async () => {
        var skills = await codeTable.findAll({
            where: { type: 1 }
        });
        skills.forEach(item => code.skills.push(item.dataValues));
        console.log('code.skills', code.skills);
    },
    insertSkins: async () => {
        var skins = await codeTable.findAll({
            where: { type: 2 }
        });
        skins.forEach(item => code.skins.push(item.dataValues));
        console.log('code.skills', code.skins);
    },
    getUserInfo: async (idx) => {
        return await user.findOne({
            where: { idx: idx }
        });
    },
    createCharacter: async (idx, charName, address, hash) => {
        try {
            var t = await sequelize.transaction();
            await character.build({
                user_idx: idx,
                name: charName,
                address: address,
                hash: hash,
                create_dt: new Date(),
                update_dt: new Date()
            }).save({
                transaction: t
            });
            t.commit();
        } catch (e) {
            console.error(e);
            t.rollback();
        }
    },
    getCharacterInfo: async (idx, name) => {
        return await character.findOne({
            where: { user_idx: idx, name: name }
        });
    }
};
