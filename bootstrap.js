require('dotenv').config({ path: process.env.NODE_ENV ? `${__dirname}/envs/.env.${process.env.NODE_ENV}` : `${__dirname}/envs/.env.development` });
const Sequelize = require('sequelize');
const mqtt = require('mqtt');

const winston = require('winston');
winston.transports.DailyRotateFile = require('winston-daily-rotate-file');
const http = require('http');
const Service = require('./service.js');

winston.info(`BOOTSTRAPING SERVICE USING ENVIRONMENT: '${process.env.NODE_ENV}'`);

const bootstraService = async () => {
  const service = new Service({
    name: process.env.SERVICE_NAME,
    winston: winston
  });

  try {
    await service.validateEnvironment();
    await service.setupLogger(winston);
    await service.setupDB(Sequelize);
    await service.setupSqlModels();
    await service.setupQueue(mqtt);
    await service.setupExpress();
    await service.setupApi();
    await service.setupExpressRouteErrorHandlers();
    await service.startService(http);
    winston.info(`BOOTSTRAPING DONE. SERVICE LISTENING AT PORT: '${process.env.PORT}'`);
  } catch (bootstrapError) {
    winston.error('Error during service bootstraping!');
    winston.error(bootstrapError);
    process.exit(1);
  }
};

bootstraService();
