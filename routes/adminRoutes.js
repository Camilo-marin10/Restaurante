import express from "express";
import {
  listarReservasAdmin,
  cambiarEstadoReserva,
} from "../controllers/adminController.js";

import { protegerRuta } from "../middleware/usuarioMiddleware.js";

const router = express.Router();

router.get("/reservas", protegerRuta, listarReservasAdmin);
router.post("/reservas/:id/estado", protegerRuta, cambiarEstadoReserva);

export default router;
