import { DataTypes } from "sequelize";
import db from "../config/db.js";
import Usuario from "./Usuarios.js";
import Mesa from "./Mesa.js";

const Reserva = db.define("reservas", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  codigo_reserva: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  fecha_reserva: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  hora_reserva: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  numero_personas: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  duracion_estimada: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: "Pendiente",
  },
  notas: {
    type: DataTypes.TEXT,
  },
});

Reserva.belongsTo(Usuario, { foreignKey: "clienteId", as: "cliente" });
Reserva.belongsTo(Mesa, { foreignKey: "mesaId", as: "mesa" });

export default Reserva;
