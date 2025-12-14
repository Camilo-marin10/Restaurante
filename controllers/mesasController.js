import Mesa from "../models/Mesa.js";
import { check, validationResult } from "express-validator";

const zonasDisponibles = ["Interior", "Terraza", "VIP", "Barra", "Otro"];

const adminMesas = async (req, res) => {
  const mesas = await Mesa.findAll();

  res.render("admin/mesas/index", {
    titulo: "Gestión de Mesas",
    mesas: mesas,
    csrfToken: req.csrfToken(),
  });
};

const crearMesa = (req, res) => {
  res.render("admin/mesas/crear", {
    titulo: "Crear Nueva Mesa",
    csrfToken: req.csrfToken(),
    zonas: zonasDisponibles,
    datos: {},
  });
};

const guardarMesa = async (req, res) => {
  await check("nombre")
    .notEmpty()
    .withMessage("El nombre es obligatorio")
    .run(req);
  await check("capacidad")
    .isInt({ min: 1 })
    .withMessage("Capacidad inválida")
    .run(req);

  let resultado = validationResult(req);
  if (!resultado.isEmpty()) {
    return res.render("admin/mesas/crear", {
      titulo: "Crear Nueva Mesa",
      csrfToken: req.csrfToken(),
      errores: resultado.array(),
      zonas: zonasDisponibles,
      datos: req.body,
    });
  }

  try {
    await Mesa.create(req.body);
    res.redirect("/admin/mesas");
  } catch (error) {
    console.log(error);
  }
};

const editarMesa = async (req, res) => {
  const { id } = req.params;
  const mesa = await Mesa.findByPk(id);

  if (!mesa) {
    return res.redirect("/admin/mesas");
  }

  res.render("admin/mesas/editar", {
    titulo: `Editar Mesa: ${mesa.nombre}`,
    csrfToken: req.csrfToken(),
    zonas: zonasDisponibles,
    datos: mesa,
  });
};

const guardarEdicionMesa = async (req, res) => {
  const { id } = req.params;
  await check("nombre")
    .notEmpty()
    .withMessage("El nombre es obligatorio")
    .run(req);
  await check("capacidad")
    .isInt({ min: 1 })
    .withMessage("Capacidad inválida")
    .run(req);

  let resultado = validationResult(req);

  const mesa = await Mesa.findByPk(id);
  if (!mesa) {
    return res.redirect("/admin/mesas");
  }

  if (!resultado.isEmpty()) {
    return res.render("admin/mesas/editar", {
      titulo: `Editar Mesa: ${mesa.nombre}`,
      csrfToken: req.csrfToken(),
      errores: resultado.array(),
      zonas: zonasDisponibles,
      datos: req.body,
    });
  }

  try {
    const { nombre, capacidad, zona } = req.body;
    mesa.set({
      nombre,
      capacidad,
      zona,
    });
    await mesa.save();

    res.redirect("/admin/mesas");
  } catch (error) {
    console.log(error);
    res.render("admin/mesas/editar", {
      titulo: `Editar Mesa: ${mesa.nombre}`,
      csrfToken: req.csrfToken(),
      errores: [{ msg: "Error al actualizar la mesa." }],
      zonas: zonasDisponibles,
      datos: req.body,
    });
  }
};

const eliminarMesa = async (req, res) => {
  const { id } = req.params;
  const mesa = await Mesa.findByPk(id);
  if (!mesa) {
    return res.redirect("/admin/mesas");
  }

  try {
    await mesa.destroy();
    res.redirect("/admin/mesas");
  } catch (error) {
    console.log(error);

    res.redirect("/admin/mesas");
  }
};

export {
  adminMesas,
  crearMesa,
  guardarMesa,
  editarMesa,
  guardarEdicionMesa,
  eliminarMesa,
};
