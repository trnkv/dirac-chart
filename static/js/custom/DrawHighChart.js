var masterChart, detailChart;
var SERIES_DATA = [],
    color_filter;
var legendSymbolSize = 10;

function prepareData(inputData) {
    SERIES_DATA = [];
    if (color_filter === undefined) color_filter = "site";
    inputData.forEach((obj) => {
        for (var i = 0; i < SERIES_DATA.length; i++) {
            if (SERIES_DATA[i].name == obj[color_filter]) {
                SERIES_DATA[i].data.push({
                    id: obj.id,
                    x: obj.cpu_norm + (Math.random() * (0.05 - -0.05 + 1) - 0.05),
                    y: obj.wall_time,
                    _time: obj._time
                });
                // SERIES_DATA[i].marker = { 'radius': Number($("#select_marker_size").val()) };
                return;
            }
        }
        SERIES_DATA.push({
            name: obj[color_filter],
            data: [{
                id: obj.id,
                x: obj.cpu_norm + (Math.random() * (0.05 - -0.05 + 1) - 0.05),
                y: obj.wall_time,
                _time: obj._time
            }],
            // marker: {
            //     radius: Number($("#select_marker_size").val())
            // }
        });
    });
}

function setLegendSymbolSize(size){
    $(detailChart.series).each(function() {
        this.legendItem.symbol.attr('width', size);
        this.legendItem.symbol.attr('height', size);
    });
}

function DrawHighChart(INPUT_DATA, filter) {
    color_filter = (filter === undefined) ? filter = "site" : filter;
    // data_by_color_filter = [...new Set(data.map((obj) => obj[color_filter]))];

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
                text: new Date(INPUT_DATA[0]['_time']).toISOString() + ' - ' + new Date(INPUT_DATA[INPUT_DATA.length - 1]['_time']).toISOString(),
                align: 'left'
            },
            subtitle: {
                text: `Count of point: ${INPUT_DATA.length}`,
                align: 'left'
            },
            legend: {
                enabled: true,
                layout: 'vertical',
                align: 'left',
                verticalAlign: 'top',
                x: 30,
                y: 60,
                borderWidth: 1,
                borderRadius: 5,
                itemMarginTop: 10,
                itemMarginBottom: 10,
                maxHeight: 200,
                // labelFormatter: function () {
                //     return '<span style="color:' + this.color + ';">' + this.name + '</span>';
                // },
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
                // maxZoom: 0.1
            },
            plotOptions: {
                scatter: {
                    marker: {
                        radius: 1, // Number($("#select_marker_size").val())
                        symbol: "circle",
                        states: {
                            hover: {
                                enabled: true,
                                lineColor: "rgb(100,100,100)",
                            },
                        },
                    },
                    states: {
                        inactive: {
                            opacity: 1
                        }
                    },
                },
                series: {
                    turboThreshold: 0,
                },
            },
            tooltip: {
                formatter: function() {
                    var dataPoint = INPUT_DATA.filter(obj => obj.id === this.point.id)[0];
                    return (
                        "<b>CPU norm:</b> " +
                        dataPoint.cpu_norm +
                        "<br>" +
                        "<b>Wall Time:</b> " +
                        secondsToDhms(dataPoint.wall_time) +
                        "<br>" +
                        "<b>Time:</b> " +
                        new Date(dataPoint._time) +
                        "<br>" +
                        "<b>Site:</b> " +
                        dataPoint.site +
                        "<br>" +
                        "<b>User:</b> " +
                        dataPoint.user +
                        "<br>" +
                        "<b>Job_ID:</b> " +
                        dataPoint.job_id +
                        "<br>" +
                        "<b>Hostname:</b> " +
                        dataPoint.hostname +
                        "<br>" +
                        "<b>Model:</b> " +
                        dataPoint.model +
                        "<br>" +
                        "<b>Status:</b> " +
                        dataPoint.status
                    );
                },
            },
            series: SERIES_DATA,
            exporting: {
                enabled: true
            },
            boost: {
                useGPUTranslations: true,
                usePreAllocated: true,
            }
        });
        setLegendSymbolSize(legendSymbolSize);
    }

    // create the master chart
    function createMaster() {
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
                            detailData,
                            xAxis = this.xAxis[0];

                        detailChart.showLoading();

                        // change detailData for detailChart
                        detailData = SERIES_DATA.map(series => {
                            return {...series, data: series.data.filter((obj) => obj._time >= min && obj._time <= max) }
                        });
                        detailData = detailData.filter((series) => series.data.length > 0);

                        // update series in detailChart & redraw
                        while (detailChart.series.length > 0)
                            detailChart.series[0].remove(false);
                        detailData.forEach(series => {
                            series['marker'] = { 'radius': Number($("#select_marker_size").val()) };
                            detailChart.addSeries(series, false);
                        });
                        detailChart.setTitle({ text: new Date(min).toISOString() + ' - ' + new Date(max).toISOString() }, { text: 'Count of points: ' + detailData.reduce(function(sum, series) { return sum + series.data.length; }, 0) }, false);
                        detailChart.redraw();
                        setLegendSymbolSize(legendSymbolSize);
                        detailChart.hideLoading();

                        // move the plot bands to reflect the new detail span
                        xAxis.removePlotBand('mask-before');
                        xAxis.addPlotBand({
                            id: 'mask-before',
                            from: INPUT_DATA[0]['_time'],
                            to: min,
                            color: 'rgba(0, 0, 0, 0.2)'
                        });

                        xAxis.removePlotBand('mask-after');
                        xAxis.addPlotBand({
                            id: 'mask-after',
                            from: max,
                            to: INPUT_DATA[INPUT_DATA.length - 1]['_time'],
                            color: 'rgba(0, 0, 0, 0.2)'
                        });
                        return false;
                    }
                }
            },
            title: {
                text: "Total jobs per hour"
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
                    from: INPUT_DATA[0]['_time'],
                    to: INPUT_DATA[INPUT_DATA.length - 1]['_time'],
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
                pointStart: INPUT_DATA[0]['_time'],
                data: INPUT_DATA.map((obj) => [obj._time, obj.wall_time]) // изменить данные по Y!
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

    // sets SERIES_DATA: objects grouped by colorFilter
    prepareData(INPUT_DATA);

    // create master and in its callback, create the detail chart
    createMaster();

    $('#master-container').css({
        'top': detailChart.chartHeight + "px"
    });
}