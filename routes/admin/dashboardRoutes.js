import express from "express";
import { adminDashboard } from "../../controllers/dashboardController.js";
import { identificarUsuario } from "../../middleware/usuarioMiddleware.js";

const router = express.Router();

router.get("/", identificarUsuario, adminDashboard);
router.get("/dashboard", identificarUsuario, adminDashboard);

export default router;
