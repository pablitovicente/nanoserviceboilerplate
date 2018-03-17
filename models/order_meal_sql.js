module.exports = (sequelize, DataTypes) => sequelize.define('order_meal', {
  mealId: { type: DataTypes.INTEGER, allowNull: false },
});

