const path = require('path');
const os = require('os');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');


class Service {
  constructor(options) {
    this.numberOfReceivedRequests = 0;
    Object.assign(this, options);

    // Winston handles it but just in case always setup a listener for this event!
    process.on('uncaughtException', (exception) => {
      options.winston.error('Uncaught Exception');
      options.winston.error(exception);
    });
  }

  validateEnvironment() {
    return new Promise((resolve, reject) => {
      let err = false;
      const requiredEnvironmentVariables = [
        'DB_HOST',
        'DB_USER',
        'DB_PASS',
        'DB_SCHEMA',
        'NODE_ENV',
        'SERVICE_NAME',
        'PORT',
      ];
      const environmentKeys = Object.keys(process.env);

      requiredEnvironmentVariables.forEach((aRequiredEnvVariable) => {
        if (environmentKeys.indexOf(aRequiredEnvVariable) === -1) {
          err = Error(`Service misconfiguration, missing environment variable: ${aRequiredEnvVariable}`);
        }
      });

      if (err) {
        reject(err);
      } else {
        this.env = process.env;
        resolve();
      }
    });
  }

  setupLogger(winston) {
    return new Promise((resolve) => {
      this.log = new winston.Logger({
        transports: [
          new (winston.transports.DailyRotateFile)({
            handleExceptions: false,
            json: true,
            level: 'debug',
            filename: path.join(__dirname, '/logs/', `${this.name}-`),
            datePattern: 'yyyyMMdd.log',
            timestamp: true,
          }),
        ],
        exitOnError: false,
      });
      this.log.info(`${this.name}: Logger Initialized.`);
      resolve();
    });
  }

  setupSqlDB(Sequelize) {
    return new Promise((resolve, reject) => {
      this.sequelize = new Sequelize(process.env.DB_SCHEMA, process.env.DB_USER, process.env.DB_PASS, {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
        operatorsAliases: false,
        logging: false,
      });

      this.sequelize
        .authenticate()
        .then((connectionError) => {
          if (connectionError) {
            this.log.error(`${this.name}: DB connection failed.`);
            this.log.error(`${this.name}: ${connectionError}`);
            return reject(connectionError);
          }
          this.log.info(`${this.name}: DB connection initialized.`);
          return resolve();
        })
        .catch(reason => reject(reason));
    });
  }

  setupSqlModels() {
    this.orderModel = this.sequelize.import('./models/order_sql');
    this.orderMealModel = this.sequelize.import('./models/order_meal_sql');
    this.restaurantModel = this.sequelize.import('./models/restaurant_sql');
    this.mealModel = this.sequelize.import('./models/meal_sql');
    this.reviewModel = this.sequelize.import('./models/review_sql');

    this.restaurantModel.hasMany(this.mealModel, { onDelete: 'CASCADE' });
    this.restaurantModel.hasMany(this.reviewModel, { onDelete: 'CASCADE' });
    this.restaurantModel.hasMany(this.orderModel, { onDelete: 'CASCADE' });
    this.orderModel.hasMany(this.orderMealModel, { onDelete: 'CASCADE' });

    this.sequelize
      .sync()
      .then(() => {
        this.log.info(`${this.name}: Database Models Synchronized.`);
        Promise.resolve();
      })
      .catch((reason) => {
        Promise.reject(reason);
      });
  }

  setupMongoDB(mongoose) {
    return new Promise((resolve, reject) => {
      const dbConnectionOptions = {
        db: { native_parser: true },
        user: '',
        pass: '',
      };
      mongoose.connect(
        `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SCHEMA}`,
        dbConnectionOptions,
        (err) => {
          if (err) {
            this.log.error(`${this.name}: DB connection failed.`);
            this.log.error(`${this.name}: ${err}`);
            reject(err);
          } else {
            this.log.info(`${this.name}: DB connection initialized.`);
            resolve();
          }
        },
      );
    });
  }

  setupQueue(queueProvider) {
    return new Promise((resolve, reject) => {
      const queue = queueProvider.connect('mqtt://localhost', { connectTimeout: 1000, debug: true });

      let maxConnectionWait = 10000;
      const waitForConnection = setInterval(() => {
        maxConnectionWait -= 1000;
        if (maxConnectionWait === 0) {
          clearInterval(waitForConnection);
          reject(new Error('Can not connect to mqtt'));
        }

        if (queue.connected) {
          clearInterval(waitForConnection);
          this.queue = queue;
          this.log.info(`${this.name}: Messaging queue connected.`);
          resolve();
        } else {
          this.log.info(`${this.name}: Waiting for Messaging queue connecing. Will give up in: ${maxConnectionWait}`);
        }
      }, 1000);
    });
  }

  setupExpress() {
    return new Promise((resolve) => {
      // Express Setup
      const app = express();

      app.use((req, res, next) => {
        res.set('Content-Type', 'application/json');
        next();
      });

      app.use(compression());
      app.use(helmet());
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded({ extended: false }));
      app.disable('x-powered-by');


      app.use((req, res, next) => {
        // Some accounting
        this.numberOfReceivedRequests += 1;
        this.log.info(`${this.name}: got request from: ${req.ip} route: '${req.originalUrl}' params: ${JSON.stringify(req.params)}`);
        next();
      });

      app.get('/health', (req, res) => {
        res.send({
          upTime: process.uptime(),
          numberOfReceivedRequests: this.numberOfReceivedRequests,
          osFreeMem: os.freemem(),
          serviceMemoryUsage: process.memoryUsage(),
        });
      });

      app.get('/favicon.ico', (req, res) => {
        res.send(204);
      });

      const port = process.env.PORT || '3000';
      app.set('port', port);

      this.express = app;
      this.log.info(`${this.name}: Express has been configured.`);

      resolve();
    });
  }

  setupApi(Api) {
    return new Promise((resolve) => {
      const api = new Api(this);
      this.express.use('/api/v1', api.routes());
      this.log.info(`${this.name}: Api has been configured.`);
      resolve();
    });
  }

  setupExpressRouteErrorHandlers() {
    return new Promise((resolve) => {
      this.express.use((req, res) => {
        const err = new Error(`${this.name}: Resource Not Available ${req.path}`);
        err.status = 404;
        res.status(404);
        res.send({ info: 'Resource not found.' });
      });
      resolve();
    });
  }

  createService(http) {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.express);
      try {
        this.log.info(`${this.name}: server created`);
        resolve(this);
      } catch (reason) {
        reject(reason);
      }
    });
  }

  startService() {
    this.server.listen(this.express.get('port'));
    this.log.info(`${this.name}: Up and Running`);
    return Promise.resolve('Server Started');
  }

  stopService() {
    this.server.close();
    return Promise.resolve('Server Stopped');
  }
}

module.exports = Service;
