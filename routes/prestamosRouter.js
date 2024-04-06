const express = require("express");
const prestamosController = require("../controllers/prestamosController");
const authController = require("../controllers/authController");

const booksRouter = express.Router();

booksRouter
    .route("/")
    .post(authController.protect, authController.restrict("Cliente"), prestamosController.createPrestamo);

//booksRouter.route("/get-all").post(bookController.getBooks);//

//booksRouter
//    .route("/:id")
//    .patch(authController.protect, authController.restrict("Administrador"), bookController.uploadBookImage, bookController.registrarFotosUpdate, bookController.updateBooks)
//    .delete(authController.protect, authController.restrict("Administrador"), bookController.deleteBooks);

module.exports = booksRouter;