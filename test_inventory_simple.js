const http = require('http');

const data = JSON.stringify({ limit: 1 });

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/bikesakes/us-central1/api/filemaker/layouts/Inventory/records',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log(JSON.stringify(json.data[0].fieldData, null, 2));
    } catch (e) {
      console.log('Error parsing:', body);
    }
  });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
