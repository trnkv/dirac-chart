var masterChart, detailChart;
var SERIES = [],
    color_filter;

function prepareData(data) {
    SERIES = [];
    if (color_filter === undefined) color_filter = "site";
    data.forEach((obj) => {
        for (var i = 0; i < SERIES.length; i++) {
            if (SERIES[i].name == obj[color_filter]) {
                SERIES[i].data.push({
                    x: obj.cpu_norm,
                    y: obj.wall_time,
                    wall_time: secondsToDhms(obj.wall_time),
                    _time: obj._time,
                    site: obj.site,
                    user: obj.user,
                    job_id: obj.job_id,
                    hostname: obj.hostname,
                    model: obj.model,
                    status: obj.status,
                });
                SERIES[i].marker = { 'radius': markerSize };
                return;
            }
        }
        SERIES.push({
            name: obj[color_filter],
            data: [{
                x: obj.cpu_norm,
                y: obj.wall_time,
                wall_time: secondsToDhms(obj.wall_time),
                _time: obj._time,
                site: obj.site,
                user: obj.user,
                cpu_norm: obj.cpu_norm,
                job_id: obj.job_id,
                hostname: obj.hostname,
                model: obj.model,
                status: obj.status,
            }],
            marker: {
                radius: markerSize
            }
        });
    });
}

function drawHighChart(data, filter) {
    console.log('markerSize: ', markerSize);
    color_filter = (filter === undefined) ? filter = "site" : filter;

    // create the detail chart
    function createDetail(masterChart) {
        // create a detail chart referenced by a global variable
        detailChart = Highcharts.chart('detail-container', {
            chart: {
                marginBottom: 120,
                reflow: false,
                marginLeft: 50,
                marginRight: 20,
                type: "scatter",
                zoomType: "xy",
                height: '60%',
                style: {
                    position: 'absolute'
                }
            },
            credits: {
                enabled: false
            },
            title: {
                text: new Date(data[0]['_time']) + ' - ' + new Date(data[data.length - 1]['_time']),
                align: 'left'
            },
            subtitle: {
                text: 'Select an area by dragging across the lower chart',
                align: 'left'
            },
            xAxis: {
                title: {
                    text: "CPU norm",
                },
                labels: {
                    format: "{value}",
                }
            },
            yAxis: {
                title: {
                    text: "WallTime (secs)",
                },
                labels: {
                    format: "{value}",
                },
                maxZoom: 0.1
            },
            plotOptions: {
                scatter: {
                    marker: {
                        radius: 1,
                        symbol: "circle",
                        states: {
                            hover: {
                                enabled: true,
                                lineColor: "rgb(100,100,100)",
                            },
                        },
                    },
                    states: {
                        hover: {
                            marker: {
                                enabled: false,
                            },
                        },
                    },
                },
                series: {
                    turboThreshold: 0,
                },
            },
            tooltip: {
                formatter: function() {
                    return (
                        "<b>CPU norm:</b> " +
                        this.point.x +
                        "<br>" +
                        "<b>Wall Time:</b> " +
                        this.point.wall_time +
                        "<br>" +
                        "<b>Time:</b> " +
                        new Date(this.point._time) +
                        "<br>" +
                        "<b>Site:</b> " +
                        this.point.site +
                        "<br>" +
                        "<b>User:</b> " +
                        this.point.user +
                        "<br>" +
                        "<b>Job_ID:</b> " +
                        this.point.job_id +
                        "<br>" +
                        "<b>Hostname:</b> " +
                        this.point.hostname +
                        "<br>" +
                        "<b>Model:</b> " +
                        this.point.model +
                        "<br>" +
                        "<b>Status:</b> " +
                        this.point.status
                    );
                },
            },
            series: SERIES,
            exporting: {
                enabled: false
            },
            boost: {
                useGPUTranslations: true,
                usePreAllocated: true,
            }
        });
    }

    // create the master chart
    function createMaster(data) {
        data.forEach(obj => {
            obj['x'] = obj._time;
            obj['y'] = obj.wall_time;
        });
        masterChart = Highcharts.chart('master-container', {
                chart: {
                    reflow: false,
                    borderWidth: 0,
                    backgroundColor: null,
                    marginLeft: 50,
                    marginRight: 20,
                    zoomType: 'x',
                    events: {
                        // listen to the selection event on the master chart to update the
                        // extremes of the detail chart
                        selection: function(event) {
                            var extremesObject = event.xAxis[0],
                                min = extremesObject.min,
                                max = extremesObject.max,
                                detailData = [],
                                xAxis = this.xAxis[0];

                            function ddContainsName(name) {
                                for (let i = 0; i < detailData.length; i++) {
                                    if (detailData[i].name === name) {
                                        return detailData[i];
                                    }
                                }
                                return false;
                            }

                            // change detailData for detailChart
                            var points = this.series[0].data.filter(point => point.x > min && point.x < max);
                            points.forEach(point => { // ИЗ-ЗА ЭТОГО ОЧЕНЬ ДОЛГО ГРУЗИТ!!!
                                SERIES.forEach(element => {
                                    var name = element.name === null ? 'Unknown' : element.name;
                                    var series = ddContainsName(name);
                                    if (series)
                                        element.data.forEach(obj => {
                                            if (obj._time >= point.x && obj._time <= max)
                                                if (!series.data.some(val => (val.x == obj.cpu_norm) && (val.y == obj.wall_time)))
                                                    series.data.push(obj);
                                        });
                                    else {
                                        var tmp_obj = { 'name': name, 'data': [], 'marker': { 'radius': markerSize } };
                                        element.data.forEach(obj => {
                                            if (obj._time >= point.x && obj._time <= max)
                                                tmp_obj.data.push(obj);
                                        });
                                        if (tmp_obj.data.length > 0) detailData.push(tmp_obj);
                                        delete(tmp_obj);
                                    }
                                });
                            });

                            // update series in detailChart
                            while (detailChart.series.length > 0)
                                detailChart.series[0].remove(true);
                            detailData.forEach(obj => {
                                detailChart.addSeries(obj);
                            });

                            // move the plot bands to reflect the new detail span
                            xAxis.removePlotBand('mask-before');
                            xAxis.addPlotBand({
                                id: 'mask-before',
                                from: data[0]['_time'],
                                to: min,
                                color: 'rgba(0, 0, 0, 0.2)'
                            });

                            xAxis.removePlotBand('mask-after');
                            xAxis.addPlotBand({
                                id: 'mask-after',
                                from: max,
                                to: data[data.length - 1]['_time'],
                                color: 'rgba(0, 0, 0, 0.2)'
                            });
                            return false;
                        }
                    }
                },
                title: {
                    text: null
                },
                accessibility: {
                    enabled: false
                },
                xAxis: {
                    type: 'datetime',
                    showLastTickLabel: true,
                    startOnTick: true,
                    endOnTick: true,
                    minRange: 14 * 24 * 3600 * 1000, // fourteen days, убираем 2 нуля - интервал уменьшается до часов
                    plotBands: [{
                        id: 'mask-before',
                        from: data[0]['_time'],
                        to: data[data.length - 1]['_time'],
                        color: 'rgba(0, 0, 0, 0.2)'
                    }],
                    title: {
                        text: null
                    }
                },
                yAxis: {
                    gridLineWidth: 0,
                    labels: {
                        enabled: false
                    },
                    title: {
                        text: null
                    },
                    showFirstLabel: false
                },
                tooltip: {
                    formatter: function() {
                        return '<b>Time:</b>' + Highcharts.dateFormat('%e - %b - %Y', new Date(this.x)) +
                            '<br><b>Wall time:</b> ' + this.y + ' (secs)';
                    }
                },
                legend: {
                    enabled: false
                },
                credits: {
                    enabled: false
                },
                plotOptions: {
                    series: {
                        fillColor: {
                            linearGradient: [0, 0, 0, 70],
                            stops: [
                                [0, Highcharts.getOptions().colors[0]],
                                [1, 'rgba(255,255,255,0)']
                            ]
                        },
                        lineWidth: 1,
                        marker: {
                            enabled: false
                        },
                        shadow: false,
                        states: {
                            hover: {
                                lineWidth: 1
                            }
                        },
                        enableMouseTracking: true
                    }
                },
                series: [{
                    type: 'area',
                    name: 'Time',
                    pointInterval: 30 * 24 * 3600 * 1000, // 1 сутки
                    pointStart: data[0]['_time'],
                    data: data.map((obj) => [obj._time, obj.wall_time])
                }],
                exporting: {
                    enabled: false
                },
                boost: {
                    useGPUTranslations: true,
                    usePreAllocated: true,
                }
            },
            masterChart => {
                createDetail(masterChart);
            }); // return chart instance
    }

    // make the container smaller and add a second container for the master chart
    $('#highcharts-container').html('<div id="detail-container"></div><div id="master-container"></div>');

    $('#select_color_filter, #select_marker_size').prop("disabled", false);

    prepareData(data);
    console.log('prepared: ', SERIES);

    // create master and in its callback, create the detail chart
    createMaster(data);

    $('#master-container').css({
        'height': '100px',
        'width': '100%',
        'margin-top': $("#detail-container .highcharts-container").height()
    });
}