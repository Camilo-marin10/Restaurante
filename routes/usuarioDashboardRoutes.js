// routes/usuarioDashboardRoutes.js

import express from "express";
// Asegúrate de que misReservas se importe del controlador
import {
  dashboardUsuario,
  crearReservaPublica,
  procesarReserva,
  misReservas, // 👈 Esta función estaba faltando en la ruta
} from "../controllers/usuarioDashboardController.js";

const router = express.Router();

// Panel Principal del Cliente
router.get("/dashboard", dashboardUsuario);

// RUTAS DE RESERVA
// 1. Formulario GET para crear reserva
router.get("/reserva/crear", crearReservaPublica);
// 2. Procesar POST de la reserva
router.post("/reserva/crear", procesarReserva);

// NUEVA RUTA: Listado de Reservas del Cliente
router.get("/mis-reservas", misReservas);

export default router;
