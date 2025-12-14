import { check, validationResult } from "express-validator";
import Usuario from "../models/Usuarios.js";

const adminClientes = async (req, res) => {
  const clientes = await Usuario.findAll({
    where: {
      rol: "usuario",
    },
    attributes: ["id", "nombre", "email"],
    order: [["nombre", "ASC"]],
  });

  res.render("admin/clientes/index", {
    titulo: "Gestión de Clientes",
    clientes,
    csrfToken: req.csrfToken(),
  });
};

const crearCliente = (req, res) => {
  res.render("admin/clientes/crear", {
    titulo: "Registrar Nuevo Cliente",
    csrfToken: req.csrfToken(),
    datos: {},
  });
};

const guardarCliente = async (req, res) => {
  await check("nombre")
    .notEmpty()
    .withMessage("El Nombre del Cliente es Obligatorio")
    .run(req);
  await check("email")
    .isEmail()
    .withMessage("El Correo Electrónico no es Válido")
    .optional({ checkFalsy: true })
    .run(req);
  let resultado = validationResult(req);

  if (!resultado.isEmpty()) {
    return res.render("admin/clientes/crear", {
      titulo: "Registrar Nuevo Cliente",
      csrfToken: req.csrfToken(),
      errores: resultado.array(),
      datos: req.body,
    });
  }

  const { nombre, email } = req.body;
  try {
    await Usuario.create({
      nombre,
      email,
      rol: "usuario",
    });
    res.redirect("/admin/clientes");
  } catch (error) {
    console.log(error);
    let erroresDB = [];
    if (error.name === "SequelizeUniqueConstraintError") {
      erroresDB.push({ msg: "El correo electrónico ya está registrado." });
    } else {
      erroresDB.push({ msg: "Hubo un error al guardar el cliente." });
    }
    res.render("admin/clientes/crear", {
      titulo: "Registrar Nuevo Cliente",
      csrfToken: req.csrfToken(),
      errores: erroresDB,
      datos: req.body,
    });
  }
};

const editarCliente = async (req, res) => {
  const { id } = req.params;
  const cliente = await Usuario.findByPk(id);

  if (!cliente || cliente.rol !== "usuario") {
    return res.redirect("/admin/clientes");
  }

  res.render("admin/clientes/editar", {
    titulo: `Editar Cliente: ${cliente.nombre}`,
    csrfToken: req.csrfToken(),
    datos: cliente,
  });
};

const guardarEdicionCliente = async (req, res) => {
  const { id } = req.params;
  let cliente = await Usuario.findByPk(id);

  if (!cliente || cliente.rol !== "usuario") {
    return res.redirect("/admin/clientes");
  }

  await check("nombre")
    .notEmpty()
    .withMessage("El Nombre es Obligatorio")
    .run(req);
  await check("email")
    .isEmail()
    .withMessage("El Correo Electrónico no es Válido")
    .optional({ checkFalsy: true })
    .run(req);

  let resultado = validationResult(req);

  if (!resultado.isEmpty()) {
    return res.render("admin/clientes/editar", {
      titulo: `Editar Cliente: ${cliente.nombre}`,
      csrfToken: req.csrfToken(),
      errores: resultado.array(),
      datos: req.body,
    });
  }

  try {
    const { nombre, email } = req.body;

    cliente.nombre = nombre;
    cliente.email = email;
    await cliente.save();
    res.redirect("/admin/clientes");
  } catch (error) {
    console.log(error);
    let erroresDB = [
      {
        msg: "Hubo un error al actualizar el cliente. Verifique el correo si es único.",
      },
    ];
    res.render("admin/clientes/editar", {
      titulo: `Editar Cliente: ${cliente.nombre}`,
      csrfToken: req.csrfToken(),
      errores: erroresDB,
      datos: req.body,
    });
  }
};

const eliminarCliente = async (req, res) => {
  const { id } = req.params;
  const cliente = await Usuario.findByPk(id);

  if (!cliente || cliente.rol !== "usuario") {
    return res.redirect("/admin/clientes");
  }

  try {
    await cliente.destroy();
    res.redirect("/admin/clientes");
  } catch (error) {
    console.log(error);
    const clientesActuales = await Usuario.findAll({
      where: { rol: "usuario" },
      attributes: ["id", "nombre", "email"],
    });

    res.render("admin/clientes/index", {
      titulo: "Gestión de Clientes",
      clientes: clientesActuales,
      csrfToken: req.csrfToken(),
      errores: [
        { msg: "No se puede eliminar el cliente. Tiene reservas asociadas." },
      ],
    });
  }
};

export {
  adminClientes,
  crearCliente,
  guardarCliente,
  editarCliente,
  guardarEdicionCliente,
  eliminarCliente,
};
