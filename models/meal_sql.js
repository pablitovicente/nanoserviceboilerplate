module.exports = (sequelize, DataTypes) => sequelize.define('meal', {
  name: { type: DataTypes.STRING, allowNull: false, unique: 'meal_for_restauran' },
  description: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false }
});
