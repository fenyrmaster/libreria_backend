const express = require("express");
const auditoriaController = require("../controllers/auditoriasController");
const authController = require("../controllers/authController");

const auditoriaRouter = express.Router();

auditoriaRouter.route("/").post(authController.protect, authController.restrict("Administrador"), auditoriaController.getAuditorias);

module.exports = auditoriaRouter;