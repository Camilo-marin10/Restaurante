import express from "express";
import {
  listarReservasAdmin,
  cambiarEstadoReserva,
} from "../controllers/adminController.js";

import { identificarUsuario } from "../middleware/usuarioMiddleware.js";

const router = express.Router();

router.get("/admin/reservas", identificarUsuario, listarReservasAdmin);
router.post(
  "/admin/reservas/:id/estado",
  identificarUsuario,
  cambiarEstadoReserva
);

export default router;
