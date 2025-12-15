import Usuario from "../models/Usuarios.js";

const identificarUsuario = async (req, res, next) => {
  const usuarioId = req.session.usuarioId;

  if (!usuarioId) {
    res.locals.usuario = undefined;
    res.locals.csrfToken = req.csrfToken();
    return next();
  }

  try {
    const usuarioSesion = await Usuario.findByPk(usuarioId, {
      attributes: ["id", "nombre", "rol"],
    });

    if (usuarioSesion) {
      res.locals.usuario = {
        nombre: usuarioSesion.nombre,
        id: usuarioSesion.id,
        rol: usuarioSesion.rol,
      };
    } else {
      res.locals.usuario = undefined;
      req.session.destroy();
    }
    res.locals.csrfToken = req.csrfToken();

    return next();
  } catch (error) {
    console.error("Error en identificarUsuario middleware:", error);
    res.locals.usuario = undefined;
    res.locals.csrfToken = req.csrfToken();
    return next();
  }
};

const protegerRuta = (req, res, next) => {
  const usuarioId = req.session.usuarioId;

  if (!usuarioId) {
    return res.redirect("/auth/login");
  }

  return next();
};

export { identificarUsuario, protegerRuta };
