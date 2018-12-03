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
        host: 'http://127.0.0.1:8502',
        pointAddress: '0x4413de17da7c97bd8de27f8df2f6943e552d3312',
        address: '0x66787CcB24253c6e5Dc2220E5e51c9676c5fb25B',
        privateKey: '0xc5f81f9aac6ebbf18e9781acedf39cb38d266aa2c2bb25d3b3153f17c777d83e'
    },
    tokenFuncHash: {
        'a0712d68': 'mint',
        'a9059cbb': 'transfer',
        '23b872dd': 'transferFrom'
    }
};
