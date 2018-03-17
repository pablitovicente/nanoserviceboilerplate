const mongoose = require('mongoose');
const Ajv = require('ajv');
const googleMapsClient = require('@google/maps');

class ApiController {
  constructor(opts) {
    this.restaurants = opts.restaurant;
    this.reviews = opts.review;
    this.meals = opts.meal;
    this.order = opts.order;
    this.orderMeal = opts.orderMeal;
    this.sequelize = opts.sequelize;
    this.queue = opts.queue;
    this.googleMaps = googleMapsClient.createClient({
      key: 'no no',
    });
  }

  findAll() {
    return this.restaurants.findAll({
      include: [{
        model: this.reviews,
        attributes: ['name', 'review', 'rating'],
      },
      {
        model: this.meals,
        attributes: ['name', 'description', 'price'],
      },
      ],
    });
  }

  findByRating(options) {
    return this.restaurants.findAll({
      where: {
        rating: {
          [this.sequelize.Op.between]: [(Number(options.rating) - 0.5), (Number(options.rating) + 0.5)],
        },
      },
      include: [{
        model: this.reviews,
        attributes: ['name', 'review', 'rating'],
      },
      {
        model: this.meals,
        attributes: ['name', 'description', 'price'],
      },
      ],
    });
  }

  addNew(options) {
    const { dataToSave } = options;
    dataToSave.rating = dataToSave.reviews.reduce((totalRating, aReview) => aReview.rating + totalRating, 0) / dataToSave.reviews.length;
    return this.restaurants.create(dataToSave, { include: [this.meals, this.reviews] });
  }

  patch(options) {
    const { meals } = options.modelValues;
    return this.restaurants.findOne({
      where: {
        id: options.id,
      },
    })
      .then((aResto) => {
        if (!aResto) {
          return Promise.resolve(0);
        }
        // Begin a transaction
        return this.sequelize.transaction(tr => aResto
          .updateAttributes(options.modelValues, { transaction: tr })
          .then(() => {
            const mealsUpdated = meals.map((aMeal) => {
              const restaurantId = aResto.id;
              return Object.assign({}, aMeal, { restaurantId });
            });
            return this.meals.bulkCreate(mealsUpdated, { transaction: tr });
          }))
          .then(results => Promise.resolve(results.length))
          .catch(reason => Promise.reject(reason));
      });
  }

  delete(options) {
    return this.restaurants.destroy({
      where: {
        id: options.id,
      },
    });
  }

  rate(options) {
    // In a real world situation this would be in its own module!
    const reviewSchema = {
      type: 'object',
      required: ['name', 'review', 'rating'],
      properties: {
        name: { type: 'string' },
        review: { type: 'string' },
        rating: { type: 'number' },
      },
    };
    const jsonValidator = new Ajv({ allErrors: true });
    const validPayload = jsonValidator.compile(reviewSchema);
    // if the payload is invalid reject
    if (!validPayload(options.modelValues)) {
      return Promise.reject(new Error('Reviews expect a json containing name, review and rating'));
    }

    if (options.modelValues.rating > 5 || options.modelValues.rating < 1) {
      return Promise.reject(new Error('Rating should be a value between 1 and 5'));
    }
    return this.restaurants
      .findOne({ where: { id: options.id } })
      .then((aRestaurant) => {
        const updatedRating = (aRestaurant.rating + options.modelValues.rating) / 2;
        return aRestaurant.updateAttributes({ rating: updatedRating })
          .then(() => this.reviews.create(Object.assign({}, options.modelValues, { restaurantId: aRestaurant.id })))
          .catch(reason => reason);
      });
  }

  findByName(name) {
    return this.restaurants.findOne({
      where: {
        commercialName: name,
      },
      include: [{
        model: this.meals,
        attributes: ['name', 'description', 'price', 'id'],
      }],
    });
  }

  geoCodeAddress(address) {
    return new Promise((resolve, reject) => {
      this
        .googleMaps
        .geocode(
          { address },
          (error, geocodedAddress) => {
            if (error) {
              reject(error);
            }
            // YEAH THIS IS WRONG BUT FOR THE SAKE OF A DEMO...... FIRST ELEMENT WILL DO
            const LatLong = `${geocodedAddress.json.results[0].geometry.location.lat},${geocodedAddress.json.results[0].geometry.location.lng}`;
            resolve(LatLong);
          },
        );
    });
  }

  calculateEta(origin, destination) {
    return new Promise((resolve, reject) => {
      const apiParams = {
        origins: [origin],
        destinations: destination,
        departure_time: Math.floor(new Date().getTime() / 1000),
        traffic_model: 'optimistic',
      };
      this.googleMaps.distanceMatrix(
        apiParams,
        (errTransit, timeMatrix) => {
          if (errTransit) reject(errTransit);
          resolve(timeMatrix);
        },
      );
    });
  }

  placeOrder(options) {
    return new Promise((resolve, reject) => {
      const requestBody = options.modelValues;
      const orderDocument = {};
      this
        .findByName(requestBody.restaurant)
        .then((aResto) => {
          if (!aResto) {
            return reject(new Error('Restaurant not found'));
          }
          const allMeals = aResto
            .dataValues
            .meals
            .filter(aMeal => requestBody.meals.includes(aMeal.name)).map(aMeal => ({ price: aMeal.price, mealId: aMeal.id, name: aMeal.name }));
          // Reduce meal price to total
          const orderTotal = allMeals.reduce((currenttotal, aMeal) => Number(aMeal.price) + currenttotal, 0);
          // Build a document for saving later
          Object.assign(orderDocument, {
            address: requestBody.address,
            restaurantId: aResto.id,
            meals: allMeals,
            orderTotal,
          });

          this
            .geoCodeAddress(orderDocument.address)
            .then((latLong) => {
              orderDocument.LatLong = latLong;
              this
                .calculateEta(aResto.Location, orderDocument.LatLong)
                .then((etaResult) => {
                  // YEAH THIS IS WRONG BUT FOR THE SAKE OF A DEMO...... FIRST ELEMENT WILL DO
                  orderDocument.eta = etaResult.json.rows[0].elements[0].duration_in_traffic.value;
                  orderDocument.etaHuman = etaResult.json.rows[0].elements[0].duration_in_traffic.text;

                  this.sequelize.transaction(tr => this.order.create(orderDocument, { transaction: tr })
                    .then(() => this.orderMeal.bulkCreate(allMeals.map(aMeal => ({ mealId: aMeal.mealId })), { transaction: tr })))
                    .then(() => {
                      this.queue.publish('orders', JSON.stringify(orderDocument));
                      this.queue.publish('orders_confirmation', JSON.stringify(orderDocument));
                      return resolve(orderDocument);
                    })
                    .catch(reason => reject(reason));
                });
            });
        })
        .catch((reason) => {
          reject(reason);
        });
    });
  }
}

module.exports = ApiController;
