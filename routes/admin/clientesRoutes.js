import express from "express";
import {
  adminClientes,
  editarCliente,
  guardarEdicionCliente,
  eliminarCliente,
} from "../../controllers/clientesController.js";

const router = express.Router();

router.get("/", adminClientes);

router.get("/editar/:id", editarCliente);
router.post("/editar/:id", guardarEdicionCliente);

router.post("/eliminar/:id", eliminarCliente);

export default router;
