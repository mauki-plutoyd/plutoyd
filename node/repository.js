const Config = require('./config');
const Sequelize = require('sequelize');

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

module.exports = {
    getBlockchainInfo: async function (name) {
        return await blockchain.findOne({
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
    }
};
