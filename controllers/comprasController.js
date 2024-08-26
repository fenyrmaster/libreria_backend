const catchAsync = require("../utils/catchAsync");
const ApiErrors = require("../utils/appError");
const Email = require("../utils/email");
const db = require("../db");

const addBookTags = async bookID => {
    const tags = await db.query(`SELECT t.nombre, t.tipo, t.id FROM BooksTags b JOIN Etiquetas t ON b.id_tag = t.id  WHERE id_book = $1 `, [bookID]);
    return tags.rows;
}

exports.getCompras = catchAsync(async(req,res,next) => {
    let stringFilter = "";
    let stringTmp = "";
    let bandString = false;
    let compras;
    Object.keys(req.body).forEach(function(key, idx, arr){
        if(req.body[key] != "" && key != "categoria"){
            stringTmp = ` ${bandString ? "AND" : ""} ${key == "estado" ? "p." : "u."}${key} ${key == "estado" ? "=" : "ILIKE"} ${key == "estado" ? `'${req.body[key]}'` : `'%${req.body[key]}%'`}`;
            bandString = true;
            stringFilter += stringTmp;
        }
    });
    if(req.query.oneuser == "true"){
        stringFilter += ` ${bandString ? "AND" : ""} u.id = '${req.user.id}'`
    }
    let stringQuery = `SELECT p.id, p.fecha_entrega, u.nombre, u.localidad, u.telefono, u.correo_electronico, p.cantidad, p.precio, u.domicilio, u.rol, u.confirmado, u.id AS user_id, u.active, u.image, p.id_book, p.estado FROM Compras p JOIN Usuarios u ON p.id_usuario = u.id  ${stringFilter != "" ? "WHERE" : ""} ${stringFilter}`
    compras = await db.query(stringQuery);
    await Promise.all(compras.rows.map(async compra => {
        let libro = await db.query(`SELECT titulo, sinopsis, stock, edicion, autores, fecha_publicacion, paginas, image, editorial, id, oferta_inicio, oferta_fin, descuento, precio FROM Books WHERE id = $1`, [compra.id_book])
        compra.libro = libro.rows[0];
        let etiquetasAll = await addBookTags(compra.libro.id);
        compra.libro.etiquetas = etiquetasAll;
    }));
    res.status(200).json({
        status: "success",
        compras: compras.rows
    });
});

exports.cancelCompraAdmin = catchAsync(async(req,res,next) => {
    const compra = await db.query(`SELECT u.correo_electronico, u.nombre, p.estado, p.id_book FROM Compras p JOIN Usuarios u ON p.id_usuario = u.id WHERE p.id = $1`, [req.params.id]);
    if(compra.rowCount < 1){
        return next(new ApiErrors("El prestamo no existe", 400));
    }
    if(compra.rows[0].estado != "Reservado"){
        return next(new ApiErrors("No puedes cancelar este pedido", 400));
    }
    let bookId = compra.rows[0].id_book;
    const checkStock = await db.query(`SELECT stock, titulo FROM Books WHERE id = $1`, [bookId]);
    await db.query(`INSERT INTO tempBooks (user_rol) VALUES ($1)`, [req.user.rol]);
    await db.query(`UPDATE Books SET stock = $1, id_administrador = $2 WHERE id = $3`, [parseInt(checkStock.rows[0].stock)+1, req.user.id, req.body.bookId]);
    await db.query(`DELETE FROM tempBooks`);

    const date = new Date();
    date.setDate(date.getDate());
    //await db.query(`INSERT INTO tempPrestamos (rol_usuario, nombre) VALUES ($1, $2)`, [req.user.rol, prestamo.rows[0].nombre]);
    await db.query(`UPDATE Compras SET estado = 'Cancelado', id_administrador = $1, fecha_entrega = $2 WHERE id = $3`, [req.user.id, date.toDateString(), req.params.id]);
    //await db.query(`DELETE FROM tempPrestamos`);
    await new Email(compra.rows[0]).sendCompraCanceladoAdmin(checkStock.rows[0].titulo);
    res.status(200).json({
        status: "success",
        message: "Prestamo cancelado con exito"
    });
});

exports.libroCompradoRecogido = catchAsync(async(req, res, next) => {
    const compra = await db.query(`SELECT u.correo_electronico, u.nombre, p.estado, p.id_book FROM Compras p JOIN Usuarios u ON p.id_usuario = u.id WHERE p.id = $1`, [req.params.id]);
    if(compra.rowCount < 1){
        return next(new ApiErrors("El prestamo no existe", 400));
    }
    if(compra.rows[0].estado != "Reservado"){
        return next(new ApiErrors("No puedes completar esta compra", 400));
    }
    const date = new Date();
    date.setDate(date.getDate());
    const checkStock = await db.query(`SELECT stock, titulo FROM Books WHERE id = $1`, [compra.rows[0].bookId]);
    //await db.query(`INSERT INTO tempPrestamos (rol_usuario, nombre) VALUES ($1, $2)`, [req.user.rol, prestamo.rows[0].nombre]);
    await db.query(`UPDATE Compras SET estado = 'Entregado', id_administrador = $1, fecha_entrega = $2 WHERE id = $3`, [req.user.id, date.toDateString(), req.params.id]);
    //await db.query(`DELETE FROM tempPrestamos`);
    await new Email(compra.rows[0]).sendCompraCompletadoAdmin(checkStock.rows[0].titulo);
    res.status(200).json({
        status: "success",
        message: "Prestamo completado con exito"
    });
});

exports.cancelCompraOwner = catchAsync(async(req, res, next) => {
    const compra = await db.query(`SELECT id_usuario, id_book, estado FROM Compras WHERE id = $1`, [req.params.id]);
    if(compra.rowCount < 1){
        return next(new ApiErrors("La compra no existe", 400));
    }
    if(compra.rows[0].estado != "Reservado"){
        return next(new ApiErrors("No puedes cancelar esta compra, contacta un administrador", 400));
    }
    if(compra.rows[0].id_usuario != req.user.id){
        return next(new ApiErrors("No te pertenece esta compra", 401));
    }
    const checkStock = await db.query(`SELECT stock, titulo FROM Books WHERE id = $1`, [compra.rows[0].id_book]);
    await db.query(`INSERT INTO tempBooks (user_rol) VALUES ($1)`, [req.user.rol]);
    await db.query(`UPDATE Books SET stock = $1 WHERE id = $2`, [parseInt(checkStock.rows[0].stock)+1, req.body.bookId]);
    await db.query(`DELETE FROM tempBooks`);

    const date = new Date();
    date.setDate(date.getDate());
    //await db.query(`INSERT INTO tempPrestamos (rol_usuario) VALUES ($1)`, [req.user.rol]);
    await db.query(`UPDATE Compras SET estado = 'Cancelado', fecha_entrega = $1 WHERE id = $2`, [date.toDateString(), req.params.id]);
    //await db.query(`DELETE FROM tempPrestamos`);
    await new Email(req.user).sendCanceladoUserCompra(checkStock.rows[0].titulo);
    res.status(200).json({
        status: "success",
        message: "Prestamo cancelado con exito"
    });
});