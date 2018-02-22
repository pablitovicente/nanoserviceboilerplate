module.exports = (sequelize, DataTypes) => {
  return sequelize.define('order_meal', {
    mealId: { type: DataTypes.INTEGER, allowNull: false }
  });
};

