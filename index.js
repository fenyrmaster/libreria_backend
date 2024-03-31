const app = require("./app");
const dotenv = require("dotenv");
const runMigrations = require("./migrations");

dotenv.config({ path: __dirname + './config.env' });

const port = process.env.PORT || 4000;
const server = app.listen(port, () => {});

runMigrations();

process.on("unhandledRejection", err => {
    console.log(err)
    server.close(() => {
    process.exit(1);
    });
});

process.on("SIGTERM", () => {
    server.close(() => {
    })
})