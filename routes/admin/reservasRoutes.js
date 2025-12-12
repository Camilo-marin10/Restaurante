import express from "express";
import {
  adminReservas,
  crearReserva,
  guardarReserva,
  editarReserva,
  guardarEdicionReserva,
  cambiarEstadoReserva,
  eliminarReserva,
} from "../../controllers/reservasController.js";

const router = express.Router();

router.get("/", adminReservas);

// Crear
router.get("/crear", crearReserva);
router.post("/crear", guardarReserva);

// Editar
router.get("/editar/:id", editarReserva);
router.post("/editar/:id", guardarEdicionReserva);

router.post("/estado/:id", cambiarEstadoReserva);

// Eliminar
router.post("/eliminar/:id", eliminarReserva);

export default router;
