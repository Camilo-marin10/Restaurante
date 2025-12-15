import express from "express";
import {
  mostrarHorarios,
  actualizarHorarios,
} from "../../controllers/horarioController.js";

const router = express.Router();

router.route("/").get(mostrarHorarios).post(actualizarHorarios);

export default router;
