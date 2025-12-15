import express from "express";
import { protegerRuta } from "../../middleware/usuarioMiddleware.js";
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

router.get("/", protegerRuta, adminReservas);

router.get("/crear", protegerRuta, crearReserva);
router.post("/crear", protegerRuta, guardarReserva);

router.get("/editar/:id", protegerRuta, editarReserva);
router.post("/editar/:id", protegerRuta, guardarEdicionReserva);

router.post("/estado/:id", protegerRuta, cambiarEstadoReserva);

router.post("/eliminar/:id", protegerRuta, eliminarReserva);

export default router;
