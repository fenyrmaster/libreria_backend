const uuid = require("uuid");
const catchAsync = require("../utils/catchAsync");
const ApiErrors = require("../utils/appError");
const db = require("../db");

exports.changeUserData = catchAsync(async (req,res,next) => {
    const { id } = req.params;
    const { nombre, telefono, domicilio, localidad } = req.body
    const updatedUser = await db.query(`UPDATE Usuarios SET nombre = $1, domicilio = $2, localidad = $3, telefono = $4 WHERE id = $5 RETURNING nombre, localidad, telefono, correo_electronico, domicilio, rol, id, image`, [nombre, domicilio, localidad, telefono, id]);
    res.status(200).json({
        status: "success",
        data: {
            user: {
                nombre: updatedUser.rows[0].nombre,
                correo_electronico: updatedUser.rows[0].correo_electronico,
                id: updatedUser.rows[0].id,
                localidad: updatedUser.rows[0].localidad,
                rol: updatedUser.rows[0].rol,
                domicilio: updatedUser.rows[0].domicilio,
                telefono: updatedUser.rows[0].telefono,
                image: updatedUser.rows[0].image
            }
        }    
    })
})