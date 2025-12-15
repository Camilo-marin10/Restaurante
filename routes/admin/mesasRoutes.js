import express from "express";
import { protegerRuta } from "../../middleware/usuarioMiddleware.js";
import {
  adminMesas,
  crearMesa,
  guardarMesa,
  editarMesa,
  guardarEdicionMesa,
  eliminarMesa,
} from "../../controllers/mesasController.js";

const router = express.Router();

router.get("/", protegerRuta, adminMesas);
router.get("/crear", protegerRuta, crearMesa);
router.post("/crear", protegerRuta, guardarMesa);

router.get("/editar/:id", protegerRuta, editarMesa);
router.post("/editar/:id", protegerRuta, guardarEdicionMesa);

router.post("/eliminar/:id", protegerRuta, eliminarMesa);

export default router;
