import express from "express";
import {
  login,
  register,
  autenticar,
  registrar,
  olvidePassword,
  solicitarResetPassword,
  comprobarToken,
  nuevoPassword,
  confirmar, // <<-- 1. IMPORTAR FUNCIÓN
} from "../controllers/usuariosController.js";

const router = express.Router();

// Login
router.get("/login", login);
router.post("/login", autenticar);

// Registro
router.get("/registro", register);
router.post("/registro", registrar);

// Confirmación de Cuenta
router.get("/confirmar/:token", confirmar); // <<-- 2. AÑADIR RUTA GET

// Olvide Password
router.get("/olvide-password", olvidePassword);
router.post("/olvide-password", solicitarResetPassword);
router.get("/olvide-password/:token", comprobarToken); // Verifica el token de recuperación
router.post("/olvide-password/:token", nuevoPassword); // Guarda el nuevo password

export default router;
