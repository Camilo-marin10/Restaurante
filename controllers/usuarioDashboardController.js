// controllers/usuarioDashboardController.js

import { Op } from "sequelize";
import { check, validationResult } from "express-validator";

// 🚨 CRÍTICO: Importamos 'generarId' ya que es la función que exporta tu helper.
import { generarId } from "../helpers/tokens.js";

// 🚨 Asegúrate de que estas rutas de importación de modelos sean correctas
import Reserva from "../models/Reserva.js";
import Usuario from "../models/Usuarios.js"; // Asumimos que esta es la FK en tu modelo Reserva
import Mesa from "../models/Mesa.js";

// Configuración Fija de Horario de Atención
const HORA_APERTURA = "10:00";
const HORA_CIERRE = "23:00";

// Opciones de Duración para la vista
const duraciones = [
  { valor: 1.0, texto: "1 Hora" },
  { valor: 1.5, texto: "1.5 Horas" },
  { valor: 2.0, texto: "2 Horas" },
  { valor: 2.5, texto: "2.5 Horas" },
  { valor: 3.0, texto: "3 Horas" },
];

// ----------------------------------------------------------------------
// Función Auxiliar CRÍTICA: Busca y asigna una mesa
// ----------------------------------------------------------------------
const buscarMesaDisponible = async (fecha, horaInicio, duracion, personas) => {
  const duracionMinutos = duracion * 60;
  const horaInicioNueva = new Date(`${fecha}T${horaInicio}:00`);
  const horaFinNueva = new Date(
    horaInicioNueva.getTime() + duracionMinutos * 60000
  );
  const horaFinNuevaString = horaFinNueva.toTimeString().substring(0, 5);

  // 1. Encontrar mesas que tienen capacidad suficiente, ordenadas por la más pequeña primero
  const mesasAdecuadas = await Mesa.findAll({
    where: {
      capacidad: { [Op.gte]: personas },
      estado: true, // Solo mesas activas
    },
    order: [["capacidad", "ASC"]],
  });

  for (const mesa of mesasAdecuadas) {
    // 2. Verificar solapamiento de horario para ESTA mesa
    const reservasSolapadas = await Reserva.findOne({
      where: {
        mesaId: mesa.id,
        fecha_reserva: fecha,
        estado: { [Op.in]: ["Confirmada", "Pendiente", "En Curso"] },
        [Op.and]: [
          {
            hora_reserva: {
              // Si la hora de inicio de una reserva existente es antes del fin de la nueva
              [Op.lt]: horaFinNuevaString,
            },
          },
        ],
      },
    });

    // Si no se encontró ninguna reserva solapada, esta mesa está disponible.
    if (!reservasSolapadas) {
      return mesa.id;
    }
  }
  return null; // No se encontró ninguna mesa disponible
};

// ----------------------------------------------------------------------
// Vistas
// ----------------------------------------------------------------------

// Función que renderiza la vista principal para el usuario logueado
const dashboardUsuario = (req, res) => {
  res.render("usuario/dashboard", {
    titulo: "Mi Panel de Reservas",
  });
};

// Función para mostrar el formulario de reserva pública (GET request)
const crearReservaPublica = (req, res) => {
  res.render("usuario/crear-reserva", {
    titulo: "Crear Nueva Reserva",
    csrfToken: req.csrfToken(),
    datos: req.body || {},
    duraciones, // Pasamos las opciones de duración a la vista PUG
  });
};

// ----------------------------------------------------------------------
// CRÍTICA: Procesar y Guardar Reserva
// ----------------------------------------------------------------------
const procesarReserva = async (req, res) => {
  // 🚨 1. VALIDACIÓN: Aseguramos que la duración se valida
  await check("fecha_reserva")
    .notEmpty()
    .withMessage("La fecha es obligatoria")
    .isISO8601()
    .run(req);
  await check("hora_reserva")
    .notEmpty()
    .withMessage("La hora es obligatoria")
    .run(req);
  await check("numero_personas")
    .isInt({ min: 1 })
    .withMessage("Número de personas es obligatorio")
    .run(req);
  await check("duracion_estimada")
    .isFloat({ min: 0.5 })
    .withMessage("La duración es obligatoria")
    .run(req);

  const errores = validationResult(req);
  const {
    fecha_reserva,
    hora_reserva,
    numero_personas,
    duracion_estimada,
    notas,
  } = req.body;

  // Si la validación falla, renderiza el formulario con errores
  if (!errores.isEmpty()) {
    return res.render("usuario/crear-reserva", {
      titulo: "Crear Nueva Reserva",
      csrfToken: req.csrfToken(),
      errores: errores.array(),
      datos: req.body,
      duraciones, // Pasamos las duraciones si hay error para rellenar el select
    });
  }

  // 🛑 2. OBTENER ID DEL USUARIO LOGUEADO
  // Se asume que el middleware 'identificarUsuario' adjuntó el objeto usuario a res.locals
  const usuarioId = res.locals.usuario.id;

  // 🛑 3. ASIGNACIÓN DE MESA
  const mesaIdAsignada = await buscarMesaDisponible(
    fecha_reserva,
    hora_reserva,
    parseFloat(duracion_estimada),
    parseInt(numero_personas)
  );

  if (!mesaIdAsignada) {
    return res.render("usuario/crear-reserva", {
      titulo: "Crear Nueva Reserva",
      csrfToken: req.csrfToken(),
      errores: [
        {
          msg: "Lo sentimos, no hay mesas disponibles para ese horario y número de personas. Intenta con un horario o número de personas diferente.",
        },
      ],
      datos: req.body,
      duraciones,
    });
  }

  // 🛑 4. GUARDAR EN BASE DE DATOS
  try {
    await Reserva.create({
      codigo_reserva: generarId(), // Usa tu UUID
      fecha_reserva,
      hora_reserva,
      numero_personas: parseInt(numero_personas),
      duracion_estimada: parseFloat(duracion_estimada),
      notas: notas || "",
      usuarioId: usuarioId, // Asigna el ID del usuario logueado
      mesaId: mesaIdAsignada,
      estado: "Pendiente", // La solicitud del cliente es Pendiente por defecto
    });

    // 5. Éxito
    return res.render("templates/mensaje", {
      titulo: "Solicitud de Reserva Enviada",
      mensaje:
        "Tu solicitud ha sido enviada con éxito. Revisa la sección 'Mis Reservas' para ver el estado. El restaurante debe confirmarla.",
      enlace: "/usuario/mis-reservas",
      btn: "Ver Mis Reservas",
    });
  } catch (error) {
    console.error("Error al guardar la reserva del usuario:", error);
    // Manejo de errores de base de datos
    return res.render("usuario/crear-reserva", {
      titulo: "Crear Nueva Reserva",
      csrfToken: req.csrfToken(),
      errores: [
        { msg: "Hubo un error al procesar tu reserva. Intenta de nuevo." },
      ],
      datos: req.body,
      duraciones,
    });
  }
};

// Función para mostrar las reservas existentes del cliente
const misReservas = async (req, res) => {
  // 1. Aseguramos que el usuario esté logueado
  if (!res.locals.usuario) {
    return res.redirect("/auth/login");
  }

  const usuarioId = res.locals.usuario.id;
  let reservas = []; // --- Lógica de Consulta a Base de Datos (IMPLEMENTADA) ---

  try {
    // Buscar todas las reservas asociadas a este usuario
    reservas = await Reserva.findAll({
      where: { usuarioId: usuarioId },
      include: [{ model: Mesa, as: "mesa" }],
      order: [
        ["fecha_reserva", "DESC"],
        ["hora_reserva", "DESC"],
      ],
    });
  } catch (error) {
    console.error("Error al obtener reservas:", error); // Manejo de errores
  }

  res.render("usuario/mis-reservas", {
    titulo: "Mis Reservas Actuales",
    reservas: reservas, // Pasar los datos reales
  });
};

export { dashboardUsuario, crearReservaPublica, procesarReserva, misReservas };
