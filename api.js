const express = require('express');
require('moment-duration-format');
const ApiController = require('./controller.js');

const router = express.Router();

const Api = function Api(service) {
  this.service = service;
  this.controller = new ApiController({
    restaurant: service.restaurantModel,
    review: service.reviewModel,
    meal: service.mealModel,
    order: service.orderModel,
    orderMeal: service.orderMealModel,
    sequelize: service.sequelize,
    queue: service.queue,
  });
};


// @todo in a real world scenario we should use an injected object for this....
const humanizeSequelizeError = (errors) => {
  const allValidationErrors = [];
  errors.forEach((anError) => {
    allValidationErrors.push({
      message: anError.message,
      type: anError.type,
      path: anError.path,
      value: anError.value,
    });
  });
  return Promise.resolve(allValidationErrors);
};


Api.prototype.routes = function ApiRoutes() {
  router.get('/restaurants', (req, res) => {
    this.controller
      .findAll()
      .then((dbResults) => {
        if (dbResults.length === 0) {
          res.status(404).send(dbResults);
        } else {
          res.status(200).send(dbResults);
        }
      })
      .catch((reason) => {
        this.service.log.error(`${this.service.name}: error when serving ${JSON.stringify(req.method)} ${req.path}`);
        this.service.log.error(`${this.service.name}: ${reason}`);
        res.status(500).send({ info: reason.message });
      });
  });

  router.get('/restaurants/:rating', (req, res) => {
    this.controller
      .findByRating({
        rating: req.params.rating,
      })
      .then((dbResult) => {
        if (dbResult === null) {
          res.status(404).send(dbResult);
        } else {
          res.status(200).send(dbResult);
        }
      })
      .catch((reason) => {
        this.service.log.error(`${this.service.name}: error when serving ${JSON.stringify(req.method)} ${req.path}`);
        this.service.log.error(`${this.service.name}: ${reason}`);
        res.status(500).send({ info: reason.message });
      });
  });

  router.post('/restaurants', (req, res) => {
    const newModelData = req.body;
    this.controller
      .addNew({
        dataToSave: newModelData,
      })
      .then(() => {
        res.status(201).send();
      })
      .catch((reason) => {
        this.service.log.error(`${this.service.name}: error when serving ${JSON.stringify(req.method)} ${req.path}`);
        this.service.log.error(`${this.service.name}: ${reason}`);
        humanizeSequelizeError(reason.errors).then((theErrors) => {
          const errorBody = { info: theErrors };
          res.status(400).send(errorBody);
        });
      });
  });

  router.patch('/restaurants/:id', (req, res) => {
    this.controller
      .patch({
        modelValues: req.body,
        id: req.params.id,
      })
      .then((saveModelResult) => {
        if (saveModelResult < 1) {
          res.status(200).send({ info: 'No resources where updated.' });
        } else {
          res.status(200).send();
        }
      })
      .catch((reason) => {
        this.service.log.error(`${this.service.name}: error when serving ${JSON.stringify(req.method)} ${req.path}`);
        this.service.log.error(`${this.service.name}: ${reason}`);
        humanizeSequelizeError(reason.errors).then((theErrors) => {
          const errorBody = { info: theErrors };
          res.status(400).send(errorBody);
        });
      });
  });

  router.delete('/restaurants/:id', (req, res) => {
    this.controller
      .delete({
        id: req.params.id,
      })
      .then((deleteResult) => {
        if (deleteResult) {
          res.status(200).send();
        } else {
          res.status(404).send({ info: 'Resource not found.' });
        }
      })
      .catch((reason) => {
        this.service.log.error(`${this.service.name}: error when serving ${JSON.stringify(req.method)} ${req.path}`);
        this.service.log.error(`${this.service.name}: ${reason}`);
        const errorBody = { info: reason.message };
        res.status(500).send(errorBody);
      });
  });

  router.post('/rate/:id', (req, res) => {
    this.controller
      .rate({
        modelValues: req.body,
        id: req.params.id,
      })
      .then((saveModelResult) => {
        if (saveModelResult < 1) {
          res.status(404).send({ info: 'Resource not found.' });
        } else {
          res.status(200).send();
        }
      })
      .catch((reason) => {
        this.service.log.error(`${this.service.name}: error when serving ${JSON.stringify(req.method)} ${req.path}`);
        this.service.log.error(`${this.service.name}: ${reason}`);
        const errorBody = { info: reason.message };
        res.status(500).send(errorBody);
      });
  });

  router.post('/order', (req, res) => {
    if (!req.body.meals || !req.body.restaurant || !req.body.address) {
      this.service.log.error(`${this.service.name}: error when serving ${JSON.stringify(req.method)} ${req.path}`);
      this.service.log.error(`${this.service.name}: missing order request data`);
      const errorBody = { info: 'You need to provide meals, restaurant and address.' };
      res.status(400).send(errorBody);
    } else {
      this.controller
        .placeOrder({
          modelValues: req.body,
        })
        .then((saveModelResult) => {
          res.status(200).send(saveModelResult);
        })
        .catch((reason) => {
          this.service.log.error(`${this.service.name}: error when serving ${JSON.stringify(req.method)} ${req.path}`);
          this.service.log.error(`${this.service.name}: ${reason}`);
          const errorBody = { info: reason.message };
          res.status(500).send(errorBody);
        });
    }
  });

  return router;
};

module.exports = Api;
