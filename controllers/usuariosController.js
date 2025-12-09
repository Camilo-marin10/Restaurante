import Usuario from "../models/Usuarios.js";
import bcrypt from "bcryptjs";
import { check, validationResult } from "express-validator";

const login = (req, res) => {
  res.render("auth/login", {
    titulo: "Inicia sesión",
    csrfToken: req.csrfToken(),
  });
};

const register = (req, res) => {
  res.render("auth/register", {
    titulo: "Regístrate",
    csrfToken: req.csrfToken(),
  });
};

const autenticar = async (req, res) => {
  await check("email")
    .isEmail()
    .withMessage("El correo es obligatorio")
    .run(req);

  await check("password")
    .notEmpty()
    .withMessage("La contraseña no puede estar vacía")
    .run(req);

  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    return res.render("auth/login", {
      titulo: "Inicia sesión",
      csrfToken: req.csrfToken(),
      errores: errores.array(),
    });
  }

  res.send("Usuario autenticado correctamente");
};

export { register, login, autenticar };
