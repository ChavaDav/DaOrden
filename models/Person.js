const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Person = sequelize.define('Person', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  present: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

module.exports = Person;
