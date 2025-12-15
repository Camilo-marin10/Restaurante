import { check, validationResult } from "express-validator";
import Usuario from "../models/Usuarios.js";

const adminClientes = async (req, res) => {
  const clientes = await Usuario.findAll({
    where: {
      rol: "cliente",
    },
    attributes: ["id", "nombre", "email", "rol"],
    order: [["nombre", "ASC"]],
  });

  res.render("admin/clientes/index", {
    titulo: "Gestión de Clientes Registrados",
    clientes,
    csrfToken: req.csrfToken(),
  });
};

const editarCliente = async (req, res) => {
  const { id } = req.params;

  const cliente = await Usuario.findByPk(id);

  if (!cliente) {
    return res.redirect("/admin/clientes");
  }

  res.render("admin/clientes/editar", {
    titulo: `Editar Usuario: ${cliente.nombre}`,
    csrfToken: req.csrfToken(),
    datos: cliente,
  });
};

const guardarEdicionCliente = async (req, res) => {
  const { id } = req.params;
  let cliente = await Usuario.findByPk(id);

  if (!cliente) {
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
  await check("rol")
    .isIn(["cliente", "admin"])
    .withMessage("El Rol seleccionado no es válido.")
    .run(req);

  let resultado = validationResult(req);

  if (!resultado.isEmpty()) {
    return res.render("admin/clientes/editar", {
      titulo: `Editar Usuario: ${cliente.nombre}`,
      csrfToken: req.csrfToken(),
      errores: resultado.array(),
      datos: req.body,
    });
  }

  try {
    const { nombre, email, rol } = req.body;

    cliente.nombre = nombre;
    cliente.email = email;
    cliente.rol = rol;

    await cliente.save();
    res.redirect("/admin/clientes");
  } catch (error) {
    console.log(error);
    let erroresDB = [
      {
        msg: "Hubo un error al actualizar el usuario. Verifique si el correo es único.",
      },
    ];
    res.render("admin/clientes/editar", {
      titulo: `Editar Usuario: ${cliente.nombre}`,
      csrfToken: req.csrfToken(),
      errores: erroresDB,
      datos: req.body,
    });
  }
};

const eliminarCliente = async (req, res) => {
  const { id } = req.params;
  const cliente = await Usuario.findByPk(id);

  if (!cliente) {
    return res.redirect("/admin/clientes");
  }

  try {
    await cliente.destroy();
    res.redirect("/admin/clientes");
  } catch (error) {
    console.log(error);

    const clientesActuales = await Usuario.findAll({
      where: { rol: "cliente" },
      attributes: ["id", "nombre", "email", "rol"],
    });

    res.render("admin/clientes/index", {
      titulo: "Gestión de Clientes Registrados",
      clientes: clientesActuales,
      csrfToken: req.csrfToken(),
      errores: [
        {
          msg: "No se puede eliminar el usuario. Puede tener reservas u otras relaciones asociadas.",
        },
      ],
    });
  }
};

export { adminClientes, editarCliente, guardarEdicionCliente, eliminarCliente };
