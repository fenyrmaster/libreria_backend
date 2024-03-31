const Pool = require("pg").Pool

const pool = new Pool({ 
    host: process.env.SQL_HOST,
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    port: process.env.SQL_PORT,
    ssl: true
})

module.exports = pool;