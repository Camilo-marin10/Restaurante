import express from "express";
import {
  login,
  register,
  autenticar,
} from "../controllers/usuariosController.js";

const router = express.Router();

// Login
router.get("/login", login);
router.post("/login", autenticar);

// Registro
router.get("/registro", register);
// router.post("/registro", registrar);

export default router;
