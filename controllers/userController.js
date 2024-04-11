const uuid = require("uuid");
const catchAsync = require("../utils/catchAsync");
const ApiErrors = require("../utils/appError");
const db = require("../db");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const sharp = require("sharp");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")){
        cb(null, true)
    } else {
        cb(new CustomError("Not a image, please upload an actual image", 400), false)
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadAvatarImage = upload.single("image");

exports.registrarFotos = catchAsync(async(req,res,next) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_KEY,
        api_secret: process.env.CLOUDINARY_SECRET,
        secure: true
    });
    if(!req.file){
        const err = new ApiErrors(`Tienes que agregar una imagen`, 404);
        return next(err);
    }
    const imagenAvatar = `usuario-${req.user.nombre}-${Date.now()}-avatar`;
    await sharp(req.file.buffer).resize(600,600).toFormat("jpeg").jpeg({quality: 90}).toFile(`imagesTemp/usuarios/${imagenAvatar}`);
    await cloudinary.uploader.upload(`imagesTemp/usuarios/${imagenAvatar}`,{
        resource_type: "image",
        public_id: imagenAvatar
    });
    let url = cloudinary.image(imagenAvatar);
    let urlCortada = url.split("=")[1].split("'")[1];
    await db.query(`UPDATE Usuarios SET image = $1 WHERE id = $2`, [urlCortada, req.user.id]);
    res.status(200).json({
        status: "success",
        message: "Imagen actualizada con exito, refresca la pagina"
    });
})

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

exports.getUsers = catchAsync(async (req,res,next) => {
    let stringFilter = "";
    let stringTmp = "";
    Object.keys(req.body).forEach(function(key, idx, arr){
        if(req.body[key] != ""){
            stringTmp = ` AND ${key} LIKE '%${req.body[key]}%' `;
            stringFilter += stringTmp;
        }
    });
    const users = await db.query(`SELECT nombre, localidad, telefono, correo_electronico, domicilio, rol, confirmado, id, active, image FROM Usuarios WHERE rol = 'Cliente' ${stringFilter}`);
    res.status(200).json({
        status: "success",
        message: "Usuarios encontrados",
        users: users.rows
    })
})