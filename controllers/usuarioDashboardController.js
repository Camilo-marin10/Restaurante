import { Op, Sequelize, fn, col } from "sequelize";
import { check, validationResult } from "express-validator";
import { generarId } from "../helpers/tokens.js";
import Reserva from "../models/Reserva.js";
import Usuario from "../models/Usuarios.js";
import Mesa from "../models/Mesa.js";

const HORA_APERTURA = "10:00";
const HORA_CIERRE = "23:00";

const duraciones = [
  { valor: 1.0, texto: "1 Hora" },
  { valor: 1.5, texto: "1.5 Horas" },
  { valor: 2.0, texto: "2 Horas" },
  { valor: 2.5, texto: "2.5 Horas" },
  { valor: 3.0, texto: "3 Horas" },
];

const obtenerValoresInicialesReserva = () => {
  const today = new Date();
  const todayString = today.toISOString().split("T")[0];

  return {
    fecha_reserva: todayString,
    hora_reserva: HORA_APERTURA,
    numero_personas: 2,
    duracion_estimada: 1.0,
  };
};

const buscarMesaDisponible = async (
  fecha,
  horaInicio,
  duracion,
  personas,
  mesaId
) => {
  const duracionMinutos = duracion * 60;
  const horaInicioNuevaDate = new Date(`${fecha}T${horaInicio}:00`);
  const horaFinNuevaDate = new Date(
    horaInicioNuevaDate.getTime() + duracionMinutos * 60000
  );
  const horaFinNuevaString = horaFinNuevaDate.toTimeString().substring(0, 5);

  const mesa = await Mesa.findOne({
    where: {
      id: mesaId,
      capacidad: { [Op.gte]: personas },
      estado: "Activa",
    },
  });

  if (!mesa) {
    return null;
  }

  const reservasSolapadas = await Reserva.findOne({
    where: {
      mesaId: mesa.id,
      fecha_reserva: fecha,
      estado: { [Op.in]: ["Confirmada", "Pendiente", "En Curso"] },
      [Op.and]: [{ hora_reserva: { [Op.lt]: horaFinNuevaString } }],
    },
  });

  return reservasSolapadas ? null : mesa.id;
};

const obtenerMesasDisponibles = async (
  fecha,
  horaInicio,
  duracion,
  personas
) => {
  const duracionMinutos = duracion * 60;
  const horaInicioNuevaDate = new Date(`${fecha}T${horaInicio}:00`);
  const horaFinNuevaDate = new Date(
    horaInicioNuevaDate.getTime() + duracionMinutos * 60000
  );
  const horaFinNuevaString = horaFinNuevaDate.toTimeString().substring(0, 5);

  const mesasAdecuadas = await Mesa.findAll({
    where: {
      capacidad: { [Op.gte]: personas },
      estado: "Activa",
    },
    order: [["capacidad", "ASC"]],
    attributes: ["id", "nombre", "zona", "capacidad"],
  });

  const mesasDisponibles = [];

  for (const mesa of mesasAdecuadas) {
    const reservasSolapadas = await Reserva.findOne({
      where: {
        mesaId: mesa.id,
        fecha_reserva: fecha,
        estado: { [Op.in]: ["Confirmada", "Pendiente", "En Curso"] },
        [Op.and]: [{ hora_reserva: { [Op.lt]: horaFinNuevaString } }],
      },
    });

    if (!reservasSolapadas) {
      mesasDisponibles.push(mesa);
    }
  }
  return mesasDisponibles;
};

const actualizarEstadosReserva = async (usuarioId) => {
  const today = new Date();
  const currentTime = today.toTimeString().substring(0, 5);
  const todayString = today.toISOString().split("T")[0];

  try {
    await Reserva.update(
      {
        estado: "En Curso",
      },
      {
        where: {
          clienteId: usuarioId,
          fecha_reserva: todayString,
          estado: "Confirmada",
          hora_reserva: {
            [Op.lte]: currentTime,
          },
        },
      }
    );
  } catch (error) {
    console.error("Error al actualizar estado 'En Curso':", error);
  }

  try {
    const reservasEnCurso = await Reserva.findAll({
      where: {
        clienteId: usuarioId,
        fecha_reserva: todayString,
        estado: "En Curso",
      },
    });

    const updatesToCompleted = [];

    for (const reserva of reservasEnCurso) {
      const durationMinutes = reserva.duracion_estimada * 60;
      const startTime = new Date(`${todayString}T${reserva.hora_reserva}:00`);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      const endHour = String(endTime.getHours()).padStart(2, "0");
      const endMinute = String(endTime.getMinutes()).padStart(2, "0");
      const endTimeString = `${endHour}:${endMinute}`;

      if (currentTime >= endTimeString) {
        updatesToCompleted.push(reserva.id);
      }
    }

    if (updatesToCompleted.length > 0) {
      await Reserva.update(
        {
          estado: "Completada",
        },
        {
          where: {
            id: { [Op.in]: updatesToCompleted },
          },
        }
      );
    }
  } catch (error) {
    console.error("Error al actualizar estado 'Completada':", error);
  }
};

const dashboardUsuario = async (req, res) => {
  const usuario = res.locals.usuario;
  const usuarioId = usuario ? usuario.id : null;

  if (!usuarioId) {
    return res.redirect("/auth/login");
  }

  await actualizarEstadosReserva(usuarioId);

  const today = new Date();
  const todayString = today.toISOString().split("T")[0];

  let reservasHoyUsuario = [];
  let mesasActivas = [];

  try {
    reservasHoyUsuario = await Reserva.findAll({
      where: {
        clienteId: usuarioId,
        fecha_reserva: todayString,
        estado: {
          [Op.notIn]: ["Completada", "Cancelada", "No-Show"],
        },
      },
      include: [{ model: Mesa, as: "mesa", attributes: ["nombre"] }],
      order: [["hora_reserva", "ASC"]],
    });

    mesasActivas = await Mesa.findAll({
      where: {
        estado: "Activa",
      },
      attributes: ["nombre", "capacidad", "zona"],
      order: [["capacidad", "ASC"]],
    });
  } catch (error) {
    console.error("Error en dashboardUsuario:", error);
  }

  res.render("usuario/dashboard", {
    titulo: "Mi Panel de Reservas",
    usuario: usuario,
    reservasHoyUsuario: reservasHoyUsuario,
    mesasActivas: mesasActivas,
    csrfToken: req.csrfToken(),
  });
};

const crearReservaPublica = async (req, res) => {
  let mesasDisponibles = [];
  let datosFormulario = req.body || {};

  if (!datosFormulario.fecha_reserva) {
    datosFormulario = obtenerValoresInicialesReserva();
  }

  try {
    mesasDisponibles = await obtenerMesasDisponibles(
      datosFormulario.fecha_reserva,
      datosFormulario.hora_reserva,
      parseFloat(datosFormulario.duracion_estimada),
      parseInt(datosFormulario.numero_personas)
    );
  } catch (error) {
    console.error(
      "Error al obtener mesas disponibles en crearReservaPublica:",
      error
    );
  }

  res.render("usuario/crear-reserva", {
    titulo: "Crear Nueva Reserva",
    csrfToken: req.csrfToken(),
    datos: datosFormulario,
    duraciones,
    mesasDisponibles,
  });
};

const procesarReserva = async (req, res) => {
  if (!res.locals.usuario || !res.locals.usuario.id) {
    return res.redirect("/auth/login");
  }

  await check("fecha_reserva")
    .notEmpty()
    .withMessage("La fecha de la reserva es obligatoria.")
    .isISO8601()
    .withMessage("El formato de la fecha no es válido (Debe ser YYYY-MM-DD).")
    .run(req);
  await check("hora_reserva")
    .notEmpty()
    .withMessage("La hora de la reserva es obligatoria.")
    .run(req);
  await check("numero_personas")
    .isInt({ min: 1 })
    .withMessage(
      "El número de personas es obligatorio y debe ser un número entero."
    )
    .run(req);
  await check("duracion_estimada")
    .isFloat({ min: 0.5 })
    .withMessage("La duración de la reserva es obligatoria.")
    .run(req);
  await check("mesaId")
    .notEmpty()
    .withMessage(
      "Debes seleccionar una mesa de la lista de opciones disponibles."
    )
    .isUUID()
    .withMessage("El identificador de la mesa seleccionada no es válido.")
    .run(req);

  let errores = validationResult(req).array();
  let {
    fecha_reserva,
    hora_reserva,
    numero_personas,
    duracion_estimada,
    notas,
    mesaId,
  } = req.body;

  errores = errores.map((error) => {
    if (error.msg === "Invalid value") {
      return {
        ...error,
        msg: `Valor no válido detectado en el campo ${error.path}. Por favor, revise todos los campos.`,
      };
    }
    return error;
  });

  if (errores.length > 0) {
    let mesasDisponibles = [];
    try {
      mesasDisponibles = await obtenerMesasDisponibles(
        fecha_reserva,
        hora_reserva,
        parseFloat(duracion_estimada),
        parseInt(numero_personas)
      );
    } catch (error) {
      console.error(
        "Error al obtener mesas disponibles en error de procesarReserva:",
        error
      );
    }

    const datos = {
      fecha_reserva,
      hora_reserva,
      numero_personas,
      duracion_estimada,
      notas,
      mesaId: mesaId,
    };

    return res.render("usuario/crear-reserva", {
      titulo: "Crear Nueva Reserva",
      csrfToken: req.csrfToken(),
      errores: errores,
      datos: datos,
      duraciones,
      mesasDisponibles,
    });
  }

  const usuarioId = res.locals.usuario.id;

  const mesaIdAsignada = await buscarMesaDisponible(
    fecha_reserva,
    hora_reserva,
    parseFloat(duracion_estimada),
    parseInt(numero_personas),
    mesaId
  );

  if (!mesaIdAsignada) {
    let mesasDisponibles = [];
    try {
      mesasDisponibles = await obtenerMesasDisponibles(
        fecha_reserva,
        hora_reserva,
        parseFloat(duracion_estimada),
        parseInt(numero_personas)
      );
    } catch (error) {
      console.error(
        "Error al obtener mesas disponibles en no mesa asignada:",
        error
      );
    }

    return res.render("usuario/crear-reserva", {
      titulo: "Crear Nueva Reserva",
      csrfToken: req.csrfToken(),
      errores: [
        {
          msg: "La mesa que seleccionaste ya no está disponible (fue reservada por otro cliente o no cumple los requisitos). Por favor, elige otra opción de la lista.",
        },
      ],
      datos: req.body,
      duraciones,
      mesasDisponibles,
    });
  }

  try {
    await Reserva.create({
      codigo_reserva: generarId(),
      fecha_reserva,
      hora_reserva,
      numero_personas: parseInt(numero_personas),
      duracion_estimada: parseFloat(duracion_estimada),
      notas: notas || "",
      clienteId: usuarioId,
      mesaId: mesaIdAsignada,
      estado: "Pendiente",
    });

    return res.render("templates/mensaje", {
      titulo: "Solicitud de Reserva Enviada",
      mensaje:
        "Tu solicitud ha sido enviada con éxito. Revisa la sección 'Mis Reservas' para ver el estado. El restaurante debe confirmarla.",
      enlace: "/usuario/mis-reservas",
      btn: "Ver Mis Reservas",
    });
  } catch (error) {
    console.error("Error al guardar la reserva del usuario:", error);

    let mesasDisponibles = [];
    try {
      mesasDisponibles = await obtenerMesasDisponibles(
        fecha_reserva,
        hora_reserva,
        parseFloat(duracion_estimada),
        parseInt(numero_personas)
      );
    } catch (error) {
      console.error(
        "Error al obtener mesas disponibles en error al guardar:",
        error
      );
    }

    return res.render("usuario/crear-reserva", {
      titulo: "Crear Nueva Reserva",
      csrfToken: req.csrfToken(),
      errores: [
        { msg: "Hubo un error al procesar tu reserva. Intenta de nuevo." },
      ],
      datos: req.body,
      duraciones,
      mesasDisponibles,
    });
  }
};

const cancelarReservaUsuario = async (req, res) => {
  const usuarioId = res.locals.usuario ? res.locals.usuario.id : null;
  const { id } = req.params;

  if (!usuarioId) {
    return res.redirect("/auth/login");
  }

  try {
    const reserva = await Reserva.findByPk(id);

    if (!reserva) {
      return res.render("templates/mensaje", {
        titulo: "Error",
        mensaje: "Reserva no encontrada.",
        enlace: "/usuario/mis-reservas",
        btn: "Volver a Mis Reservas",
      });
    }

    if (String(reserva.clienteId) !== String(usuarioId)) {
      return res.render("templates/mensaje", {
        titulo: "Acceso Denegado",
        mensaje: "No tienes permiso para cancelar esta reserva.",
        enlace: "/usuario/mis-reservas",
        btn: "Volver a Mis Reservas",
      });
    }

    if (
      ["En Curso", "Completada", "Cancelada", "No-Show"].includes(
        reserva.estado
      )
    ) {
      return res.render("templates/mensaje", {
        titulo: "Cancelación Imposible",
        mensaje: `Esta reserva ya se encuentra en estado '${reserva.estado}' y no puede ser cancelada.`,
        enlace: "/usuario/mis-reservas",
        btn: "Volver a Mis Reservas",
      });
    }

    await reserva.update({ estado: "Cancelada" });

    return res.render("templates/mensaje", {
      titulo: "Reserva Eliminada",
      mensaje: "Su reserva se ha cancelado correctamente.",
      enlace: "/usuario/mis-reservas",
      btn: "Ver Mis Reservas",
    });
  } catch (error) {
    console.error("Error al cancelar la reserva:", error);
    return res.render("templates/mensaje", {
      titulo: "Error",
      mensaje: "Hubo un error al procesar la cancelación. Inténtalo de nuevo.",
      enlace: "/usuario/mis-reservas",
      btn: "Volver a Mis Reservas",
    });
  }
};

const misReservas = async (req, res) => {
  if (!res.locals.usuario) {
    return res.redirect("/auth/login");
  }

  const usuarioId = res.locals.usuario.id;
  let reservas = [];

  try {
    reservas = await Reserva.findAll({
      where: { clienteId: usuarioId },
      include: [{ model: Mesa, as: "mesa" }],
      order: [
        ["fecha_reserva", "DESC"],
        ["hora_reserva", "DESC"],
      ],
    });
  } catch (error) {
    console.error("Error al obtener reservas:", error);
  }

  res.render("usuario/mis-reservas", {
    titulo: "Mis Reservas Actuales",
    reservas: reservas,
    csrfToken: req.csrfToken(),
  });
};

export {
  dashboardUsuario,
  crearReservaPublica,
  procesarReserva,
  misReservas,
  cancelarReservaUsuario,
};
