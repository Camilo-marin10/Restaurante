import express from "express";
import {
  identificarUsuario,
  protegerRuta,
} from "../middleware/usuarioMiddleware.js";

import {
  dashboardUsuario,
  crearReservaPublica,
  procesarReserva,
  misReservas,
  cancelarReservaUsuario,
} from "../controllers/usuarioDashboardController.js";

const router = express.Router();

router.get("/dashboard", protegerRuta, dashboardUsuario);

router.get("/reserva/crear", protegerRuta, crearReservaPublica);
router.post("/reserva/crear", protegerRuta, procesarReserva);

router.get("/mis-reservas", protegerRuta, misReservas);

router.post("/reserva/cancelar/:id", protegerRuta, cancelarReservaUsuario);

export default router;
