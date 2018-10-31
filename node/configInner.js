module.exports = {
    database: {
        schema: 'plutoyd',
        host: '192.168.10.104',
        port: 3306,
        username: 'spacecraft',
        password: 'test!234'
    },
    mainnet: {
        host: 'http://127.0.0.1:8501',
        tokenAddress: '0x65a496a71a2c413062b67287c2b19e1caf2431cc'
    },
    mynet: {
        host: 'http://127.0.0.1:8502'
    },
    tokenFuncHash: {
        "40c10f19": "mint",
        "a9059cbb": "transfer",
        "23b872dd": "transferFrom"
    }
};
