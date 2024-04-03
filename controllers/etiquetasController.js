const catchAsync = require("../utils/catchAsync");
const ApiErrors = require("../utils/appError");
const db = require("../db");

exports.getEtiquetas = catchAsync(async (req,res,next) => {
    const respuesta = await db.query(`SELECT nombre, id, tipo FROM Etiquetas`);
    res.status(200).json({
        status: "success",
        etiquetas: respuesta.rows
    })
});

exports.insertEtiquetas = catchAsync(async (req, res, next) => {
    const { nombre, tipo } = req.body;
    if(nombre == ""){
        return next(new ApiErrors("Debes proveer un nombre", 400));
    }
    if(tipo != "Genero" && tipo != "Categoria"){
        return next(new ApiErrors("El tipo solo puede ser 2 valores (Genero, Categoria)", 400));
    }
    await db.query(`INSERT INTO Etiquetas (nombre, id_administrador, tipo) VALUES ($1, $2, $3)`, [nombre, req.user.id, tipo]);
    res.status(200).json({
        status: "success",
        message: "Etiqueta creada con exito"
    })
})

exports.updateEtiquetas = catchAsync(async (req, res, next) => {
    const { nombre, tipo } = req.body;
    const { id } = req.params;
    if(nombre == ""){
        return next(new ApiErrors("Debes proveer un nombre", 400));
    }
    if(tipo != "Genero" && tipo != "Categoria"){
        return next(new ApiErrors("El tipo solo puede ser 2 valores (Genero, Categoria)", 400));
    }
    await db.query(`UPDATE Etiquetas SET nombre = $1, tipo = $2, id_administrador = $3 WHERE id = $4`, [nombre, tipo, req.user.id, id]);
    res.status(200).json({
        status: "success",
        message: "Etiqueta actualizada con exito"
    })
})

exports.deleteEtiquetas = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const preDeleteTag = await db.query(`SELECT nombre FROM Etiquetas WHERE id = $1`, [id]);
    if(preDeleteTag.rowCount < 1){
        return next(new ApiErrors("La etiqueta no existe", 400));
    }
    const wtf = await db.query(`INSERT INTO tempEtiquetas (id, nombre) VALUES ($1, $2) RETURNING id, nombre`, [req.user.id, preDeleteTag.rows[0].nombre]);
    await db.query(`DELETE FROM Etiquetas WHERE id = $1`, [id]);
    await db.query(`DELETE FROM tempEtiquetas`);
    res.status(200).json({
        status: "success",
        message: "Etiqueta eliminada con exito"
    })
})