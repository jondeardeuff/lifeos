const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is working!\n');
});

const PORT = 4001;
server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}/`);
});