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
  cerrarSesion,
} from "../controllers/usuariosController.js";

const router = express.Router();

router.get("/login", login);
router.post("/login", autenticar);

router.get("/registro", register);
router.post("/registro", registrar);

router.get("/confirmar/:token", confirmar);

router.get("/olvide-password", olvidePassword);
router.post("/olvide-password", solicitarResetPassword);
router.get("/olvide-password/:token", comprobarToken);
router.post("/olvide-password/:token", nuevoPassword);

router.post("/logout", cerrarSesion);

export default router;
