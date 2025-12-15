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
    const mesasActivas = await Mesa.findAll({
      where: { estado: "Activa" },
      attributes: ["id", "nombre", "capacidad", "zona"],
      order: [["nombre", "ASC"]],
    });

    const reservasEnRango = await Reserva.findAll({
      where: {
        fecha_reserva: {
          [Op.gte]: startOfToday,
          [Op.lte]: endOfRangeString,
        },
        estado: { [Op.in]: ["Pendiente", "Confirmada", "En Curso"] },
      },
      include: [
        {
          model: Usuario,
          as: "cliente",
          attributes: ["nombre"],
        },
        { model: Mesa, as: "mesa", attributes: ["nombre", "capacidad", "id"] },
      ],
      order: [
        ["fecha_reserva", "ASC"],
        ["hora_reserva", "ASC"],
      ],
    });

    const tiempoActual = new Date();

    const reservasActivasAhora = {};

    reservasEnRango.forEach((reserva) => {
      if (reserva.fecha_reserva !== todayString) return;

      const estadoActual = reserva.estado;
      const horaInicio = new Date(
        `${reserva.fecha_reserva}T${reserva.hora_reserva}`
      );
      const duracionMinutos = reserva.duracion_estimada * 60;
      const horaFin = new Date(horaInicio.getTime() + duracionMinutos * 60000);

      if (tiempoActual >= horaInicio && tiempoActual <= horaFin) {
        const mesaNombre = reserva.mesa ? reserva.mesa.nombre : reserva.mesaId;

        if (estadoActual === "En Curso") {
          reservasActivasAhora[mesaNombre] = {
            estado: "Ocupada",
            cliente: reserva.cliente.nombre,
            horaFin: horaFin.toTimeString().split(" ")[0].substring(0, 5),
            reservaId: reserva.id,
          };
        } else if (
          estadoActual === "Confirmada" ||
          estadoActual === "Pendiente"
        ) {
          if (
            !reservasActivasAhora[mesaNombre] ||
            reservasActivasAhora[mesaNombre].estado !== "Ocupada"
          ) {
            reservasActivasAhora[mesaNombre] = {
              estado: "Reservada",
              cliente: reserva.cliente.nombre,
              horaInicio: reserva.hora_reserva.substring(0, 5),
              reservaId: reserva.id,
            };
          }
        }
      }
    });

    const mapaDeMesas = mesasActivas.map((mesa) => {
      const reservaInfo = reservasActivasAhora[mesa.nombre];
      let status = {
        id: mesa.id,
        nombre: mesa.nombre,
        capacidad: mesa.capacidad,
        zona: mesa.zona,
        status: "Libre",
        info: "",
        reservaId: null,
      };

      if (reservaInfo) {
        status.status = reservaInfo.estado;
        status.reservaId = reservaInfo.reservaId;
        if (reservaInfo.estado === "Ocupada") {
          status.info = `Ocupada por ${reservaInfo.cliente}. Fin aprox. ${reservaInfo.horaFin}`;
        } else if (reservaInfo.estado === "Reservada") {
          status.info = `Reservada a las ${reservaInfo.horaInicio} por ${reservaInfo.cliente}`;
        }
      }
      return status;
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
      mapaDeMesas: mapaDeMesas,
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
      mapaDeMesas: [],
    });
  }
};

export { adminDashboard };
