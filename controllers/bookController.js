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

const addBookTagRef = async (bookID, etiquetaID) => {
    await db.query(`INSERT INTO BooksTags (id_book, id_tag) VALUES ($1, $2)`, [bookID, etiquetaID]);
}

const addBookTags = async bookID => {
    const tags = await db.query(`SELECT t.nombre, t.tipo, t.id FROM BooksTags b JOIN Etiquetas t ON b.id_tag = t.id  WHERE id_book = $1 `, [bookID]);
    return tags.rows;
}

exports.uploadBookImage = upload.single("imagen_portada");

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
    const imagenLibro = `libro-${req.body.titulo}-${Date.now()}-image`;
    await sharp(req.file.buffer).toFormat("jpeg").jpeg({quality: 90}).toFile(`imagesTemp/libros/${imagenLibro}`);
    await cloudinary.uploader.upload(`imagesTemp/libros/${imagenLibro}`,{
        resource_type: "image",
        public_id: imagenLibro
    });
    let url = cloudinary.image(imagenLibro);
    let urlCortada = url.split("=")[1].split("'")[1];
    //await db.query(`UPDATE Usuarios SET image = $1 WHERE id = $2`, [urlCortada, req.user.id]);
    req.body.imageURL = urlCortada
    next();
});

exports.registrarFotosUpdate = catchAsync(async(req,res,next) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_NAME,
        api_key: process.env.CLOUDINARY_KEY,
        api_secret: process.env.CLOUDINARY_SECRET,
        secure: true
    });
    if(!req.file){
        return next();
    }
    const imagenLibro = `libro-${req.body.titulo}-${Date.now()}-image`;
    await sharp(req.file.buffer).toFormat("jpeg").jpeg({quality: 90}).toFile(`imagesTemp/libros/${imagenLibro}`);
    await cloudinary.uploader.upload(`imagesTemp/libros/${imagenLibro}`,{
        resource_type: "image",
        public_id: imagenLibro
    });
    let url = cloudinary.image(imagenLibro);
    let urlCortada = url.split("=")[1].split("'")[1];
    //await db.query(`UPDATE Usuarios SET image = $1 WHERE id = $2`, [urlCortada, req.user.id]);
    req.body.imageURL = urlCortada
    next();
});

exports.insertBook = catchAsync(async (req, res, next) => {
    const { titulo, etiquetas, sinopsis, stock, edicion, autores, fecha_publicacion, paginas, editorial, imageURL, precio } = req.body;
    if(titulo == "" || sinopsis == "" || stock <= -1 || edicion == "" || editorial == "" || autores == "" || fecha_publicacion == "" || paginas <= -1 || !imageURL){
        return next(new ApiErrors("Todos los campos son obligatorios y los valores numericos no pueden ser negativos", 400));
    }
    await db.query(`INSERT INTO tempBooks (user_rol) VALUES ($1)`, [req.user.rol]);
    const bookID = await db.query(`INSERT INTO Books (titulo, sinopsis, stock, edicion, autores, fecha_publicacion, paginas, image, id_administrador, editorial, precio) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`, [titulo, sinopsis, stock, edicion, autores, fecha_publicacion, paginas, imageURL, req.user.id, editorial, precio]);
    await db.query(`DELETE FROM tempBooks`);
    let parsedEtiquetas = etiquetas.split(",");
    parsedEtiquetas.forEach(etiquetaID => {
        addBookTagRef(bookID.rows[0].id, etiquetaID);
    });
    res.status(200).json({
        status: "success",
        message: "Libro creado con exito"
    });
})

exports.getBooks = catchAsync(async (req, res, next) => {
    let stringFilter = "";
    let stringTmp = "";
    let bandString = false;
    let libro;
    (req.query?.name && req.query?.name != "") && (req.body.titulo = req.query.name)
    if(req.body.categoria == ""){
        Object.keys(req.body).forEach(function(key, idx, arr){
            if(req.body[key] != "" && key != "categoria"){
                stringTmp = ` ${bandString ? "AND" : ""} ${key} ILIKE '%${req.body[key]}%' `;
                bandString = true;
                stringFilter += stringTmp;
            }
        });
        if(req.query.stockout == "false"){
            stringFilter += `${bandString ? "AND" : ""} stock > 0`
        }
        let stringQuery = `SELECT titulo, sinopsis, stock, edicion, autores, fecha_publicacion, paginas, image, editorial, id, oferta_inicio, oferta_fin, descuento, precio FROM Books ${stringFilter != "" ? "WHERE" : ""} ${stringFilter}`
        libro = await db.query(stringQuery);
    } else{
        Object.keys(req.body).forEach(function(key, idx, arr){
            if(req.body[key] != "" && key != "categoria"){
                stringTmp = `AND ${key} ILIKE '%${req.body[key]}%' `;
                stringFilter += stringTmp;
            }
        });
        if(req.query.stockout == "false"){
            stringFilter += `AND b.stock > 0`
        }
        libro = await db.query(`SELECT b.titulo, b.sinopsis, b.stock, b.edicion, b.autores, b.fecha_publicacion, b.paginas, b.image, b.editorial, b.id, b.oferta_inicio, b.oferta_fin, b.descuento, b.precio FROM BooksTags t JOIN Books b ON t.id_book = b.id WHERE t.id_tag = $1 ${stringFilter}`, [req.body.categoria]);
    }
    const bookAll = [];
    await Promise.all(libro.rows.map(async libroInd => {
        let etiquetasAll = await addBookTags(libroInd.id);
        libroInd.etiquetas = etiquetasAll;
        bookAll.push(libroInd);
    }));
    res.status(200).json({
        status: "success",
        libros: bookAll
    });
});

exports.updateBooks = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { titulo, etiquetas, sinopsis, stock, edicion, autores, fecha_publicacion, paginas, editorial, precio } = req.body;
    if(titulo == "" || sinopsis == "" || stock <= -1 || edicion == "" || editorial == "" || autores == "" || fecha_publicacion == "" || paginas <= -1){
        return next(new ApiErrors("Todos los campos son obligatorios y los valores numericos no pueden ser negativos", 400));
    }
    await db.query(`INSERT INTO tempBooks (user_rol) VALUES ($1)`, [req.user.rol]);
    let respuesta;
    if(req.body.imageURL){
        respuesta = await db.query(`UPDATE Books SET titulo = $1, sinopsis = $2, stock = $3, edicion = $4, autores = $5, fecha_publicacion = $6, paginas = $7, image = $8, id_administrador = $9, editorial = $10, precio = $11 WHERE id = $12 RETURNING id`, [titulo, sinopsis, stock, edicion, autores, fecha_publicacion, paginas, req.body.imageURL, req.user.id, editorial, precio, id])
    } else {
        respuesta = await db.query(`UPDATE Books SET titulo = $1, sinopsis = $2, stock = $3, edicion = $4, autores = $5, fecha_publicacion = $6, paginas = $7, id_administrador = $8, editorial = $9, precio = $10 WHERE id = $11 RETURNING id`, [titulo, sinopsis, stock, edicion, autores, fecha_publicacion, paginas, req.user.id, editorial, precio, id])
    }
    await db.query(`DELETE FROM BooksTags WHERE id_book = $1`, [respuesta.rows[0].id]);
    await db.query(`DELETE FROM tempBooks`);
    let parsedEtiquetas = etiquetas.split(",");
    parsedEtiquetas.forEach(etiquetaID => {
        addBookTagRef(respuesta.rows[0].id, etiquetaID);
    });
    res.status(200).json({
        status: "success",
        message: "Libro modificado con exito"
    });
});

exports.discountBook = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { oferta_inicio, oferta_fin, descuento } = req.body;
    if(oferta_fin == "" || oferta_inicio == "" || descuento < 0 || descuento > 100){
        return next(new ApiErrors("Todos los campos son obligatorios y los valores numericos no pueden ser negativos", 400));
    }
    let respuesta = await db.query(`UPDATE Books SET oferta_inicio = $1, oferta_fin = $2, descuento = $3 WHERE id = $4`, [oferta_inicio, oferta_fin, descuento, id]);
    res.status(200).json({
        status: "success",
        message: "Oferta aplicada con exito"
    });
})

exports.deleteBooks = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const preDeleteBook = await db.query(`SELECT titulo, id FROM Books WHERE id = $1`, [id]);
    if(preDeleteBook.rowCount < 1){
        return next(new ApiErrors("El libro no existe", 400));
    }
    await db.query(`INSERT INTO tempBooks (id, nombre) VALUES ($1, $2) RETURNING id, nombre`, [req.user.id, preDeleteBook.rows[0].titulo]);
    await db.query(`DELETE FROM Books WHERE id = $1`, [id]);
    await db.query(`DELETE FROM tempBooks`);
    res.status(200).json({
        status: "success",
        message: "Libro eliminado con exito"
    })
});