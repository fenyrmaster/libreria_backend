const db = require("../db");
const { createUserTable, rolesType, fix, uuidextension } = require("../models/userModel");

const runMigrations = async () => {
    console.log("BEGIN DB MIGRATION");

    const client = await db.connect();

    try{
        await client.query("BEGIN");
        await client.query(uuidextension);
        await client.query(rolesType);
        await client.query(createUserTable);
        await client.query("COMMIT");

        console.log("END DB MIGRATION");

    }catch(error){
        await client.query("ROLLBACK");
        console.log("DB MIGRATION FAILED");
        
        throw error;

    } finally{
        client.release();
    }
}

module.exports = runMigrations;