import express from "express";
import csurf from "csurf";
import cookieParser from "cookie-parser";
import session from "express-session";
import usuarioRoutes from "./routes/usuariosRoutes.js";
import dashboardRoutes from "./routes/admin/dashboardRoutes.js";
import mesasRoutes from "./routes/admin/mesasRoutes.js";
import clientesRoutes from "./routes/admin/clientesRoutes.js";
import reservasRoutes from "./routes/admin/reservasRoutes.js";
import horariosRoutes from "./routes/admin/horariosRoutes.js";
import usuarioDashboardRoutes from "./routes/usuarioDashboardRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { identificarUsuario } from "./middleware/usuarioMiddleware.js";

import HorarioAtencion from "./models/HorarioAtencion.js";

import db from "./config/db.js";

const app = express();

try {
  await db.authenticate();
  await db.sync({ alter: true });
  console.log("Conexion correcta a la base de datos");
} catch (error) {
  console.error("No se pudo conectar a la base de datos:", error);
}

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "Cmz23102005_!!",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(csurf({ cookie: true }));

app.use(identificarUsuario);

app.set("view engine", "pug");
app.set("views", "./views");

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect("/auth/login");
});

app.use("/auth", usuarioRoutes);

app.use("/usuario", usuarioDashboardRoutes);

app.use("/admin", dashboardRoutes);
app.use("/admin/mesas", mesasRoutes);
app.use("/admin/clientes", clientesRoutes);
app.use("/admin/reservas", reservasRoutes);

app.use("/admin/horarios", horariosRoutes);

app.use("/", adminRoutes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("El servidor está funcionando en el puerto " + port);
});
