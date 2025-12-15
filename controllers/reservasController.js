import { Op } from "sequelize";
import { check, validationResult } from "express-validator";
import Mesa from "../models/Mesa.js";
import Usuario from "../models/Usuarios.js";
import Reserva from "../models/Reserva.js";
import HorarioAtencion from "../models/HorarioAtencion.js";

const generarCodigo = () => {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "";
  const longitud = 8;

  for (let i = 0; i < longitud; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
};

const obtenerDatosFormulario = async () => {
  const [mesas, usuarios] = await Promise.all([
    Mesa.findAll({ where: { estado: "Activa" } }),
    Usuario.findAll({
      where: {
        rol: "cliente",
      },
      order: [["nombre", "ASC"]],
    }),
  ]);

  const duraciones = [
    { valor: 1.0, texto: "1 Hora" },
    { valor: 1.5, texto: "1.5 Horas" },
    { valor: 2.0, texto: "2 Horas" },
    { valor: 2.5, texto: "2.5 Horas" },
    { valor: 3.0, texto: "3 Horas" },
  ];

  return { mesas, clientes: usuarios, duraciones };
};

const validarReserva = async (req, isUpdate = false) => {
  await check("clienteId")
    .notEmpty()
    .withMessage("El cliente es obligatorio")
    .run(req);
  await check("mesaId")
    .notEmpty()
    .withMessage("La mesa es obligatoria")
    .run(req);
  await check("fecha_reserva")
    .notEmpty()
    .withMessage("La fecha es obligatoria")
    .isISO8601()
    .withMessage("Formato de fecha no válido (AAAA-MM-DD)")
    .run(req);
  await check("hora_reserva")
    .notEmpty()
    .withMessage("La hora es obligatoria")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Formato de hora no válido (HH:MM)")
    .run(req);
  await check("numero_personas")
    .isInt({ min: 1 })
    .withMessage("El número de personas debe ser al menos 1")
    .run(req);
  await check("duracion_estimada")
    .isFloat({ min: 0.5 })
    .withMessage("La duración debe ser válida")
    .run(req);

  let resultado = validationResult(req);
  let erroresPersonalizados = [];
  const {
    fecha_reserva,
    hora_reserva,
    numero_personas,
    mesaId,
    duracion_estimada,
    clienteId,
  } = req.body;

  let fechaEstandarizada = fecha_reserva;

  if (fecha_reserva && fecha_reserva.includes("/")) {
    const partes = fecha_reserva.split("/");
    if (partes.length === 3) {
      fechaEstandarizada = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
  }

  let apertura = null;
  let cierre = null;

  try {
    const fecha = new Date(fechaEstandarizada + "T00:00:00");
    const diaSemana = fecha.getDay();

    if (isNaN(fecha.getTime())) {
      erroresPersonalizados.push({
        msg: "La fecha proporcionada no es válida. Use el formato AAAA-MM-DD.",
      });
    } else {
      const horarioDia = await HorarioAtencion.findOne({
        where: { dia_semana: diaSemana },
        raw: true,
      });

      if (
        !horarioDia ||
        horarioDia.activo === 0 ||
        !horarioDia.hora_apertura ||
        !horarioDia.hora_cierre
      ) {
        erroresPersonalizados.push({
          msg: "El restaurante está cerrado o no tiene horarios definidos para la fecha seleccionada.",
        });
      } else {
        apertura = horarioDia.hora_apertura.substring(0, 5);
        cierre = horarioDia.hora_cierre.substring(0, 5);
      }
    }
  } catch (error) {
    console.error("Error al obtener horario dinámico:", error);
    erroresPersonalizados.push({
      msg: "Error al verificar los horarios de atención.",
    });
  }

  if (!resultado.isEmpty() || erroresPersonalizados.length > 0) {
    erroresPersonalizados = [...resultado.array(), ...erroresPersonalizados];
    return { errores: erroresPersonalizados, datos: req.body };
  }

  const fechaActual = new Date().toISOString().split("T")[0];
  const horaActual = new Date().toTimeString().split(" ")[0].substring(0, 5);

  if (
    new Date(fechaEstandarizada + "T00:00:00") <
    new Date(fechaActual + "T00:00:00")
  ) {
    erroresPersonalizados.push({
      msg: "La fecha de la reserva no puede ser anterior al día de hoy.",
    });
  } else if (
    !isUpdate &&
    fechaEstandarizada === fechaActual &&
    hora_reserva < horaActual
  ) {
    erroresPersonalizados.push({
      msg: "La hora de la reserva para el día de hoy no puede ser en el pasado.",
    });
  }

  const duracionMinutos = duracion_estimada * 60;
  const horaInicioNuevaReserva = new Date(
    `${fechaEstandarizada}T${hora_reserva}:00`
  );
  const horaFinNuevaReserva = new Date(
    horaInicioNuevaReserva.getTime() + duracionMinutos * 60000
  );
  const horaFinNuevaReservaString = horaFinNuevaReserva
    .toTimeString()
    .split(" ")[0]
    .substring(0, 5);

  if (hora_reserva < apertura) {
    erroresPersonalizados.push({
      msg: `La reserva debe ser a partir de la hora de apertura (${apertura}).`,
    });
  }
  if (horaFinNuevaReservaString > cierre) {
    erroresPersonalizados.push({
      msg: `La reserva terminaría a las ${horaFinNuevaReservaString}. El restaurante cierra a las ${cierre}.`,
    });
  }

  if (!resultado.isEmpty() || erroresPersonalizados.length > 0) {
    return { errores: erroresPersonalizados, datos: req.body };
  }

  const mesa = await Mesa.findByPk(mesaId);
  if (!mesa) {
    erroresPersonalizados.push({ msg: "La mesa seleccionada no es válida." });
  } else if (parseInt(numero_personas) > mesa.capacidad) {
    erroresPersonalizados.push({
      msg: `El número de personas (${numero_personas}) excede la capacidad de la mesa ${mesa.nombre} (${mesa.capacidad}).`,
    });
  }

  const reservasExistentes = await Reserva.findAll({
    where: {
      mesaId,
      fecha_reserva: fechaEstandarizada,
      ...(isUpdate && req.params.id ? { id: { [Op.ne]: req.params.id } } : {}),
      estado: { [Op.in]: ["Confirmada", "Pendiente", "En Curso"] },
    },
  });

  const reservasSolapadas = reservasExistentes.filter((reservaExistente) => {
    const duracionExistenteMinutos = reservaExistente.duracion_estimada * 60;
    const horaInicioExistente = new Date(
      `${reservaExistente.fecha_reserva}T${reservaExistente.hora_reserva}`
    );
    const horaFinExistente = new Date(
      horaInicioExistente.getTime() + duracionExistenteMinutos * 60000
    );

    const solapamiento =
      horaInicioNuevaReserva < horaFinExistente &&
      horaFinNuevaReserva > horaInicioExistente;

    return solapamiento;
  });

  if (reservasSolapadas.length > 0) {
    const duracionSolapadaMinutos = reservasSolapadas[0].duracion_estimada * 60;
    const horaInicioSolapada = new Date(
      `${reservasSolapadas[0].fecha_reserva}T${reservasSolapadas[0].hora_reserva}`
    );
    const horaFinSolapada = new Date(
      horaInicioSolapada.getTime() + duracionSolapadaMinutos * 60000
    );
    const horaFinSolapadaString = horaFinSolapada
      .toTimeString()
      .split(" ")[0]
      .substring(0, 5);

    const errorMsg = `La mesa ${mesa.nombre} ya está reservada de ${reservasSolapadas[0].hora_reserva} hasta aproximadamente las ${horaFinSolapadaString}. La nueva reserva se solapa.`;
    erroresPersonalizados.push({ msg: errorMsg });
  }

  const reservaDuplicada = await Reserva.findOne({
    where: {
      clienteId,
      fecha_reserva: fechaEstandarizada,
      hora_reserva,
      ...(isUpdate && req.params.id ? { id: { [Op.ne]: req.params.id } } : {}),
    },
  });

  if (reservaDuplicada) {
    erroresPersonalizados.push({
      msg: "Este cliente ya tiene una reserva para la misma fecha y hora.",
    });
  }

  if (erroresPersonalizados.length > 0) {
    return { errores: erroresPersonalizados, datos: req.body };
  }

  req.body.fecha_reserva = fechaEstandarizada;

  return { errores: erroresPersonalizados, datos: req.body, mesa };
};

const adminReservas = async (req, res) => {
  const reservas = await Reserva.findAll({
    where: {
      estado: {
        [Op.in]: ["Pendiente", "Confirmada", "En Curso"],
      },
    },
    include: [
      { model: Usuario, as: "cliente" },
      { model: Mesa, as: "mesa" },
    ],
    order: [
      ["fecha_reserva", "ASC"],
      ["hora_reserva", "ASC"],
    ],
  });

  res.render("admin/reservas/index", {
    titulo: "Panel de Reservas",
    reservas,
    csrfToken: req.csrfToken(),
  });
};

const crearReserva = async (req, res) => {
  const { mesas, clientes, duraciones } = await obtenerDatosFormulario();

  res.render("admin/reservas/crear", {
    titulo: "Crear Nueva Reserva",
    csrfToken: req.csrfToken(),
    mesas,
    clientes,
    duraciones,
    datos: {},
  });
};

const guardarReserva = async (req, res) => {
  const { errores, datos } = await validarReserva(req, false);
  const { mesas, clientes, duraciones } = await obtenerDatosFormulario();

  if (errores.length > 0) {
    return res.render("admin/reservas/crear", {
      titulo: "Crear Nueva Reserva",
      csrfToken: req.csrfToken(),
      mesas,
      clientes,
      duraciones,
      errores,
      datos,
    });
  }

  const {
    fecha_reserva,
    hora_reserva,
    numero_personas,
    duracion_estimada,
    notas,
    clienteId,
    mesaId,
  } = datos;
  const codigo_reserva = generarCodigo();

  try {
    await Reserva.create({
      codigo_reserva,
      fecha_reserva,
      hora_reserva,
      numero_personas,
      duracion_estimada,
      notas: notas || "",
      clienteId: clienteId,
      mesaId: mesaId,
      estado: "Confirmada",
    });

    res.redirect("/admin/reservas");
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      console.error(
        "Error de validación de Sequelize al crear reserva:",
        error.errors
      );

      const erroresSequelize = error.errors.map((err) => ({
        msg: `Error en ${err.path}: ${err.message}`,
      }));

      return res.render("admin/reservas/crear", {
        titulo: "Crear Nueva Reserva",
        csrfToken: req.csrfToken(),
        mesas,
        clientes,
        duraciones,
        errores: erroresSequelize,
        datos,
      });
    }

    console.error(error);
    res.render("admin/reservas/crear", {
      titulo: "Crear Nueva Reserva",
      csrfToken: req.csrfToken(),
      mesas,
      clientes,
      duraciones,
      errores: [
        { msg: "Hubo un error al guardar la reserva en la base de datos." },
      ],
      datos,
    });
  }
};

const editarReserva = async (req, res) => {
  const { id } = req.params;

  const reserva = await Reserva.findByPk(id, {
    include: [
      { model: Usuario, as: "cliente" },
      { model: Mesa, as: "mesa" },
    ],
  });

  if (!reserva) {
    return res.redirect("/admin/reservas");
  }

  const { mesas, clientes, duraciones } = await obtenerDatosFormulario();

  res.render("admin/reservas/editar", {
    titulo: `Editar Reserva: ${reserva.codigo_reserva}`,
    csrfToken: req.csrfToken(),
    mesas,
    clientes,
    duraciones,
    datos: reserva,
  });
};

const guardarEdicionReserva = async (req, res) => {
  const { id } = req.params;

  let reserva = await Reserva.findByPk(id);
  if (!reserva) {
    return res.redirect("/admin/reservas");
  }

  const { errores, datos } = await validarReserva(req, true);
  const { mesas, clientes, duraciones } = await obtenerDatosFormulario();

  if (errores.length > 0) {
    if (reserva.clienteId) {
      datos.cliente = await Usuario.findByPk(reserva.clienteId);
    } else {
      datos.cliente = null;
    }

    return res.render("admin/reservas/editar", {
      titulo: `Editar Reserva: ${reserva.codigo_reserva}`,
      csrfToken: req.csrfToken(),
      mesas,
      clientes,
      duraciones,
      errores,
      datos,
    });
  }

  const {
    fecha_reserva,
    hora_reserva,
    numero_personas,
    duracion_estimada,
    notas,
    mesaId,
    estado,
  } = datos;

  try {
    reserva.set({
      fecha_reserva,
      hora_reserva,
      numero_personas,
      duracion_estimada,
      notas: notas || "",
      mesaId: mesaId,
      estado,
    });

    await reserva.save();

    res.redirect("/admin/reservas");
  } catch (error) {
    console.error(error);
    res.render("admin/reservas/editar", {
      titulo: `Editar Reserva: ${reserva.codigo_reserva}`,
      csrfToken: req.csrfToken(),
      mesas,
      clientes,
      duraciones,
      errores: [
        { msg: "Hubo un error al actualizar la reserva en la base de datos." },
      ],
      datos,
    });
  }
};

const cambiarEstadoReserva = async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado } = req.body;

  const reserva = await Reserva.findByPk(id);
  if (!reserva) {
    return res.redirect("/admin/reservas");
  }

  try {
    reserva.estado = nuevoEstado;
    await reserva.save();
    res.redirect("/admin/reservas");
  } catch (error) {
    console.log(error);
    res.redirect("/admin/reservas");
  }
};

const eliminarReserva = async (req, res) => {
  const { id } = req.params;

  const reserva = await Reserva.findByPk(id);
  if (!reserva) {
    return res.redirect("/admin/reservas");
  }

  try {
    await reserva.destroy();
    res.redirect("/admin/reservas");
  } catch (error) {
    console.log(error);
    res.redirect("/admin/reservas");
  }
};

export {
  adminReservas,
  crearReserva,
  guardarReserva,
  editarReserva,
  guardarEdicionReserva,
  cambiarEstadoReserva,
  eliminarReserva,
};
