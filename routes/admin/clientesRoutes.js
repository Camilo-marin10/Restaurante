import express from "express";
import {
  adminClientes,
  crearCliente,
  guardarCliente,
  editarCliente,
  guardarEdicionCliente,
  eliminarCliente,
} from "../../controllers/clientesController.js";

const router = express.Router();

router.get("/", adminClientes);

router.get("/crear", crearCliente);
router.post("/crear", guardarCliente);

router.get("/editar/:id", editarCliente);
router.post("/editar/:id", guardarEdicionCliente);

router.post("/eliminar/:id", eliminarCliente);

export default router;
