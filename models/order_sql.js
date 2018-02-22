module.exports = (sequelize, DataTypes) => {
  return sequelize.define('order', {
    orderTotal: { type: DataTypes.FLOAT, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    LatLong: { type: DataTypes.STRING, allowNull: false },
    eta: { type: DataTypes.INTEGER, allowNull: false },
    etaHuman: { type: DataTypes.STRING, allowNull: false }
  });
};

