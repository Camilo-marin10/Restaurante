import Reserva from "../models/Reserva.js";
import Mesa from "../models/Mesa.js";
import Usuario from "../models/Usuarios.js";

const listarReservasAdmin = async (req, res) => {
  try {
    const reservas = await Reserva.findAll({
      include: [
        { model: Mesa, as: "mesa" },
        { model: Usuario, as: "usuario" },
      ],
      order: [
        ["fecha_reserva", "ASC"],
        ["hora_reserva", "ASC"],
      ],
    });

    res.render("admin/reservas-admin", {
      titulo: "Gestión de Reservas",
      reservas: reservas,
      estados: [
        "Pendiente",
        "Confirmada",
        "Cancelada",
        "En Curso",
        "Finalizada",
      ],
    });
  } catch (error) {
    console.error("Error al obtener reservas para Admin:", error);
    res.render("admin/reservas-admin", {
      titulo: "Gestión de Reservas",
      reservas: [],
      error: "Error al cargar las reservas.",
    });
  }
};

const cambiarEstadoReserva = async (req, res) => {
  const { id } = req.params;
  const { nuevo_estado } = req.body;

  const reserva = await Reserva.findByPk(id);

  if (!reserva) {
    return res.status(404).json({
      msg: "Reserva no encontrada",
    });
  }

  const estadosPermitidos = [
    "Pendiente",
    "Confirmada",
    "Cancelada",
    "En Curso",
    "Finalizada",
  ];
  if (!estadosPermitidos.includes(nuevo_estado)) {
    return res.status(400).json({
      msg: "Estado no válido",
    });
  }

  try {
    reserva.estado = nuevo_estado;
    await reserva.save();
    res.redirect("/admin/reservas");
  } catch (error) {
    console.error("Error al actualizar estado de reserva:", error);
    res.status(500).json({
      msg: "Hubo un error al actualizar el estado",
    });
  }
};

export { listarReservasAdmin, cambiarEstadoReserva };
