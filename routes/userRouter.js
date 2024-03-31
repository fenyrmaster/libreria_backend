const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const userRouter = express.Router();

userRouter.route("/signup").post(authController.signup);
userRouter.route("/log-in").post(authController.login);
userRouter.route("/logout").get(authController.logout);
userRouter.route("/remind").get(authController.remindUser);
userRouter.route("/confirm/:token").get(authController.confirmIdentity);
userRouter.route("/changeData/:id").post(authController.protect, userController.changeUserData);
userRouter.route("/changePassword/:id").post(authController.protect, authController.updatePassword);

module.exports = userRouter;