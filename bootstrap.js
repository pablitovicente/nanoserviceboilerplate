require('dotenv').config({ path: process.env.NODE_ENV ? `${__dirname}/envs/.env.${process.env.NODE_ENV}` : `${__dirname}/envs/.env.development` });
const mongoose = require('mongoose');

const winston = require('winston');
winston.transports.DailyRotateFile = require('winston-daily-rotate-file');
const http = require('http');
const Api = require('./api.js');
const Service = require('./service.js');

winston.info(`BOOTSTRAPING SERVICE USING ENVIRONMENT: '${process.env.NODE_ENV}'`);

const bootstraService = async () => {
  const service = new Service({
    name: process.env.SERVICE_NAME,
    winston,
  });

  try {
    await service.validateEnvironment();
    await service.setupLogger(winston);
    await service.setupMongoDB(mongoose);
    await service.setupExpress();
    await service.setupApi(Api);
    await service.setupExpressRouteErrorHandlers();
    await service.createService(http);
    await service.startService();
    winston.info(`BOOTSTRAPING DONE. SERVICE LISTENING AT PORT: '${process.env.PORT}'`);
  } catch (bootstrapError) {
    winston.error('Error during service bootstraping!');
    winston.error(bootstrapError);
    process.exit(1);
  }
};

bootstraService();
