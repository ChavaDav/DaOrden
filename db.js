require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

const dialect = process.env.DB_DIALECT || 'sqlite';
const storage = process.env.DB_STORAGE || 'database.sqlite';

let sequelize;

if (dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, storage),
    logging: false
  });
} else {
  // Configuración genérica para otros dialectos (MySQL, Postgres, etc)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: dialect,
      logging: false
    }
  );
}

module.exports = sequelize;
