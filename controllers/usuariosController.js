import Usuario from "../models/Usuarios.js";
import { check, validationResult } from "express-validator";
import { generarId } from "../helpers/tokens.js";
import { emailRegistro, emailOlvidePassword } from "../helpers/emails.js";
import bcrypt from "bcryptjs";

// ==========================================================
//                      VISTAS GET
// ==========================================================

const login = (req, res) => {
  res.render("auth/login", {
    titulo: "Inicia Sesión",
    csrfToken: req.csrfToken(),
    email: req.body.email || "",
    autenticacion: true, // 🚨 Oculta el header-app
  });
};

const register = (req, res) => {
  res.render("auth/register", {
    titulo: "Crea tu Cuenta",
    csrfToken: req.csrfToken(),
    usuario: {},
    autenticacion: true, // 🚨 Oculta el header-app
  });
};

const olvidePassword = (req, res) => {
  res.render("auth/olvide-password", {
    titulo: "Recupera tu Acceso",
    csrfToken: req.csrfToken(),
    email: "",
    autenticacion: true, // 🚨 Oculta el header-app
  });
};

// ==========================================================
//                 AUTENTICACIÓN Y REGISTRO POST
// ==========================================================

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

  // 1. Mostrar Errores de validación
  if (!errores.isEmpty()) {
    return res.render("auth/login", {
      titulo: "Inicia Sesión",
      csrfToken: req.csrfToken(),
      errores: errores.array(),
      email,
      autenticacion: true,
    });
  }

  // 2. Comprobar si el usuario existe
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

  // 3. Comprobar si el usuario está confirmado
  if (!usuario.confirmado) {
    return res.render("auth/login", {
      titulo: "Inicia Sesión",
      csrfToken: req.csrfToken(),
      errores: [{ msg: "Tu cuenta no ha sido confirmada. Revisa tu email." }],
      email,
      autenticacion: true,
    });
  }

  // 4. Verificar password
  if (!usuario.verificarPassword(password)) {
    return res.render("auth/login", {
      titulo: "Inicia Sesión",
      csrfToken: req.csrfToken(),
      errores: [{ msg: "El Usuario o la Contraseña son incorrectos" }],
      email,
      autenticacion: true,
    });
  }

  // 5. Autenticar el usuario (PENDIENTE: Generar JWT/Sesión)
  // Por ahora, solo redirigimos:
  res.redirect("/");
};

const registrar = async (req, res) => {
  // 1. Validaciones
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

  // 2. Manejo de Errores de validación
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

  // 3. Verificar si el usuario ya existe
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

  // 4. Almacenar el usuario
  try {
    const usuario = await Usuario.create({
      nombre,
      email,
      password,
      token: generarId(),
      confirmado: false,
    });

    // 5. Enviar email de confirmación
    emailRegistro({
      nombre: usuario.nombre,
      email: usuario.email,
      token: usuario.token,
    });

    // 6. Mostrar mensaje de éxito
    res.render("templates/mensaje", {
      titulo: "Cuenta Creada Correctamente",
      mensaje:
        "Hemos enviado un Email de Confirmación a tu correo. Por favor, revísalo para activarla.",
      enlace: "/auth/login",
      btn: "Ir a Iniciar Sesión",
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

// ==========================================================
//                 CONFIRMACIÓN DE CUENTA (SOLUCIÓN AL ERROR)
// ==========================================================

const confirmar = async (req, res) => {
  const { token } = req.params;

  // 1. Verificar si el token es válido
  const usuario = await Usuario.findOne({ where: { token } });

  // 2. Si el token no es válido o ya fue usado (usuario = null)
  if (!usuario) {
    return res.render("auth/confirmar-cuenta", {
      titulo: "Error al Confirmar Cuenta",
      mensaje: "El token no es válido o ya ha expirado.",
      error: true,
      enlace: "/auth/registro",
      btn: "Crear otra cuenta",
    });
  }

  // 3. Si el token es válido:

  // 4. Cambiar el estado del usuario
  usuario.confirmado = true;
  usuario.token = null; // 🚨 ANULAR el token para prevenir el doble uso y el error de recarga
  await usuario.save();

  // 5. Mostrar mensaje de éxito
  res.render("auth/confirmar-cuenta", {
    titulo: "Cuenta Confirmada",
    mensaje:
      "Tu cuenta ha sido confirmada correctamente. Ya puedes iniciar sesión.",
    error: false, // Éxito
    enlace: "/auth/login",
    btn: "Iniciar Sesión",
  });
};

// ==========================================================
//                 RECUPERACIÓN DE CONTRASEÑA
// ==========================================================

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

  // Generar un token y enviar email
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
    });
  }

  res.render("auth/reset-password", {
    titulo: "Establece tu Nueva Contraseña",
    csrfToken: req.csrfToken(),
    token: token,
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
    });
  }

  const usuario = await Usuario.findOne({ where: { token } });

  // Hashear el nuevo password y guardar
  const salt = await bcrypt.genSalt(10);
  usuario.password = await bcrypt.hash(password, salt);
  usuario.token = null;

  await usuario.save();

  res.render("templates/mensaje", {
    titulo: "Contraseña Restablecida",
    mensaje: "Tu contraseña ha sido modificada correctamente.",
    enlace: "/auth/login",
    btn: "Ir a Iniciar Sesión",
  });
};

export {
  login,
  autenticar,
  register,
  registrar,
  confirmar,
  olvidePassword,
  solicitarResetPassword,
  comprobarToken,
  nuevoPassword,
};
