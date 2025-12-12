import { check, validationResult } from "express-validator";
import Cliente from "../models/Cliente.js";

const adminClientes = async (req, res) => {
  const clientes = await Cliente.findAll();

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

const editarCliente = async (req, res) => {
  const { id } = req.params;
  const cliente = await Cliente.findByPk(id);

  if (!cliente) {
    return res.redirect("/admin/clientes");
  }

  res.render("admin/clientes/editar", {
    titulo: `Editar Cliente: ${cliente.nombre} ${cliente.apellido}`,
    csrfToken: req.csrfToken(),
    datos: cliente,
  });
};

const guardarCliente = async (req, res) => {
  await check("nombre")
    .notEmpty()
    .withMessage("El Nombre del Cliente es Obligatorio")
    .run(req);
  await check("apellido")
    .notEmpty()
    .withMessage("El Apellido del Cliente es Obligatorio")
    .run(req);
  await check("email")
    .isEmail()
    .withMessage("El Correo Electrónico no es Válido")
    .optional({ checkFalsy: true })
    .run(req);
  await check("telefono")
    .notEmpty()
    .withMessage("El Teléfono es Obligatorio")
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

  //Crear Cliente
  const { nombre, apellido, email, telefono, notas } = req.body;
  try {
    await Cliente.create({ nombre, apellido, email, telefono, notas });
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

const guardarEdicionCliente = async (req, res) => {
  const { id } = req.params;
  let cliente = await Cliente.findByPk(id);

  if (!cliente) {
    return res.redirect("/admin/clientes");
  }
  await check("nombre")
    .notEmpty()
    .withMessage("El Nombre es Obligatorio")
    .run(req);
  await check("apellido")
    .notEmpty()
    .withMessage("El Apellido es Obligatorio")
    .run(req);
  await check("email")
    .isEmail()
    .withMessage("El Correo Electrónico no es Válido")
    .optional({ checkFalsy: true })
    .run(req);
  await check("telefono")
    .notEmpty()
    .withMessage("El Teléfono es Obligatorio")
    .run(req);

  let resultado = validationResult(req);

  if (!resultado.isEmpty()) {
    return res.render("admin/clientes/editar", {
      titulo: `Editar Cliente: ${cliente.nombre} ${cliente.apellido}`,
      csrfToken: req.csrfToken(),
      errores: resultado.array(),
      datos: req.body,
    });
  }

  //Actualizar Cliente
  try {
    const { nombre, apellido, email, telefono, notas } = req.body;

    cliente.nombre = nombre;
    cliente.apellido = apellido;
    cliente.email = email;
    cliente.telefono = telefono;
    cliente.notas = notas;

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
      titulo: `Editar Cliente: ${cliente.nombre} ${cliente.apellido}`,
      csrfToken: req.csrfToken(),
      errores: erroresDB,
      datos: req.body,
    });
  }
};

const eliminarCliente = async (req, res) => {
  const { id } = req.params;
  const cliente = await Cliente.findByPk(id);

  if (!cliente) {
    return res.redirect("/admin/clientes");
  }

  try {
    await cliente.destroy();
    res.redirect("/admin/clientes");
  } catch (error) {
    console.log(error);
    res.render("admin/clientes/index", {
      titulo: "Gestión de Clientes",
      clientes: await Cliente.findAll(),
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
