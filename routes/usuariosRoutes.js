// routes/usuariosRoutes.js (Completo y Corregido)

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
  confirmar,
  cerrarSesion, // 👈 Se asegura de que se importa correctamente
} from "../controllers/usuariosController.js";

const router = express.Router();

// Login
router.get("/login", login);
router.post("/login", autenticar);

// Registro
router.get("/registro", register);
router.post("/registro", registrar);

// Confirmación de Cuenta
router.get("/confirmar/:token", confirmar);

// Olvide Password
router.get("/olvide-password", olvidePassword);
router.post("/olvide-password", solicitarResetPassword);
router.get("/olvide-password/:token", comprobarToken);
router.post("/olvide-password/:token", nuevoPassword);

// 🛑 CIERRE DE SESIÓN (SOLUCIÓN)
router.post("/logout", cerrarSesion); // 👈 Esta línea estaba faltando

export default router;
