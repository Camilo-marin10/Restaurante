import express from "express";
import {
  adminMesas,
  crearMesa,
  guardarMesa,
  editarMesa,
  guardarEdicionMesa,
  eliminarMesa,
} from "../../controllers/mesasController.js";

const router = express.Router();
router.get("/", adminMesas);
router.get("/crear", crearMesa);
router.post("/crear", guardarMesa);

router.get("/editar/:id", editarMesa);
router.post("/editar/:id", guardarEdicionMesa);

router.post("/eliminar/:id", eliminarMesa);

export default router;
