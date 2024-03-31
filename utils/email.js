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

    async sendPasswordReset() {
        await this.send("recover", "Recupera tu contraseña (Valido por 10 minutos")
    }

    async sendOXXO(){
        await this.send("pedidoOXXO", "Tu pedido ha sido registrado")
    }

    async sendTarjeta(){
        await this.send("pedidoTarjeta", "Tu pedido ha sido registrado")
    }
}