const db = require("../db");
const { createUserTable, rolesType, fix, uuidextension } = require("../models/userModel");
const { categoriaType, accionType, auditoriaEtiquetas, createCategoriasModel, triggerUpdateInsertOptions, triggerUpdateInsert, tempTableEtiquetas, triggerDeleteOptions, triggerDelete } = require("../models/categoriasModel");
const { createBooksModel, tempTableBooks, auditoriaLibros, booksTagsModel, bookTriggerDelete, bookTriggerUpdateInsert, bookTriggerDeleteOptions, bookTriggerUpdateInsertOptions } = require("../models/librosModel");
const { estadoType, createPrestamoModel, tempTablePrestamos, auditoriaPrestamos, prestamoTriggerUpdateInsert, prestamoTriggerDelete, prestamoTriggerUpdateInsertOptions, prestamoTriggerDeleteOptions } = require("../models/prestamosModel");
const { createPagoModel, estadoPagosType } = require("../models/comprasModel");

const runMigrations = async () => {
    console.log("BEGIN DB MIGRATION");

    const client = await db.connect();

    try{
        // Creacion de tablas y enums
        await client.query("BEGIN");
        await client.query(uuidextension);
        await client.query(rolesType);
        await client.query(estadoType);
        await client.query(createUserTable);
        await client.query(accionType);
        await client.query(categoriaType);
        await client.query(createCategoriasModel);
        await client.query(createPrestamoModel);
        await client.query(auditoriaEtiquetas);
        await client.query(tempTableEtiquetas);
        await client.query(tempTablePrestamos);
        await client.query(createBooksModel);
        await client.query(tempTableBooks);
        await client.query(auditoriaLibros);
        await client.query(auditoriaPrestamos);
        await client.query(booksTagsModel);
        await client.query(estadoPagosType);
        await client.query(createBooksModel);
        await client.query(createPagoModel);
        
        // Triggers
        await client.query(triggerDelete);
        await client.query(triggerDeleteOptions);
        await client.query(triggerUpdateInsert);
        await client.query(triggerUpdateInsertOptions);
        await client.query(bookTriggerDelete);
        await client.query(bookTriggerUpdateInsert);
        await client.query(bookTriggerDeleteOptions);
        await client.query(bookTriggerUpdateInsertOptions);
        await client.query(prestamoTriggerUpdateInsert);
        await client.query(prestamoTriggerUpdateInsertOptions);
        await client.query(prestamoTriggerDelete);
        await client.query(prestamoTriggerDeleteOptions);
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