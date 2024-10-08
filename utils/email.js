const nodemailer = require("nodemailer");
const pug = require("pug");
const htmlToText = require("html-to-text");

module.exports = class Email {
    constructor(user) {
        this.to = user.correo_electronico;
        this.firstName = user.nombre.split(" ")[0];
        this.from = process.env.EMAIL_FROM
    }
    newTransport() {
        if(process.env.NODE_ENV === "production"){
            return nodemailer.createTransport({
                service: "SendGrid",
                auth: {
                    user: process.env.SENDGRID_USERNAME,
                    pass: process.env.SENDGRID_PASSWORD
                }
            })
        }
        else {
            return nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                auth: {
                    user: process.env.EMAIL_USERNAME,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
        }
    }
    async send(template, subject, confirm) {

        const html = pug.renderFile(`${__dirname}/../emails/${template}.pug`, {
            firstName: this.firstName,
            subject,
            confirm
        })

        const mailOptions = {
            from: this.from,
            to: this.to,
            subject: subject,
            html,
            text: htmlToText.fromString(html)
        }

        await this.newTransport().sendMail(mailOptions);
    }

    async sendWelcome(confirm) {
        this.send("welcome", "Bienvenido a nuestra libreria", confirm);
    }

    async sendMailChange(confirm){
        this.send("mailChange", "Cambia tu correo electronico", confirm);
    }

    async sendPasswordReset(confirm) {
        await this.send("recover", "Recupera tu contraseña (Valido por 10 minutos)", confirm)
    }

    async sendOXXO(){
        await this.send("pedidoOXXO", "Tu pedido ha sido registrado")
    }

    async sendReservaConfirmed(bookName){
        await this.send("reservaConfirmed", "Has reservado un libro", bookName);
    }
    
    async sendCanceladoUserPrestamo(bookName){
        await this.send("prestamoCancelado", "Has cancelado el prestamo de un libro", bookName);
    }

    async sendCanceladoAdminPrestamo(bookName){
        await this.send("prestamoCanceladoAdmin", "Se cancelo un prestamo de un libro", bookName);
    }

    async sendRecogidoPrestamo(bookName){
        await this.send("prestamoRecogido", "Has recogido un libro", bookName);
    }

    async sendNoDevueltoPrestamo(bookName){
        await this.send("prestamoNoDevuelto", "No devolviste un libro", bookName);
    }
    
    async sendDevueltoPrestamo(bookName){
        await this.send("prestamoDevuelto", "Has devuelto un libro", bookName);
    }

    async sendTarjeta(){
        await this.send("pedidoTarjeta", "Tu pedido ha sido registrado")
    }

    async sendCompraCanceladoAdmin(bookName){
        await this.send("compraCanceladoAdmin", "Se cancelo una compra sin completar", bookName);
    }
    async sendCompraCompletadoAdmin(bookName){
        await this.send("compraCompletadoAdmin", "Se completo una compra", bookName);
    }

    async sendCanceladoUserCompra(bookName){
        await this.send("compraCanceladoUser", "Has cancelado una compra", bookName);
    }
}