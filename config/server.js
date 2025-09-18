const https = require('https');
const fs = require('fs');
const path = require('path');

const startHttpsServer = (app, port) => {
  const privateKey = fs.readFileSync(path.join(__dirname, '..', 'certificates', 'private-key.pem'), 'utf8');
  const certificate = fs.readFileSync(path.join(__dirname, '..', 'certificates', 'certificate.pem'), 'utf8');

  const credentials = {
    key: privateKey,
    cert: certificate
  };

  const httpsServer = https.createServer(credentials, app);

  httpsServer.listen(port, () => {
    console.log(`Server running on: https://localhost:${port}/`);
  });

  return httpsServer;
};

module.exports = { startHttpsServer };