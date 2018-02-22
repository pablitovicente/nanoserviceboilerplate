Demo Node.js Micro Service
==================================

Introduction
------------

#### Modules Used

* Expressjs as the http platform
* Winston for logging (Plugging Loggers)
* Sequelize as ORM
* Dotenv for handling environments configuration
* Eslint (using Airbnb style guide)

#### Pre requisites

* Recent Linux Distribution / OSX (Not tested in Windows)
* Node.js 8.9.0+
* Mysql v14.14+
* Mosquitto (used as an mqtt server)
* pm2 module
* Create an schema in MySql named 'food_delivery_poc'

#### Installation

* Clone the repository
* npm install
* npm install -g pm2


Start it: 

```pm2 delete API sms_worker orders_worker && pm2 start bootstrap.js --name 'API' && pm2 start serviceWorkers/mqtt/orders_confirmations_worker.js --name sms_worker && pm2 start serviceWorkers/mqtt/orders_worker.js --name orders_worker && pm2 monit```

* The service listens in port 15000 but it can be configured in by the files in the 
* In the root folder there is a postmant collection with samples to use the API
* Logs from the service are stored in ./logs if you want to see the output the logs rotate each day so you need to check the date and then can tail the correct file

##### @TODO

* Unit Testing
* Improve some patterns used
* Refactor everything to use full ES6
* Setup Helmet correctly
* Add rate limiting
* Add Authentication via JWT 
* Unit and Integration Tests
* Implement an Adapter for DBs
* Add memoization
* Add cache backed by Redis
* Add web-workers for heavy loads
* Add Jmeter tests
* Improve health check
* Provide sample Nginx and HAProxy scripts
* Dockerize

#### Author

* Pablo Vicente

#### License

License

Copyright (c) 2017 Pablo Vicente - GPL 3.0