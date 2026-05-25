const crypto = require('crypto');
const http = require('http');

const payload = {
  event: 'customer.created',
  data: {
    customer: {
      id: 123456,
      name: 'Ahmed Salla',
      mobile: '966501234567',
      email: 'ahmed@salla.test'
    }
  }
};

const payloadStr = JSON.stringify(payload);
const secret = 'default-secret'; // from process.env.WEBHOOK_SECRET
const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

const options = {
  hostname: 'localhost',
  port: 2785,
  path: '/api/webhooks/salla/customer-created',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-salla-signature': signature,
    'Content-Length': Buffer.byteLength(payloadStr)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(payloadStr);
req.end();
