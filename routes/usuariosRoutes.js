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

export default router;
