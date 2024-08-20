const express = require("express");
const bookController = require("../controllers/bookController");
const authController = require("../controllers/authController");

const booksRouter = express.Router();

booksRouter
    .route("/")
    .post(authController.protect, authController.restrict("Administrador"), bookController.uploadBookImage, bookController.registrarFotos, bookController.insertBook);

booksRouter.route("/get-all").post(bookController.getBooks);

booksRouter
    .route("/:id")
    .patch(authController.protect, authController.restrict("Administrador"), bookController.uploadBookImage, bookController.registrarFotosUpdate, bookController.updateBooks)
    .delete(authController.protect, authController.restrict("Administrador"), bookController.deleteBooks);

booksRouter.route("/modificarDescuento/:id").patch(authController.protect, authController.restrict("Administrador"), bookController.discountBook);

module.exports = booksRouter;