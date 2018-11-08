module.exports = {
    database: {
        schema: 'plutoyd',
        host: 'localhost',
        port: 3306,
        username: 'plutoyd',
        password: 'plutoyd'
    },
    mainnet: {
        host: 'http://127.0.0.1:8501',
        tokenAddress: '0xc20b52cbbb096d7b1dfaa4ec14c5ac6028a30742'
    },
    mynet: {
        host: 'http://127.0.0.1:8502'
    },
    tokenFuncHash: {
        '40c10f19': 'mint',
        'a9059cbb': 'transfer',
        '23b872dd': 'transferFrom'
    }
};
