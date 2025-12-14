import { Op, Sequelize, fn, col } from "sequelize";
import Reserva from "../models/Reserva.js";
import Mesa from "../models/Mesa.js";
import Usuario from "../models/Usuarios.js";

const adminDashboard = async (req, res) => {
  const today = new Date();
  const todayString = today.toISOString().split("T")[0];
  const startOfToday = todayString;

  const endOfRangeDate = new Date();
  endOfRangeDate.setDate(endOfRangeDate.getDate() + 5);
  const endOfRangeString = endOfRangeDate.toISOString().split("T")[0];

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAgoString = ninetyDaysAgo.toISOString().split("T")[0];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split("T")[0];

  try {
    const reservasEnRango = await Reserva.findAll({
      where: {
        fecha_reserva: {
          [Op.gte]: startOfToday,
          [Op.lte]: endOfRangeString,
        },
      },
      include: [
        {
          model: Usuario,
          as: "cliente",
          attributes: ["nombre"],
        },
        { model: Mesa, as: "mesa", attributes: ["nombre", "capacidad"] },
      ],
      order: [
        ["fecha_reserva", "ASC"],
        ["hora_reserva", "ASC"],
      ],
    });

    const estadisticasLP = await Reserva.findAll({
      attributes: [
        [fn("COUNT", col("id")), "totalReservas90"],
        [
          fn(
            "SUM",
            Sequelize.literal(
              "CASE WHEN estado = 'Completada' THEN numero_personas ELSE 0 END"
            )
          ),
          "capacidadAtendida90",
        ],
        [
          fn(
            "SUM",
            Sequelize.literal("CASE WHEN estado = 'No-Show' THEN 1 ELSE 0 END")
          ),
          "noShows90",
        ],
        [
          fn(
            "SUM",
            Sequelize.literal(
              "CASE WHEN estado = 'Completada' THEN 1 ELSE 0 END"
            )
          ),
          "completadas90",
        ],
        [
          fn(
            "SUM",
            Sequelize.literal(
              "CASE WHEN estado = 'Cancelada' THEN 1 ELSE 0 END"
            )
          ),
          "canceladas90",
        ],
      ],
      where: {
        fecha_reserva: {
          [Op.gte]: ninetyDaysAgoString,
          [Op.lt]: tomorrowString,
        },
      },
      raw: true,
    });

    const {
      totalReservas90,
      noShows90,
      completadas90,
      capacidadAtendida90,
      canceladas90,
    } = estadisticasLP[0];

    const tasaNoShows =
      totalReservas90 > 0
        ? ((noShows90 / totalReservas90) * 100).toFixed(1)
        : 0;
    const reservasPromedioDia = (totalReservas90 / 90).toFixed(1);

    const reservasSoloHoy = reservasEnRango.filter(
      (reserva) => reserva.fecha_reserva === todayString
    );

    let totalReservasHoy = 0;
    let capacidadOcupada = 0;
    let noShowsHoy = 0;

    reservasSoloHoy.forEach((reserva) => {
      if (reserva.estado === "No-Show") {
        noShowsHoy++;
      }
      if (reserva.estado !== "Completada" && reserva.estado !== "Cancelada") {
        totalReservasHoy++;
      }
      if (
        reserva.estado !== "Cancelada" &&
        reserva.estado !== "Completada" &&
        reserva.estado !== "No-Show"
      ) {
        capacidadOcupada += reserva.numero_personas;
      }
    });

    const reservasDelDiaParaTabla = reservasEnRango.filter(
      (reserva) =>
        reserva.estado !== "Completada" &&
        reserva.estado !== "Cancelada" &&
        reserva.estado !== "No-Show"
    );

    const reservasDelDiaFormateadas = reservasDelDiaParaTabla.map((reserva) => {
      const formatDate = (dateString) => {
        const [year, month, day] = dateString.split("-");
        return `${day}/${month}`;
      };

      return {
        id: reserva.id,
        hora:
          reserva.fecha_reserva && reserva.hora_reserva
            ? `${formatDate(
                reserva.fecha_reserva
              )} - ${reserva.hora_reserva.substring(0, 5)}`
            : "N/A",
        cliente: reserva.cliente
          ? `${reserva.cliente.nombre}`
          : "Cliente Desconocido",
        personas: reserva.numero_personas,
        mesa: reserva.mesa ? reserva.mesa.nombre : "Mesa N/A",
        estado: reserva.estado,
        enlaceGestion: `/admin/reservas/editar/${reserva.id}`,
      };
    });

    res.render("admin/dashboard", {
      titulo: "Panel de Control",
      csrfToken: req.csrfToken(),
      reservasHoy: totalReservasHoy,
      capacidadOcupada,
      noShowsHoy,
      completadas90: completadas90 || 0,
      tasaNoShows: tasaNoShows,
      capacidadAtendida90: capacidadAtendida90 || 0,
      reservasPromedioDia: reservasPromedioDia,
      canceladas90: canceladas90 || 0,

      reservasDelDia: reservasDelDiaFormateadas,
    });
  } catch (error) {
    console.error("Error FATAL al cargar datos del dashboard:", error);
    res.render("admin/dashboard", {
      titulo: "Panel de Control",
      csrfToken: req.csrfToken(),
      reservasHoy: 0,
      capacidadOcupada: 0,
      noShowsHoy: 0,
      completadas90: 0,
      tasaNoShows: 0,
      capacidadAtendida90: 0,
      reservasPromedioDia: 0,
      canceladas90: 0,
      reservasDelDia: [],
    });
  }
};

export { adminDashboard };
