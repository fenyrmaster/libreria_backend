const express = require("express");
const etiquetasController = require("../controllers/etiquetasController")
const authController = require("../controllers/authController");

const etiquetasRouter = express.Router();

etiquetasRouter
    .route("/")
    .get(etiquetasController.getEtiquetas)
    .post(authController.protect, authController.restrict("Administrador"), etiquetasController.insertEtiquetas);

etiquetasRouter
    .route("/:id")
    .patch(authController.protect, authController.restrict("Administrador"), etiquetasController.updateEtiquetas)
    .delete(authController.protect, authController.restrict("Administrador"), etiquetasController.deleteEtiquetas);

module.exports = etiquetasRouter;