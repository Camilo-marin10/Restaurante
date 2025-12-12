import express from "express";
import { adminDashboard } from "../../controllers/dashboardController.js";

const router = express.Router();
router.get("/", adminDashboard);

export default router;
