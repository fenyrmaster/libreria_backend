const express = require("express");
const prestamosController = require("../controllers/prestamosController");
const authController = require("../controllers/authController");

const prestamosRouter = express.Router();

prestamosRouter
    .route("/")
    .post(authController.protect, authController.restrict("Cliente"), prestamosController.createPrestamo);

prestamosRouter.route("/get-all").post(authController.protect, authController.restrict("Administrador"), prestamosController.getPrestamos);
prestamosRouter.route("/get-all-user").post(authController.protect, authController.restrict("Cliente"), prestamosController.getPrestamos);
prestamosRouter.route("/cancelar-pedido-user/:id").patch(authController.protect, prestamosController.cancelPrestamoOwner);
prestamosRouter.route("/cancelar-pedido-admin/:id").patch(authController.protect, authController.restrict("Administrador"), prestamosController.cancelPrestamoAdmin);
prestamosRouter.route("/pedido-recogido/:id").patch(authController.protect, authController.restrict("Administrador"), prestamosController.libroRecogidoPrestamo);
prestamosRouter.route("/pedido-devuelto/:id").patch(authController.protect, authController.restrict("Administrador"), prestamosController.libroDevuelto);
prestamosRouter.route("/pedido-no-devuelto/:id").patch(authController.protect, authController.restrict("Administrador"), prestamosController.libroNoDevuelto);
prestamosRouter.route("/:id").delete(authController.protect, authController.restrict("Administrador"), prestamosController.eliminarPrestamo);

//booksRouter
//    .route("/:id")
//    .patch(authController.protect, authController.restrict("Administrador"), bookController.uploadBookImage, bookController.registrarFotosUpdate, bookController.updateBooks)
//    .delete(authController.protect, authController.restrict("Administrador"), bookController.deleteBooks);

module.exports = prestamosRouter;