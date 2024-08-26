const express = require("express");
const comprasController = require("../controllers/comprasController");
const authController = require("../controllers/authController");

const comprasRouter = express.Router();

//comprasRouter
//    .route("/")
//    .post(authController.protect, authController.restrict("Cliente"), prestamosController.createPrestamo);

comprasRouter.route("/get-all").post(authController.protect, authController.restrict("Administrador"), comprasController.getCompras);
comprasRouter.route("/get-all-user").post(authController.protect, authController.restrict("Cliente"), comprasController.getCompras);
comprasRouter.route("/cancelar-compra-user/:id").patch(authController.protect, comprasController.cancelCompraOwner);
comprasRouter.route("/cancelar-compra-admin/:id").patch(authController.protect, authController.restrict("Administrador"), comprasController.cancelCompraAdmin);
comprasRouter.route("/pedido-comprado-recogido/:id").patch(authController.protect, authController.restrict("Administrador"), comprasController.libroCompradoRecogido);
//comprasRouter.route("/pedido-no-devuelto/:id").patch(authController.protect, authController.restrict("Administrador"), prestamosController.libroNoDevuelto);
//comprasRouter.route("/:id").delete(authController.protect, authController.restrict("Administrador"), prestamosController.eliminarPrestamo);

//booksRouter
//    .route("/:id")
//    .patch(authController.protect, authController.restrict("Administrador"), bookController.uploadBookImage, bookController.registrarFotosUpdate, bookController.updateBooks)
//    .delete(authController.protect, authController.restrict("Administrador"), bookController.deleteBooks);

module.exports = comprasRouter;