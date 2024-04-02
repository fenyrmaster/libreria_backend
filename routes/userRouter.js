const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const userRouter = express.Router();

userRouter.route("/signup").post(authController.signup);
userRouter.route("/log-in").post(authController.login);
userRouter.route("/logout").get(authController.logout);
userRouter.route("/remind").get(authController.remindUser);
userRouter.route("/confirm/:token").get(authController.confirmIdentity);
userRouter.route("/changeData/:id").patch(authController.protect, userController.changeUserData);
userRouter.route("/changePassword/:id").patch(authController.protect, authController.updatePassword);
userRouter.route("/changeEmail/:id").patch(authController.protect, authController.requestEmailChange);
userRouter.route("/confirmChangeMail").patch(authController.mailChangeConfirm);
userRouter.route("/forgotPassword").patch(authController.forgotPass);
userRouter.route("/resetPassword/:token").patch(authController.resetPass);
userRouter.route("/changeIMG").patch(authController.protect, userController.uploadAvatarImage, userController.registrarFotos);
userRouter.route("/userAdmins").post(authController.protect, authController.restrict("Administrador"), userController.getUsers);
userRouter.route("/changeActivity/:id").post(authController.protect, authController.restrict("Administrador"), authController.toggleUserActivity);

module.exports = userRouter;