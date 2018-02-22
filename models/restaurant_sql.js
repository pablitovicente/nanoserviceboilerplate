module.exports = (sequelize, DataTypes) => {
  return sequelize.define('restaurant', {
    logo: { type: DataTypes.STRING, allowNull: true },
    commercialName: { type: DataTypes.STRING, allowNull: false, unique: 'commercialLegalName' },
    legalName: { type: DataTypes.STRING, allowNull: false, unique: 'commercialLegalName' },
    rating: { type: DataTypes.FLOAT, allowNull: true, defaultValue: 0 },
    commercialEmail: { type: DataTypes.STRING, allowNull: false, unique: 'emailIdx' },
    adminNumber: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    Location: { type: DataTypes.STRING, allowNull: true }
  });
};

