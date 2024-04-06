const catchAsync = require("../utils/catchAsync");
const ApiErrors = require("../utils/appError");
const Email = require("../utils/email");
const db = require("../db");

exports.createPrestamo = catchAsync(async(req,res,next) => {
    const { bookId } = req.body
    const checkIfAlredyHas = await db.query(`SELECT id, id_usuario FROM Prestamos WHERE id_book = $1`, [bookId]);
    const checkStock = await db.query(`SELECT stock, titulo FROM Books WHERE id = $1`, [bookId]);
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

    const date = new Date()
    date.setDate(date.getDate() + 7);
    await db.query(`INSERT INTO tempPrestamos (rol_usuario) VALUES ($1)`, [req.user.rol]);
    await db.query(`INSERT INTO Prestamos (fecha_entrega, id_usuario, id_book, estado) VALUES ($1, $2, $3, $4)`, [date.toDateString(), req.user.id, bookId, "Reservado"]);
    await db.query(`DELETE FROM tempPrestamos`);
    await new Email(req.user).sendReservaConfirmed(checkStock.rows[0].titulo);
    res.status(200).json({
        status: "success",
        message: "Se ha reservado tu prestamo"
    });
})