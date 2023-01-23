const port = 3000;
const { log } = require('console');
const express = require('express');
const { hostname } = require('os');
const fs = require('fs'),
    path = require('path'),
    filePath = path.join(__dirname, 'static/data/dirac-cache (копия).csv');
const papa = require('./public/PapaParse-5.0.2/papaparse');
const app = express();

// Define the static file path
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
})

app.get('/data', function(req, res) {
    var data = [],
        dates = [],
        hostnames = [],
        models = [],
        sites = [],
        statuses = [],
        users = [];
    // res.sendFile(__dirname + '/public/data/dirac-cache (копия).csv');
    fs.readFile(filePath, { encoding: 'utf-8' }, function(err, csvdata) {
        // console.log(csvdata);
        if (!err) {
            console.log('Start parsing...');
            papa.parse(csvdata, {
                delimiter: ';',
                header: false,
                columns: ['datatype', 'result', 'table', '_time', 'hostname', 'model', 'site', 'status', 'user', 'cpu_norm', 'job_id', 'wall_time'],
                skipEmptyLines: true,
                // fastMode: true,
                step: function(row) {
                    // console.log(row);
                    var date = new Date(Date.parse(row.data[3])),
                        hostname = row.data[4] !== 'string' && row.data[4] !== 'hostname' && row.data[4] !== '' ? row.data[4] : undefined,
                        model = row.data[5] !== 'string' && row.data[5] !== 'model' && row.data[5] !== '' ? row.data[5] : undefined,
                        site = row.data[6] !== 'string' && row.data[6] !== 'site' && row.data[6] !== '' ? row.data[6] : undefined,
                        status = row.data[7] !== 'string' && row.data[7] !== 'status' && row.data[7] !== '' ? row.data[7] : undefined,
                        user = /^([a-z]+)$/.test(row.data[8]) && row.data[8] !== 'string' && row.data[8] !== 'user' && row.data[8] !== 'double' ? row.data[8] : undefined;
                    dates.push(date);
                    hostnames.push(hostname);
                    models.push(model);
                    sites.push(site);
                    statuses.push(status);
                    users.push(user);
                    data.push({
                        'datatype': row.data[0],
                        'result': row.data[1],
                        'table': row.data[2],
                        '_time': row.data[3],
                        'hostname': row.data[4],
                        'model': row.data[5],
                        'site': row.data[6],
                        'status': row.data[7],
                        'user': row.data[8],
                        'cpu_norm': row.data[9],
                        'job_id': row.data[10],
                        'wall_time': row.data[11]
                    });
                },
                complete: function(results, file) {
                    console.log("Parsing complete:", results.data, file);
                    dates = Array.from(new Set(dates));
                    hostnames = Array.from(new Set(hostnames));
                    models = Array.from(new Set(models));
                    sites = Array.from(new Set(sites));
                    statuses = Array.from(new Set(statuses));
                    users = Array.from(new Set(users));

                    res.send({
                        data: data,
                        dates: dates,
                        hostnames: hostnames,
                        models: models,
                        sites: sites,
                        statuses: statuses,
                        users: users,
                    });
                }
            });
        } else console.log(err);
    });
});

app.listen(port, () => console.log('The server running on Port ' + port));