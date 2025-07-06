const express = require('./backend/node_modules/express');
const path = require('path');

const app = express();
const PORT = 3002;

// Serve static files
app.use(express.static(__dirname));

// Serve the test HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-socket.html'));
});

app.listen(PORT, () => {
  console.log(`🧪 Test server running on http://localhost:${PORT}`);
  console.log(`📄 Test file available at http://localhost:${PORT}/test-socket.html`);
}); 