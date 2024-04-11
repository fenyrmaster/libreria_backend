const catchAsync = require("../utils/catchAsync");
const ApiErrors = require("../utils/appError");
const db = require("../db");

exports.getAuditorias = catchAsync(async (req, res, next) => {
    let prestamos = {rows: []}, libros = {rows: []}, etiquetas = {rows: []}, accion;
    req.body.accion != "" ? accion = `WHERE accion = '${req.body.accion}'` : accion = "";
    if(req.body.tabla == "" || req.body.tabla == "Prestamos"){
        prestamos = await db.query(`SELECT u.nombre, u.localidad, u.telefono, u.correo_electronico, u.domicilio, u.rol, u.confirmado, u.id AS user_id, u.active, u.image, a.id, a.accion, a.fecha, a.nombre_usuario_prestamo FROM AuditoriaPrestamos a JOIN Usuarios u ON a.id_administrador = u.id ${accion} ORDER BY a.fecha DESC`);
        let stringFilter;
        req.body.accion != "" ? stringFilter = `AND accion = '${req.body.accion}'` : stringFilter = "";
        let nullRefs = await db.query(`SELECT * FROM AuditoriaPrestamos WHERE id_administrador IS NULL ${stringFilter} ORDER BY fecha DESC`);
        prestamos.rows = [...prestamos.rows, ...nullRefs.rows];
    }
    if(req.body.tabla == "" || req.body.tabla == "Libros"){
        libros = await db.query(`SELECT u.nombre, u.localidad, u.telefono, u.correo_electronico, u.domicilio, u.rol, u.confirmado, u.id AS user_id, u.active, u.image, a.id, a.accion, a.fecha, a.nombre_libro FROM AuditoriaLibros a JOIN Usuarios u ON a.id_administrador = u.id ${accion} ORDER BY a.fecha DESC`);
    }
    if(req.body.tabla == "" || req.body.tabla == "Etiquetas"){
        etiquetas = await db.query(`SELECT u.nombre, u.localidad, u.telefono, u.correo_electronico, u.domicilio, u.rol, u.confirmado, u.id AS user_id, u.active, u.image, a.id, a.accion, a.fecha, a.nombre_etiqueta FROM AuditoriaEtiquetas a JOIN Usuarios u ON a.id_administrador = u.id ${accion} ORDER BY a.fecha DESC`);
    }
    res.status(200).json({
        status: "success",
        prestamos: prestamos.rows,
        libros: libros.rows,
        etiquetas: etiquetas.rows
    });
});