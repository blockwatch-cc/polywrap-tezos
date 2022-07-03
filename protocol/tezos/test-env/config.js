require("dotenv").config({ path: `${__dirname}/.env` });

const blockTime = parseInt(process.env.TEZOS_POLYWRAP_BLOCK_TIME)
const Config = {
    PORT: process.env.TEZOS_POLYWRAP_PORT || 20000,
    BLOCK_TIME: !isNaN(blockTime) ? blockTime : 5,
    PLATFORM: process.env.TEZOS_POLYWRAP_PLATFORM || 'linux/arm64',
    PROTOCOL: process.env.TEZOS_POLYWRAP_PROTOCOL || 'Ithaca'
}

module.exports = Config