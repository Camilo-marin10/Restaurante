import { Op, Sequelize } from "sequelize";
import Reserva from "../models/Reserva.js";
import Mesa from "../models/Mesa.js";
import Cliente from "../models/Cliente.js";

const adminDashboard = async (req, res) => {
  const todayString = new Date().toISOString().split("T")[0];
  const startOfDay = new Date(todayString);
  const endOfRange = new Date(todayString);
  endOfRange.setDate(endOfRange.getDate() + 5);

  try {
    const reservasHoy = await Reserva.findAll({
      where: {
        fecha_reserva: {
          [Op.gte]: startOfDay,
          [Op.lt]: endOfRange,
        },
        estado: {
          [Op.notIn]: ["Completada", "Cancelada", "No-Show"],
        },
      },
      include: [
        {
          model: Cliente,
          as: "cliente",
          attributes: ["nombre", "apellido", "telefono"],
        },
        { model: Mesa, as: "mesa", attributes: ["nombre", "capacidad"] },
      ],
      order: [
        ["fecha_reserva", "ASC"],
        ["hora_reserva", "ASC"],
      ],
    });

    let totalReservasHoy = 0;
    let capacidadOcupada = 0;
    let noShowsHoy = 0;

    reservasHoy.forEach((reserva) => {
      const reservaDate = new Date(reserva.fecha_reserva)
        .toISOString()
        .split("T")[0];
      if (reservaDate === todayString) {
        totalReservasHoy++;
        if (reserva.estado === "No-Show") {
          noShowsHoy++;
        } else {
          capacidadOcupada += reserva.numero_personas;
        }
      }
    });

    const reservasDelDiaFormateadas = reservasHoy.map((reserva) => ({
      id: reserva.id,
      hora: reserva.hora_reserva
        ? `${reserva.fecha_reserva} - ${reserva.hora_reserva.substring(0, 5)}`
        : "N/A",
      cliente: reserva.cliente
        ? `${reserva.cliente.nombre} ${reserva.cliente.apellido}`
        : "Cliente Desconocido",
      personas: reserva.numero_personas,
      mesa: reserva.mesa ? reserva.mesa.nombre : "Mesa N/A",
      estado: reserva.estado,
      enlaceGestion: `/admin/reservas/editar/${reserva.id}`,
    }));

    res.render("admin/index", {
      titulo: "Panel de Control",
      csrfToken: req.csrfToken(),
      reservasHoy: totalReservasHoy,
      capacidadOcupada,
      noShowsHoy,
      reservasDelDia: reservasDelDiaFormateadas,
    });
  } catch (error) {
    console.error("Error FATAL al cargar datos del dashboard:", error);
    res.render("admin/index", {
      titulo: "Panel de Control",
      csrfToken: req.csrfToken(),
      reservasHoy: 0,
      capacidadOcupada: 0,
      noShowsHoy: 0,
      reservasDelDia: [],
    });
  }
};

export { adminDashboard };
