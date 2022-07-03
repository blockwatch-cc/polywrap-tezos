const chalk = require('chalk')
const { up, down, getAccounts } = require('./index')

switch (process.argv[2]) {
    case 'up':
        up().catch((err) => {
            console.log(err)
            process.exit(1)
        })
        break
    case 'down': 
        down().catch((err) => {
            console.log(err)
            process.exit(1)
        })
        break
    case 'accounts':
        getAccounts()
        .then(prettyPrintAccounts)
        .catch((err) => {
            console.log(err)
            process.exit(1)
        })
        break
    default:
        console.log('> ', 'Invalid command.')
}

function prettyPrintAccounts(accounts = []) {
    accounts.forEach((account) => {
        Object.keys(account).forEach((key) => {
            console.log(`${key.padEnd(8, ' ')}\t${chalk.cyan(account[key])}`)
        })
    })
}