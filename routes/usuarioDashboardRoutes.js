import express from "express";
import { identificarUsuario } from "../middleware/usuarioMiddleware.js";

import {
  dashboardUsuario,
  crearReservaPublica,
  procesarReserva,
  misReservas,
  cancelarReservaUsuario,
} from "../controllers/usuarioDashboardController.js";

const router = express.Router();

router.get("/dashboard", identificarUsuario, dashboardUsuario);

router.get("/reserva/crear", identificarUsuario, crearReservaPublica);
router.post("/reserva/crear", identificarUsuario, procesarReserva);

router.get("/mis-reservas", identificarUsuario, misReservas);

router.post(
  "/reserva/cancelar/:id",
  identificarUsuario,
  cancelarReservaUsuario
);

export default router;
