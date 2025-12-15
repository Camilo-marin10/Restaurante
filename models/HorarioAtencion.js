import { DataTypes } from "sequelize";
import db from "../config/db.js";

const HorarioAtencion = db.define(
  "horario_atencion",
  {
    dia_semana: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    hora_apertura: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    hora_cierre: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "horarios_atencion",
    timestamps: true,
  }
);

export default HorarioAtencion;
