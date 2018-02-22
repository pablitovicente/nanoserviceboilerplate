const mqtt = require('mqtt');
const mqttClient = mqtt.connect('mqtt://localhost');

 
mqttClient.on('connect', () => {
  mqttClient.subscribe('orders');
});
 
mqttClient.on('message', (topic, message) => {
  const orderDetails = JSON.parse(message);
  console.log('THIS WORKERS WOULD USE SENDGRID, AWS SES OR OTHER EMAIL PROVIDER');
  console.log('FOR SENDING A RENDERED EMAIL TEMPLATE USING THE DETAILS FROM THE ORDER');
  console.log(JSON.stringify(orderDetails, null, 2));
});
