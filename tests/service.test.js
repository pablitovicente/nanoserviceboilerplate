require('dotenv').config({ path: `${__dirname}/../envs/.env.test` });
const mocha = require('mocha');
const chai = require('chai');
const winston = require('winston');
const express = require('express');
const http = require('http');
const Api = require('../api');
winston.transports.DailyRotateFile = require('winston-daily-rotate-file');
const EventEmitter = require('events');
const Service = require('../service.js');
let service = null;

const { expect } = chai;

describe('Core Service Setup', () => {
  it('Constructor runs and it is correct class', () =>  {
    service = new Service({
      name: 'test_service',
      winston,
    });
    expect(service).to.be.instanceOf(Service);
  });

  it('Validates evirontment correctly', (done) => {
      service
        .validateEnvironment()
        .then(() => {
          expect(service.env).to.include.keys([
            'DB_HOST',
            'DB_PORT',
            'DB_USER',
            'DB_PASS',
            'DB_SCHEMA',
            'DB_TYPE',
            'DB_LOGGING',
            'NODE_ENV',
            'SERVICE_NAME',
            'PORT'
          ]);
          done();
        })
        .catch((reason) => done(reason));
  });

  it('Setups Logger Correctly', (done) => {
    service
      .setupLogger(winston)
      .then(() => {
        expect(service.log).to.be.instanceOf(EventEmitter);
        done();
      })
      .catch(reason => done(reason));
  });

  it('Setups Express Correctly', (done) => {
    service
      .setupExpress()
      .then(() => {
        expect(service.express).to.include.keys([
          'settings',
          'locals',
          'mountpath',
          '_router',
          'listen'
        ]);
        done();
      })
      .catch(reason => done(reason));
  });

  it('Setups REST API Correctly', (done) => {
    service
      .setupApi(Api)
      .then(() => {
        done();
      })
      .catch(reason => done(reason));
  });

  it('Setups Error Handling Routes Correctly', (done) => {
    service
      .setupExpressRouteErrorHandlers()
      .then(() => {
        done();
      })
      .catch(reason => done(reason));
  });

  it('Sets Up Server Correctly', (done) => {
    service
      .createService(http)
      .then(() => {
        done();
      })
      .catch(reason => done(reason));
  });

  it('Start Service', (done) => {
    service
      .startService()
      .then(() => {
        done();
      })
      .catch(reason => done(reason));
  });

  it('Stops Service', (done) => {
    service
      .stopService()
      .then(() => {
        done();
      })
      .catch(reason => done(reason));
  });
});
