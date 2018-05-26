const compression = require('compression');
const express = require('express');
const path = require('path');

const app = express();
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.listen(process.env.port || 3333, () => {
    console.log('listening');
});
