import Usuario from "../models/Usuarios.js";
import { check, validationResult } from "express-validator";
import { generarId } from "../helpers/tokens.js";
import { emailRegistro, emailOlvidePassword } from "../helpers/emails.js";
import bcrypt from "bcryptjs";

const login = (req, res) => {
  res.render("auth/login", {
    titulo: "Inicia Sesión",
    csrfToken: req.csrfToken(),
    email: req.body.email || "",
    autenticacion: true,
  });
};

const autenticar = async (req, res) => {
  await check("email")
    .isEmail()
    .withMessage("El correo es obligatorio y debe ser válido")
    .run(req);
  await check("password")
    .notEmpty()
    .withMessage("La contraseña no puede estar vacía")
    .run(req);

  const errores = validationResult(req);
  const { email, password } = req.body;

  if (!errores.isEmpty()) {
    return res.render("auth/login", {
      titulo: "Inicia Sesión",
      csrfToken: req.csrfToken(),
      errores: errores.array(),
      email,
      autenticacion: true,
    });
  }

  const usuario = await Usuario.findOne({ where: { email } });

  if (!usuario) {
    return res.render("auth/login", {
      titulo: "Inicia Sesión",
      csrfToken: req.csrfToken(),
      errores: [{ msg: "El Usuario o la Contraseña son incorrectos" }],
      email,
      autenticacion: true,
    });
  }

  if (!usuario.confirmado) {
    return res.render("auth/login", {
      titulo: "Inicia Sesión",
      csrfToken: req.csrfToken(),
      errores: [{ msg: "Tu cuenta no ha sido confirmada. Revisa tu email." }],
      email,
      autenticacion: true,
    });
  }

  if (!usuario.verificarPassword(password)) {
    return res.render("auth/login", {
      titulo: "Inicia Sesión",
      csrfToken: req.csrfToken(),
      errores: [{ msg: "El Usuario o la Contraseña son incorrectos" }],
      email,
      autenticacion: true,
    });
  }

  req.session.usuarioId = usuario.id;

  if (usuario.rol === "admin") {
    return res.redirect("/");
  } else {
    return res.redirect("/usuario/dashboard");
  }
};
const cerrarSesion = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
};

const register = (req, res) => {
  res.render("auth/register", {
    titulo: "Crea tu Cuenta",
    csrfToken: req.csrfToken(),
    usuario: {},
    autenticacion: true,
  });
};

const olvidePassword = (req, res) => {
  res.render("auth/olvide-password", {
    titulo: "Recupera tu Acceso",
    csrfToken: req.csrfToken(),
    email: "",
    autenticacion: true,
  });
};

const registrar = async (req, res) => {
  await check("nombre")
    .notEmpty()
    .withMessage("El nombre es obligatorio")
    .run(req);
  await check("email").isEmail().withMessage("Email no válido").run(req);
  await check("password")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe ser de al menos 6 caracteres")
    .run(req);
  await check("repetir_password")
    .equals(req.body.password)
    .withMessage("Las contraseñas no son iguales")
    .run(req);

  let errores = validationResult(req);

  if (!errores.isEmpty()) {
    return res.render("auth/register", {
      titulo: "Crea tu Cuenta",
      csrfToken: req.csrfToken(),
      errores: errores.array(),
      usuario: { nombre: req.body.nombre, email: req.body.email },
      autenticacion: true,
    });
  }

  const { nombre, email, password } = req.body;

  const existeUsuario = await Usuario.findOne({ where: { email } });
  if (existeUsuario) {
    return res.render("auth/register", {
      titulo: "Crea tu Cuenta",
      csrfToken: req.csrfToken(),
      errores: [{ msg: "El email ya está registrado" }],
      usuario: { nombre: nombre, email: email },
      autenticacion: true,
    });
  }

  try {
    const usuario = await Usuario.create({
      nombre,
      email,
      password,
      token: generarId(),
      confirmado: false,
    });

    emailRegistro({
      nombre: usuario.nombre,
      email: usuario.email,
      token: usuario.token,
    });

    res.render("templates/mensaje", {
      titulo: "Cuenta Creada Correctamente",
      mensaje:
        "Hemos enviado un Email de Confirmación a tu correo. Por favor, revísalo para activarla.",
      enlace: "/auth/login",
      btn: "Ir a Iniciar Sesión",
      autenticacion: true,
    });
  } catch (error) {
    console.error("Error al guardar el usuario en la DB:", error);
    return res.render("auth/register", {
      titulo: "Crea tu Cuenta",
      csrfToken: req.csrfToken(),
      errores: [
        {
          msg: "Hubo un error interno al crear el usuario. Por favor, inténtalo de nuevo.",
        },
      ],
      usuario: { nombre: nombre, email: email },
      autenticacion: true,
    });
  }
};

const confirmar = async (req, res) => {
  const { token } = req.params;
  const usuario = await Usuario.findOne({ where: { token } });

  if (!usuario) {
    return res.render("auth/confirmar-cuenta", {
      titulo: "Error al Confirmar Cuenta",
      mensaje: "El token no es válido o ya ha expirado.",
      error: true,
      enlace: "/auth/registro",
      btn: "Crear otra cuenta",
      autenticacion: true,
    });
  }

  usuario.confirmado = true;
  usuario.token = null;
  await usuario.save();

  res.render("auth/confirmar-cuenta", {
    titulo: "Cuenta Confirmada",
    mensaje:
      "Tu cuenta ha sido confirmada correctamente. Ya puedes iniciar sesión.",
    error: false, // Éxito
    enlace: "/auth/login",
    btn: "Iniciar Sesión",
    autenticacion: true,
  });
};

const solicitarResetPassword = async (req, res) => {
  await check("email")
    .isEmail()
    .withMessage("Debes proporcionar un email válido")
    .run(req);
  let errores = validationResult(req);

  if (!errores.isEmpty()) {
    return res.render("auth/olvide-password", {
      titulo: "Recupera tu Acceso",
      csrfToken: req.csrfToken(),
      errores: errores.array(),
      email: req.body.email,
      autenticacion: true,
    });
  }

  const usuario = await Usuario.findOne({ where: { email: req.body.email } });

  if (!usuario) {
    return res.render("auth/olvide-password", {
      titulo: "Recupera tu Acceso",
      csrfToken: req.csrfToken(),
      errores: [{ msg: "El email no pertenece a ningún usuario registrado" }],
      email: req.body.email,
      autenticacion: true,
    });
  }
  usuario.token = generarId();
  await usuario.save();

  emailOlvidePassword({
    email: usuario.email,
    nombre: usuario.nombre,
    token: usuario.token,
  });

  res.render("templates/mensaje", {
    titulo: "Restablece tu Contraseña",
    mensaje:
      "Hemos enviado un email con las instrucciones para restablecer tu contraseña.",
    enlace: "/auth/login",
    btn: "Ir a Iniciar Sesión",
    autenticacion: true,
  });
};

const comprobarToken = async (req, res) => {
  const { token } = req.params;
  const usuario = await Usuario.findOne({ where: { token } });

  if (!usuario) {
    return res.render("auth/confirmar-cuenta", {
      titulo: "Restablece tu Contraseña",
      mensaje: "El token no es válido o ya ha expirado.",
      error: true,
      enlace: "/auth/olvide-password",
      btn: "Reintentar",
      autenticacion: true,
    });
  }

  res.render("auth/reset-password", {
    titulo: "Establece tu Nueva Contraseña",
    csrfToken: req.csrfToken(),
    token: token,
    autenticacion: true,
  });
};

const nuevoPassword = async (req, res) => {
  await check("password")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe ser de al menos 6 caracteres")
    .run(req);
  let errores = validationResult(req);
  const { token } = req.params;
  const { password } = req.body;

  if (!errores.isEmpty()) {
    return res.render("auth/reset-password", {
      titulo: "Establece tu Nueva Contraseña",
      csrfToken: req.csrfToken(),
      errores: errores.array(),
      token: token,
      autenticacion: true,
    });
  }

  const usuario = await Usuario.findOne({ where: { token } });
  const salt = await bcrypt.genSalt(10);
  usuario.password = await bcrypt.hash(password, salt);
  usuario.token = null;

  await usuario.save();

  res.render("templates/mensaje", {
    titulo: "Contraseña Restablecida",
    mensaje: "Tu contraseña ha sido modificada correctamente.",
    enlace: "/auth/login",
    btn: "Ir a Iniciar Sesión",
    autenticacion: true,
  });
};

export {
  login,
  autenticar,
  cerrarSesion,
  register,
  registrar,
  confirmar,
  olvidePassword,
  solicitarResetPassword,
  comprobarToken,
  nuevoPassword,
};
