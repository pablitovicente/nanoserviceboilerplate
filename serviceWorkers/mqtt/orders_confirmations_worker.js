const mqtt = require('mqtt');

const mqttClient = mqtt.connect('mqtt://localhost');


mqttClient.on('connect', () => {
  mqttClient.subscribe('orders_confirmation');
});

mqttClient.on('message', (topic, message) => {
  const orderDetails = JSON.parse(message);
  console.log('THIS WORKERS SIMULATES SENDING SMS');
  console.log(`Your order will arrive in ${orderDetails.etaHuman}`);
});
