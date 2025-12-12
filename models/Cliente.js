import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Cliente = db.define("clientes", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  notas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

export default Cliente;
