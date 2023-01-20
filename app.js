const port = 3000;
const express = require('express')
const app = express();

// Define the static file path
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
})

app.get('/data', function(req, res) {
    res.sendFile(__dirname + '/public/data/dirac-cache (копия).csv');
})

app.listen(port, () => console.log('The server running on Port ' + port));