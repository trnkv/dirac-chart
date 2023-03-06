var STOCKCHART;
var SERIES, allData;

function prepareData(data, colorFilter) {
    function groupArrayOfObjByKey(array, key) {
        return array.reduce(function(r, a) {
            r[a[key]] = r[a[key]] || [];
            r[a[key]].push(a);
            return r;
        }, Object.create(null));
    }
    SERIES = [
        { 'seriesName': 'Wall Time', 'seriesData': [] },
        { 'seriesName': 'CPU norm', 'seriesData': [] }
    ];
    var color_filter = (colorFilter === undefined) ? "site" : colorFilter;
    data.forEach(obj => {
        for (var i = 0; i < SERIES.length; i++) { // series[i]
            var series = SERIES[i];
            var tmp_obj = {
                x: obj._time,
                y: obj.wall_time,
                cpu_norm: obj.cpu_norm,
                wall_time: secondsToDhms(obj.wall_time),
                _time: obj._time,
                time: new Date(obj._time),
                site: obj.site,
                user: obj.user,
                job_id: obj.job_id,
                hostname: obj.hostname,
                model: obj.model,
                status: obj.status,
            }
            if (i === 1) {
                tmp_obj['x'] = obj._time;
                tmp_obj['y'] = obj.cpu_norm;
            }
            series.seriesData.push(tmp_obj);
        }
    })
    SERIES.forEach(function(series, i) {
        var grouped = groupArrayOfObjByKey(series.seriesData, color_filter);
        var type = 'scatter';
        var series_data = [];
        for (let key in grouped) {
            var obj = { 'type': type, 'name': key, 'data': grouped[key], 'marker': { 'radius': markerSize } };
            if (i === 1) {
                obj['type'] = "line";
                obj['yAxis'] = 1;
            }
            series_data.push(obj);
        }
        series.seriesData = series_data;
    });
    var seriesData = SERIES.map(s => s.seriesData);
    var SERIES = [];
    seriesData.forEach(array => {
        array.forEach(obj => {
            SERIES.push(obj);
        });
    });
    return SERIES;
}

function drawChart(data = undefined, filters = undefined, startDateTime = undefined, endDateTime = undefined, colorFilter = undefined) {
    if (data === undefined) {
        getDataByFilters(filters, startDateTime, endDateTime, function(data) {
            allData = data;
            if (allData.length > 0) {
                SERIES = prepareData(allData, colorFilter);
            }
            drawStockChart(allData, SERIES);
        });
    } else drawStockChart(allData, data);
}

function drawStockChart(allData, series) {
    series = (series === undefined) ? SERIES : series;
    // create the chart
    STOCKCHART = Highcharts.stockChart('highcharts-container', {
        chart: {
            zoomType: 'xy',
            height: '70%'
        },
        title: {
            text: new Date(allData[0]['_time']).toISOString() + ' - ' + new Date(allData[allData.length - 1]['_time']).toISOString(),
            align: 'left'
        },
        subtitle: {
            text: 'Number of points: ' + allData.length,
            align: 'left'
        },
        rangeSelector: {
            buttons: [{
                type: 'hour',
                count: 1,
                text: '1h'
            }, {
                type: 'day',
                count: 1,
                text: '1d'
            }, {
                type: 'month',
                count: 1,
                text: '1m'
            }, {
                type: 'year',
                count: 1,
                text: '1y'
            }, {
                type: 'all',
                text: 'All'
            }],
            inputEnabled: true,
            selected: 4 // all
        },
        xAxis: {
            type: 'datetime',
            // events: {
            //     afterSetExtremes: afterSetExtremes
            // },
            // min: allData[0]['_time'],
            // max: data[data.length - 1]['_time'],
            // minRange: 1 * 24 * 3600 * 1000 // 1 days
        },
        yAxis: [{
            labels: {
                align: 'right',
            },
            title: {
                text: 'Wall Time (secs)'
            },
            height: '60%',
            lineWidth: markerSize,
            resize: {
                enabled: true
            }
        }, {
            labels: {
                align: 'right',
            },
            title: {
                text: 'CPU norm'
            },
            top: '65%',
            height: '35%',
            offset: 0,
            lineWidth: markerSize
        }],
        legend: {
            enabled: true
        },
        tooltip: {
            pointFormat: "\
                <b>Wall Time</b> {point.wall_time}<br/>\
                <b>CPU norm</b> {point.cpu_norm}<br/>\
                <b>Time</b> {point.time}<br/>\
                <b>Site</b> {point.site}<br/>\
                <b>User</b> {point.user}<br/>\
                <b>Job ID</b> {point.job_id}<br/>\
                <b>Hostname</b> {point.hostname}<br/>\
                <b>Model</b> {point.model}<br/>\
                <b>Status</b> {point.status}\
            ",
            split: false
        },
        plotOptions: {
            series: {
                turboThreshold: 0 // disable threshold
            }
        },
        boost: {
            useGPUTranslations: true,
            usePreAllocated: true
        },
        series: series,
        credits: false
    });
    $('#select_color_filter, #select_marker_size').prop("disabled", false);
}