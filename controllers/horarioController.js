import HorarioAtencion from "../models/HorarioAtencion.js";
import { Op } from "sequelize";

const DIAS_SEMANA = [
  { id: 0, nombre: "Domingo" },
  { id: 1, nombre: "Lunes" },
  { id: 2, nombre: "Martes" },
  { id: 3, nombre: "Miércoles" },
  { id: 4, nombre: "Jueves" },
  { id: 5, nombre: "Viernes" },
  { id: 6, nombre: "Sábado" },
];

const mostrarHorarios = async (req, res) => {
  try {
    const horariosExistentes = await HorarioAtencion.findAll({
      attributes: ["dia_semana"],
      raw: true,
    });

    const diasExistentes = horariosExistentes.map((h) => h.dia_semana);

    const diasFaltantes = DIAS_SEMANA.filter(
      (dia) => !diasExistentes.includes(dia.id)
    );

    if (diasFaltantes.length > 0) {
      console.log(`Inicializando ${diasFaltantes.length} horarios...`);
      const nuevosHorarios = diasFaltantes.map((dia) => ({
        dia_semana: dia.id,
        activo: dia.id !== 0,
        hora_apertura: "10:00:00",
        hora_cierre: "22:00:00",
      }));
      await HorarioAtencion.bulkCreate(nuevosHorarios);
    }

    const horarios = await HorarioAtencion.findAll({
      order: [["dia_semana", "ASC"]],
      raw: true,
    });

    const horariosFormateados = horarios.map((horario) => {
      const diaInfo = DIAS_SEMANA.find((d) => d.id === horario.dia_semana);
      return {
        ...horario,
        nombre_dia: diaInfo ? diaInfo.nombre : "Día Desconocido",
        hora_apertura_input: horario.hora_apertura
          ? horario.hora_apertura.substring(0, 5)
          : "",
        hora_cierre_input: horario.hora_cierre
          ? horario.hora_cierre.substring(0, 5)
          : "",
      };
    });

    res.render("admin/horarios/index", {
      titulo: "Gestión de Horarios",
      csrfToken: req.csrfToken(),
      horarios: horariosFormateados,
    });
  } catch (error) {
    console.error("Error al cargar horarios:", error);
    res.render("admin/horarios/index", {
      titulo: "Gestión de Horarios",
      csrfToken: req.csrfToken(),
      horarios: [],
      errores: [
        { msg: "Hubo un error al cargar la configuración de horarios." },
      ],
    });
  }
};

const actualizarHorarios = async (req, res) => {
  const recargarVista = async (errores) => {
    const horarios = await HorarioAtencion.findAll({
      order: [["dia_semana", "ASC"]],
      raw: true,
    });

    const horariosFormateados = horarios.map((horario) => {
      const diaInfo = DIAS_SEMANA.find((d) => d.id === horario.dia_semana);
      return {
        ...horario,
        nombre_dia: diaInfo ? diaInfo.nombre : "Día Desconocido",
        hora_apertura_input: req.body[`apertura_${horario.dia_semana}`] || "",
        hora_cierre_input: req.body[`cierre_${horario.dia_semana}`] || "",
      };
    });

    res.render("admin/horarios/index", {
      titulo: "Gestión de Horarios",
      csrfToken: req.csrfToken(),
      horarios: horariosFormateados,
      errores,
    });
  };

  try {
    const errores = [];

    for (let i = 0; i < 7; i++) {
      const diaId = i;
      const diaNombre = DIAS_SEMANA.find((d) => d.id === diaId).nombre;

      const activo = req.body[`activo_${diaId}`] === "on";
      let apertura = req.body[`apertura_${diaId}`];
      let cierre = req.body[`cierre_${diaId}`];

      if (activo) {
        if (!apertura || !cierre) {
          errores.push({
            msg: `Debe especificar la hora de apertura y cierre para el ${diaNombre}.`,
          });
        } else if (apertura >= cierre) {
          errores.push({
            msg: `La hora de apertura (${apertura}) debe ser anterior a la hora de cierre (${cierre}) para el ${diaNombre}.`,
          });
        }
      } else {
        apertura = null;
        cierre = null;
      }

      if (errores.length > 0) {
        return recargarVista(errores);
      }

      await HorarioAtencion.update(
        {
          activo,
          hora_apertura: apertura,
          hora_cierre: cierre,
        },
        {
          where: { dia_semana: diaId },
        }
      );
    }

    const horariosGuardados = await HorarioAtencion.findAll({
      order: [["dia_semana", "ASC"]],
      raw: true,
    });

    const horariosFormateados = horariosGuardados.map((horario) => ({
      ...horario,
      nombre_dia: DIAS_SEMANA.find((d) => d.id === horario.dia_semana).nombre,
      hora_apertura_input: horario.hora_apertura
        ? horario.hora_apertura.substring(0, 5)
        : "",
      hora_cierre_input: horario.hora_cierre
        ? horario.hora_cierre.substring(0, 5)
        : "",
    }));

    res.render("admin/horarios/index", {
      titulo: "Gestión de Horarios",
      csrfToken: req.csrfToken(),
      horarios: horariosFormateados,
      mensajeExito: "Horarios de atención actualizados correctamente.",
    });
  } catch (error) {
    console.error("Error al actualizar horarios:", error);
    recargarVista([
      { msg: "Error interno del servidor al intentar actualizar." },
    ]);
  }
};

export { mostrarHorarios, actualizarHorarios };
