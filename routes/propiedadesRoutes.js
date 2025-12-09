// routes/propiedadesRoutes.js
import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.render("propiedades"); // tu vista Pug
});

export default router;
