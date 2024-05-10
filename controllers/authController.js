const { promisify } = require("util");
const ApiErrors = require("../utils/appError");
const JWT = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../db");
const Email = require("../utils/email");

const points = {
    points: 7,
    duration: 5*60*1000,
    blockDuration: 5*60*1000
}

const signToken = id => {
    return JWT.sign({ id: id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    })
}

const confirmUser = async correo_electronico => {
    const token = await crypto.randomBytes(32).toString("hex");
    const confirmStringUser = crypto.createHash("sha256").update(token).digest("hex");
    const confirmStringExpirationUser = Date.now() + 30*24*60*60*1000;
    await db.query(`UPDATE Usuarios SET confirmString = $1, confirmStringExpiration = $2 WHERE correo_electronico = $3`, [confirmStringUser, confirmStringExpirationUser, correo_electronico]);
    return token;
}

const createSendToken = (user, statusCode, req, res) => {
    const token = signToken(user._id);
    res.cookie("jwt", token, {
        maxAge: process.env.JWT_COOKIE_EXPIRES_IN*24*60*60*1000,
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });
    user.password = undefined;

    res.status(statusCode).json({
        status: "success",
        token: token,
        data: {
            user
        }
    })
}

exports.signup = catchAsync(async (req,res,next) => {

    const { nombre, localidad, contrasena, contrasena_repetida, telefono, correo_electronico, domicilio } = req.body;

    if(contrasena != contrasena_repetida){
        return next(new ApiErrors("Las contraseñas no coinciden", 400));
    }

    hashedPasswd = await bcrypt.hash(contrasena, 12);

    const queryConfirm = `SELECT correo_electronico FROM Usuarios WHERE correo_electronico = $1 LIMIT 1`;
    const userExists = await db.query(queryConfirm, [correo_electronico]);
    
    if(userExists.rows.length > 0){
        return next(new ApiErrors("El correo colocado ya esta en uso", 400));
    }

    const queryCreate = `INSERT INTO Usuarios (nombre, localidad, contrasena, telefono, correo_electronico, domicilio, rol) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING nombre, localidad, telefono, correo_electronico, domicilio, rol, id, active`;
    const newUser = await db.query(queryCreate, [ nombre, localidad, hashedPasswd, telefono, correo_electronico, domicilio, "Cliente" ]);

    const token = signToken(newUser.rows[0].id);
    res.cookie("jwt", token, {
        maxAge: process.env.JWT_COOKIE_EXPIRES_IN*24*60*60*1000,
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });

    const randomString = await confirmUser(correo_electronico);
    const confirmUrl = `${process.env.URL_FRONT}/confirmarCuenta/${randomString}`
    await new Email(newUser.rows[0]).sendWelcome(confirmUrl)

    res.status(201).json({
        status: "success",
        token: token,
        message: "Confirma tu cuenta, te enviamos un correo",
        data: {
            user: {
                nombre: newUser.rows[0].nombre,
                correo_electronico: newUser.rows[0].correo_electronico,
                id: newUser.rows[0].id,
                localidad: newUser.rows[0].localidad,
                rol: newUser.rows[0].rol,
                domicilio: newUser.rows[0].domicilio,
                telefono: newUser.rows[0].telefono,
                image: newUser.rows[0].image,
                active: newUser.rows[0].active
            }
        }
    })
});

exports.confirmIdentity = catchAsync(async (req,res,next) => {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await db.query(`SELECT id, confirmStringExpiration, confirmString FROM Usuarios WHERE confirmString = $1`, [hashedToken]);
    if(user.rows.length <= 0) {
        return next(new ApiErrors("El token no es valido", 404));
    }
    if(user.rows[0].confirmStringExpiration < Date.now()){
        await db.query(`DELETE FROM Usuarios WHERE id = $1`, [user.rows[0].id]);
        return next(new ApiErrors("Has tardado mucho, crea una nueva cuenta", 410));
    }
    await db.query(`UPDATE Usuarios SET confirmString = NULL, confirmStringExpiration = NULL, confirmado = TRUE WHERE id = $1`, [user.rows[0].id]);
    res.status(200).json({
        status: "success",
        message: "Felicidades, ahora puedes usar nuestra app, cierra esta pestaña"
    })
})

exports.login = catchAsync(async (req,res,next) => {
    if(req.headers.cookie){
        if(req.headers.cookie.includes("LotOfTries=")){
        return next(new ApiErrors("Espera 10 minutos para volver a intentarlo", 400));
        }
    }
    const {correo_electronico, contrasena} = req.body;
    const user = await db.query(`SELECT nombre, contrasena, id, localidad, telefono, correo_electronico, domicilio, rol, image, active FROM Usuarios WHERE correo_electronico = $1`, [correo_electronico]);
    if(!correo_electronico || !contrasena){
        return next(new ApiErrors("La contraseña y correo son obligatorios", 400));
    }
    if(!user.rows[0]){
        return next(new ApiErrors("El usuario con el correo electronico especificado no existe", 400));
    }
    if(!user.rows[0] || !(await bcrypt.compare(contrasena, user.rows[0].contrasena))) {
        points.points = points.points - 1;

        if(points.points === 0){
            points.points = 5;
            res.cookie("LotOfTries", "error", {
                maxAge: 600000,
                secure: true,
                sameSite: "none"
            });
            return next(new ApiErrors("Demasiados intentos fallidos, debes esperar 10 minutos", 400));
        }
        return next(new ApiErrors("Contraseña incorrecta", 400));
    }
    points.points = 5;
    const token = signToken(user.rows[0].id);
    res.cookie("jwt", token, {
        maxAge: process.env.JWT_COOKIE_EXPIRES_IN*24*60*60*1000,
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });

    res.status(201).json({
        status: "success",
        token: token,
        message: "Has iniciado sesion",
        data: {
            user: {
                nombre: user.rows[0].nombre,
                correo_electronico: user.rows[0].correo_electronico,
                id: user.rows[0].id,
                localidad: user.rows[0].localidad,
                rol: user.rows[0].rol,
                domicilio: user.rows[0].domicilio,
                telefono: user.rows[0].telefono,
                image: user.rows[0].image
            }
        }
    })
});

exports.logout = (req,res) => {
    res.cookie("jwt", "logout", {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });
    res.status(200).json({status: "success"});
}

exports.protect = catchAsync(async (req,res,next) => {
    let token
    if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    } else if(req.cookies.jwt){
        token = req.cookies.jwt;
    } else if(!req.cookies.jwt){
        token = req.query.jwt;
    }
    if(!token){
        return next(new ApiErrors("Wheres the token lowalski, WHERE IS THE GODAMN TOKEN", 401))
    }
    const decoded = await promisify(JWT.verify)(token,process.env.JWT_SECRET);
    const freshUser = await db.query(`SELECT nombre, active, localidad, telefono, correo_electronico, domicilio, rol, confirmado, id FROM Usuarios WHERE id = $1`, [decoded.id]);
    if(freshUser.rows.length < 1){
        return next(new ApiErrors("El usuario no existe", 401))
    }
    if(freshUser.rows[0].confirmado === false){
        return next(new ApiErrors("Confirma tu cuenta, revisa tu correo electronico", 401));
    };
    req.user = freshUser.rows[0];
    next();
});

exports.isLoggedIn = catchAsync(async (req,res,next) => {
    if(req.cookies.jwt){
        if(req.cookies.jwt === "he ded"){
            return next();
        }
        const decoded = await promisify(JWT.verify)(req.cookies.jwt,process.env.JWT_SECRET);
        const freshUser = await User.findById(decoded.id).select("+confirmed");
        if(!freshUser){
            return next();
        }
        res.locals.user = freshUser;
        return next();
    }
    next();
});

exports.restrict = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.user.rol)){
            return next(new ApiErrors("No tienes permisos para hacer esto", 403));
        }
        next();
    }
}
exports.forgotPass = catchAsync(async(req,res,next) => {
    const user = await db.query(`SELECT id, correo_electronico, nombre FROM Usuarios WHERE correo_electronico = $1`, [req.body.correo_electronico]);
    if(user.rows.length < 1){
        return next(new ApiErrors("No hay ningun usuario con ese correo", 404));
    }
    const token = await crypto.randomBytes(32).toString("hex");
    const changePass = crypto.createHash("sha256").update(token).digest("hex");
    const passwordResetExpires = Date.now() + 10*60*1000;

    await db.query(`UPDATE Usuarios SET passwordResetToken = $1, passwordResetExpires = $2 WHERE id = $3`, [changePass, passwordResetExpires, user.rows[0].id]);

    try{
//    await sendEmail({
//        email: user.email,
//        subject: "your password reset token (valid for 10 min)",
//        message
//    });
        const resetURL = `${process.env.URL_FRONT}/recuperar/${token}`;

        await new Email(user.rows[0]).sendPasswordReset(resetURL);
        res.status(200).json({
            status: "success",
            message: "Token sent to email succesfully"
        });
    } catch(err) {
        await db.query(`UPDATE Usuarios SET passwordResetToken = NULL, passwordResetExpires = NULL WHERE id = $3`, [user.rows[0].id]);
        return next(new ApiErrors("Hubo un error al intentar enviar el correo, intenta de nuevo"), 500);
    }
});
exports.resetPass = catchAsync(async(req,res,next) => {
    //usar template strings con el process.env
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await db.query(`SELECT passwordResetToken, id FROM Usuarios WHERE passwordResetToken = $1`, [hashedToken])
    if(user.rows.length < 1){
        return next(new ApiErrors("Error! vuelva a intentar recuperar su cuenta", 400));
    }
    if(req.body.contrasena != req.body.repetir_contrasena){
        return next(new ApiErrors("Las contraseñas no coinciden", 400));
    }
    let hashedPasswd = await bcrypt.hash(req.body.contrasena, 12);
    db.query(`UPDATE Usuarios SET passwordResetToken = NULL, contrasena = $1, passwordResetExpires = NULL WHERE id = $2`, [hashedPasswd, user.rows[0].id]);
    res.status(200).json({
        status: "success",
        message: "Contraseña reestablecida con exito, inicia sesion",
    })
});

exports.updatePassword = catchAsync(async(req,res,next) => {
    if(req.body.new_contrasena != req.body.contrasena_repetida){
        return next(new ApiErrors("Las contraseñas no coinciden", 400));
    }
    const user = await db.query(`SELECT contrasena, id FROM Usuarios WHERE id = $1`, [req.params.id]);
    if(!user || !(await bcrypt.compare(req.body.contrasena, user.rows[0].contrasena))){
        return next(new ApiErrors("La contraseña actual no es correcta", 401))
    }
    let hashedPasswd = await bcrypt.hash(req.body.new_contrasena, 12);
    await db.query(`UPDATE Usuarios SET contrasena = $1 WHERE id = $2`, [hashedPasswd, req.params.id]);
    res.status(200).json({
        status: "success",
        message: "Contraseña cambiada con exito",
    })
})

exports.remindUser = catchAsync(async (req,res,next) => {
    let token
    token = req.cookies.jwt;
    if(!req.cookies.jwt){
        token = req.query.jwt;
    }
    if(!token){
        return next(new ApiErrors("Wheres the token lowalski, WHERE IS THE GODAMN TOKEN", 401))
    }
    const decoded = await promisify(JWT.verify)(token,process.env.JWT_SECRET);
    const freshUser = await db.query(`SELECT nombre, id, localidad, telefono, correo_electronico, domicilio, rol, image, active FROM Usuarios WHERE id = $1`, [decoded.id]);
    if(!freshUser){
        return next(new ApiErrors("The user belonging to this token does no longer exist.", 401))
    }
    res.status(200).json({
        status: "success",
        token: token,
        data: {
            user: {
                nombre: freshUser.rows[0].nombre,
                correo_electronico: freshUser.rows[0].correo_electronico,
                id: freshUser.rows[0].id,
                localidad: freshUser.rows[0].localidad,
                rol: freshUser.rows[0].rol,
                domicilio: freshUser.rows[0].domicilio,
                telefono: freshUser.rows[0].telefono,
                image: freshUser.rows[0].image
            }
        }    
    })
});

exports.requestEmailChange = catchAsync(async (req,res,next) => {
    const token = await crypto.randomBytes(32).toString("hex");
    const changeEmail = crypto.createHash("sha256").update(token).digest("hex");
    const respuesta = await db.query(`UPDATE Usuarios SET emailChangeString = $1 WHERE id = $2 RETURNING nombre`, [changeEmail, req.params.id]);
    const confirmUrl = `${process.env.URL_FRONT}/correoCambiado/${token}?mail=${req.body.correo_electronico}`;
    const user = {
        nombre: respuesta.rows[0].nombre,
        correo_electronico: req.body.correo_electronico 
    }
    await new Email(user).sendMailChange(confirmUrl);
    res.status(201).json({
        status: "success",
        message: "Revisa el correo electronico que pusiste"
    })
})

exports.mailChangeConfirm = catchAsync(async (req,res,next) => {
    const hashedToken = crypto.createHash("sha256").update(req.body.emailChangeString).digest("hex");
    const checkUser = await db.query(`SELECT emailChangeString, id FROM Usuarios WHERE emailChangeString = $1`, [hashedToken]);
    if(checkUser.rows.length < 1){
        return next(new ApiErrors("El usuario con la solicitud no existe", 400));
    }
    const newUserMail = await db.query(`UPDATE Usuarios SET correo_electronico = $1, emailChangeString = NULL WHERE id = $2 RETURNING nombre, localidad, telefono, correo_electronico, domicilio, rol, id, image`, [req.body.correo_electronico, checkUser.rows[0].id]);
    res.status(201).json({
        status: "success",
        message: "Correo de tu cuenta cambiado con exito",
        data: {
            user: {
                nombre: newUserMail.rows[0].nombre,
                correo_electronico: newUserMail.rows[0].correo_electronico,
                id: newUserMail.rows[0].id,
                localidad: newUserMail.rows[0].localidad,
                rol: newUserMail.rows[0].rol,
                domicilio: newUserMail.rows[0].domicilio,
                telefono: newUserMail.rows[0].telefono,
                image: newUserMail.rows[0].image
            }
        }
    })
})

exports.toggleUserActivity = catchAsync(async (req,res,next) => {
    await db.query(`UPDATE Usuarios SET active = ${req.body.active == "true" ? "FALSE" : "TRUE"} WHERE id = $1`, [req.params.id]);
    res.status(200).json({
        status: "success",
        message: `Estado de usuario cambiado a ${req.body.active == "true" ? "desactivado" : "activado" }`,
    })
})