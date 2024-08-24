const catchAsync = require("../utils/catchAsync");
const ApiErrors = require("../utils/appError");
const Email = require("../utils/email");
const db = require("../db");
const e = require("express");

const addBookTags = async bookID => {
    const tags = await db.query(`SELECT t.nombre, t.tipo, t.id FROM BooksTags b JOIN Etiquetas t ON b.id_tag = t.id  WHERE id_book = $1 `, [bookID]);
    return tags.rows;
}

exports.createPrestamo = catchAsync(async(req,res,next) => {
    const { bookId } = req.body
    const checkIfAlredyHas = await db.query(`SELECT id, id_usuario FROM Prestamos WHERE id_book = $1 AND estado IN ('Reservado', 'Recogido', 'No Devuelto') AND id_usuario = $2`, [bookId, req.user.id]);
    const checkStock = await db.query(`SELECT stock, titulo FROM Books WHERE id = $1`, [bookId]);
    console.log(checkIfAlredyHas)
    if(!req.user.active){
        return next(new ApiErrors("Tu cuenta esta desactivada, contactate con la libreria", 401));
    }
    if(checkIfAlredyHas.rowCount > 0){
        return next(new ApiErrors("Ya has solicitado este libro", 400));
    }
    if(checkStock.rows[0].stock < 1){
        return next(new ApiErrors("Este libro esta agotado, intentalo mas tarde", 400));
    }
    if(checkStock.rowCount < 1){
        return next(new ApiErrors("El libro no existe", 400));
    }
    await db.query(`INSERT INTO tempBooks (user_rol) VALUES ($1)`, [req.user.rol]);
    await db.query(`UPDATE Books SET stock = $1 WHERE id = $2`, [parseInt(checkStock.rows[0].stock)-1, bookId]);
    await db.query(`DELETE FROM tempBooks`);

    const date = new Date();
    date.setDate(date.getDate() + 7);
    await db.query(`INSERT INTO tempPrestamos (rol_usuario) VALUES ($1)`, [req.user.rol]);
    await db.query(`INSERT INTO Prestamos (fecha_entrega, id_usuario, id_book, estado) VALUES ($1, $2, $3, $4)`, [date.toDateString(), req.user.id, bookId, "Reservado"]);
    await db.query(`DELETE FROM tempPrestamos`);
    await new Email(req.user).sendReservaConfirmed(checkStock.rows[0].titulo);
    res.status(200).json({
        status: "success",
        message: "Se ha reservado tu prestamo"
    });
});

exports.getPrestamos = catchAsync(async(req,res,next) => {
    let stringFilter = "";
    let stringTmp = "";
    let bandString = false;
    let prestamos;
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
    let stringQuery = `SELECT p.id, p.fecha_entrega, p.fecha_vencimiento, u.nombre, u.localidad, u.telefono, u.correo_electronico, u.domicilio, u.rol, u.confirmado, u.id AS user_id, u.active, u.image, p.id_book, p.estado FROM Prestamos p JOIN Usuarios u ON p.id_usuario = u.id  ${stringFilter != "" ? "WHERE" : ""} ${stringFilter}`
    prestamos = await db.query(stringQuery);
    await Promise.all(prestamos.rows.map(async prestamo => {
        let libro = await db.query(`SELECT titulo, sinopsis, stock, edicion, autores, fecha_publicacion, paginas, image, editorial, id, oferta_inicio, oferta_fin, descuento, precio FROM Books WHERE id = $1`, [prestamo.id_book])
        prestamo.libro = libro.rows[0];
        let etiquetasAll = await addBookTags(prestamo.libro.id);
        prestamo.libro.etiquetas = etiquetasAll;
    }));
    res.status(200).json({
        status: "success",
        prestamos: prestamos.rows
    });
});

exports.cancelPrestamoOwner = catchAsync(async(req,res,next) => {
    const prestamo = await db.query(`SELECT id_usuario, estado FROM Prestamos WHERE id = $1`, [req.params.id]);
    if(prestamo.rowCount < 1){
        return next(new ApiErrors("El prestamo no existe", 400));
    }
    if(prestamo.rows[0].estado != "Reservado"){
        return next(new ApiErrors("No puedes cancelar este pedido, contacta un administrador", 400));
    }
    if(prestamo.rows[0].id_usuario != req.user.id){
        return next(new ApiErrors("No te pertenece este prestamo", 401));
    }
    const checkStock = await db.query(`SELECT stock, titulo FROM Books WHERE id = $1`, [req.body.bookId]);
    await db.query(`INSERT INTO tempBooks (user_rol) VALUES ($1)`, [req.user.rol]);
    await db.query(`UPDATE Books SET stock = $1 WHERE id = $2`, [parseInt(checkStock.rows[0].stock)+1, req.body.bookId]);
    await db.query(`DELETE FROM tempBooks`);

    const date = new Date();
    date.setDate(date.getDate());
    await db.query(`INSERT INTO tempPrestamos (rol_usuario) VALUES ($1)`, [req.user.rol]);
    await db.query(`UPDATE Prestamos SET estado = 'Cancelado', fecha_entrega = $1 WHERE id = $2`, [date.toDateString(), req.params.id]);
    await db.query(`DELETE FROM tempPrestamos`);
    await new Email(req.user).sendCanceladoUserPrestamo(checkStock.rows[0].titulo);
    res.status(200).json({
        status: "success",
        message: "Prestamo cancelado con exito"
    });
})

exports.cancelPrestamoAdmin = catchAsync(async(req,res,next) => {
    const prestamo = await db.query(`SELECT u.correo_electronico, u.nombre, p.estado FROM Prestamos p JOIN Usuarios u ON p.id_usuario = u.id WHERE p.id = $1`, [req.params.id]);
    if(prestamo.rowCount < 1){
        return next(new ApiErrors("El prestamo no existe", 400));
    }
    if(prestamo.rows[0].estado != "Reservado"){
        return next(new ApiErrors("No puedes cancelar este pedido", 400));
    }
    const checkStock = await db.query(`SELECT stock, titulo FROM Books WHERE id = $1`, [req.body.bookId]);
    await db.query(`INSERT INTO tempBooks (user_rol) VALUES ($1)`, [req.user.rol]);
    await db.query(`UPDATE Books SET stock = $1, id_administrador = $2 WHERE id = $3`, [parseInt(checkStock.rows[0].stock)+1, req.user.id, req.body.bookId]);
    await db.query(`DELETE FROM tempBooks`);

    const date = new Date();
    date.setDate(date.getDate());
    await db.query(`INSERT INTO tempPrestamos (rol_usuario, nombre) VALUES ($1, $2)`, [req.user.rol, prestamo.rows[0].nombre]);
    await db.query(`UPDATE Prestamos SET estado = 'Cancelado', id_administrador = $1, fecha_entrega = $2 WHERE id = $3`, [req.user.id, date.toDateString(), req.params.id]);
    await db.query(`DELETE FROM tempPrestamos`);
    await new Email(prestamo.rows[0]).sendCanceladoAdminPrestamo(checkStock.rows[0].titulo);
    res.status(200).json({
        status: "success",
        message: "Prestamo cancelado con exito"
    });
})

exports.libroRecogidoPrestamo = catchAsync(async(req,res,next) => {
    const prestamo = await db.query(`SELECT u.correo_electronico, u.nombre, p.estado FROM Prestamos p JOIN Usuarios u ON p.id_usuario = u.id WHERE p.id = $1`, [req.params.id]);
    if(prestamo.rowCount < 1){
        return next(new ApiErrors("El prestamo no existe", 400));
    }
    if(prestamo.rows[0].estado != "Reservado"){
        return next(new ApiErrors("Hubo un error", 400));
    }
    const date = new Date();
    date.setDate(date.getDate()+14);
    await db.query(`INSERT INTO tempPrestamos (rol_usuario, nombre) VALUES ($1, $2)`, [req.user.rol, prestamo.rows[0].nombre]);
    await db.query(`UPDATE Prestamos SET estado = 'Recogido', id_administrador = $1, fecha_vencimiento = $2 WHERE id = $3`, [req.user.id, date.toDateString(), req.params.id]);
    await db.query(`DELETE FROM tempPrestamos`);
    await new Email(prestamo.rows[0]).sendRecogidoPrestamo(req.body.bookName);
    res.status(200).json({
        status: "success",
        message: "Prestamo marcado como recogido con exito"
    });
})

exports.libroNoDevuelto = catchAsync(async(req,res,next) => {
    const prestamo = await db.query(`SELECT u.correo_electronico, u.nombre, p.estado FROM Prestamos p JOIN Usuarios u ON p.id_usuario = u.id WHERE p.id = $1`, [req.params.id]);
    if(prestamo.rowCount < 1){
        return next(new ApiErrors("El prestamo no existe", 400));
    }
    if(prestamo.rows[0].estado != "Recogido"){
        return next(new ApiErrors("Hubo un error", 400));
    }
    const date = new Date();
    date.setDate(date.getDate());
    await db.query(`INSERT INTO tempPrestamos (rol_usuario, nombre) VALUES ($1, $2)`, [req.user.rol, prestamo.rows[0].nombre]);
    await db.query(`UPDATE Prestamos SET estado = 'No Devuelto', id_administrador = $1, fecha_entrega = $2 WHERE id = $3`, [req.user.id, date.toDateString(), req.params.id]);
    await db.query(`DELETE FROM tempPrestamos`);
    await new Email(prestamo.rows[0]).sendNoDevueltoPrestamo(req.body.bookName);
    res.status(200).json({
        status: "success",
        message: "Prestamo marcado como no recogido con exito"
    });
})

exports.libroDevuelto = catchAsync(async(req,res,next) => {
    const prestamo = await db.query(`SELECT u.correo_electronico, u.nombre, p.estado FROM Prestamos p JOIN Usuarios u ON p.id_usuario = u.id WHERE p.id = $1`, [req.params.id]);
    if(prestamo.rowCount < 1){
        return next(new ApiErrors("El prestamo no existe", 400));
    }
    if(prestamo.rows[0].estado != "Recogido"){
        return next(new ApiErrors("No se pueden devolver libros que no se recogieron", 400));
    }

    const checkStock = await db.query(`SELECT stock, titulo FROM Books WHERE id = $1`, [req.body.bookId]);
    await db.query(`INSERT INTO tempBooks (user_rol) VALUES ($1)`, [req.user.rol]);
    await db.query(`UPDATE Books SET stock = $1, id_administrador = $2 WHERE id = $3`, [parseInt(checkStock.rows[0].stock)+1, req.user.id, req.body.bookId]);
    await db.query(`DELETE FROM tempBooks`);

    const date = new Date();
    date.setDate(date.getDate());
    await db.query(`INSERT INTO tempPrestamos (rol_usuario, nombre) VALUES ($1, $2)`, [req.user.rol, prestamo.rows[0].nombre]);
    await db.query(`UPDATE Prestamos SET estado = 'Devuelto', id_administrador = $1, fecha_entrega = $2 WHERE id = $3`, [req.user.id, date.toDateString(), req.params.id]);
    await db.query(`DELETE FROM tempPrestamos`);
    await new Email(prestamo.rows[0]).sendDevueltoPrestamo(checkStock.rows[0].titulo);
    res.status(200).json({
        status: "success",
        message: "Prestamo marcado como devuelto con exito"
    });
})

exports.eliminarPrestamo = catchAsync(async(req,res,next) => {
    const prestamo = await db.query(`SELECT u.correo_electronico, u.nombre, p.estado FROM Prestamos p JOIN Usuarios u ON p.id_usuario = u.id WHERE p.id = $1`, [req.params.id]);
    if(prestamo.rowCount < 1){
        return next(new ApiErrors("El prestamo no existe", 400));
    }
    if(prestamo.rows[0].estado == "Reservado" || prestamo.rows[0].estado == "Recogido" ){
        return next(new ApiErrors("No se pueden eliminar prestamos activos", 400));
    }

    await db.query(`INSERT INTO tempPrestamos (rol_usuario, nombre, id) VALUES ($1, $2, $3)`, [req.user.rol, prestamo.rows[0].nombre, req.user.id]);
    await db.query(`DELETE FROM Prestamos WHERE id = $1`, [req.params.id]);
    await db.query(`DELETE FROM tempPrestamos`);
    res.status(200).json({
        status: "success",
        message: "Prestamo eliminado con exito"
    });
})