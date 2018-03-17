module.exports = (sequelize, DataTypes) => sequelize.define('review', {
  name: { type: DataTypes.STRING, allowNull: false },
  review: { type: DataTypes.STRING, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false },
});
