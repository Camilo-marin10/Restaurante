import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Mesa = db.define("mesas", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  capacidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  zona: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  estado: {
    type: DataTypes.STRING(50),
    defaultValue: "Activa",
  },
});

export default Mesa;
