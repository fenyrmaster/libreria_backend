const Pool = require("pg").Pool

console.log(process.env.SQL_HOST);
const pool = new Pool({ 
    host: process.env.SQL_HOST,
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    port: process.env.SQL_PORT,
    ssl: false
})

module.exports = pool;