var masterChart, detailChart;
var SERIES_DATA = [],
    color_filter;
var legendSymbolSize = 10;

function prepareData(inputData) {
    SERIES_DATA = [];
    if (color_filter === undefined) color_filter = $("#select_color_filter").val();
    inputData.forEach((obj) => {
        for (var i = 0; i < SERIES_DATA.length; i++) {
            if (SERIES_DATA[i].name == obj[color_filter]) {
                SERIES_DATA[i].data.push({
                    id: obj.id,
                    x: obj.cpu_norm + (Math.random() * (0.05 - -0.05 + 1) - 0.05),
                    y: obj.wall_time,
                    start_time: obj.start_time
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
                start_time: obj.start_time
            }],
            // marker: {
            //     radius: Number($("#select_marker_size").val())
            // }
        });
    });
}

function setLegendSymbolSize(size) {
    $(detailChart.series).each(function() {
        this.legendItem.symbol.attr('width', size);
        this.legendItem.symbol.attr('height', size);
    });
}

function msFormat(milliseconds) {
    if (milliseconds !== 'undefined')
        return Highcharts.dateFormat('%e %b %Y, %H:%M:%S', new Date(milliseconds));
    return milliseconds;
}

function DrawHighChart(INPUT_DATA, filter) {
    color_filter = (filter === undefined) ? filter = "site" : filter;
    // data_by_color_filter = [...new Set(data.map((obj) => obj[color_filter]))];

    Highcharts.setOptions({
        time: {
            useUTC: true,
        }
    });

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
                text: msFormat(INPUT_DATA[0]['start_time']) + ' - ' + msFormat(INPUT_DATA[INPUT_DATA.length - 1]['start_time']),
                align: 'left'
            },
            subtitle: {
                text: `Count of points: <b>${INPUT_DATA.length}</b>`,
                align: 'left'
            },
            legend: {
                enabled: true,
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                layout: 'vertical',
                align: 'left',
                verticalAlign: 'top',
                x: 50,
                y: 60,
                borderWidth: 1,
                borderRadius: 5,
                itemMarginTop: 10,
                itemMarginBottom: 10,
                maxHeight: 200,
                floating: true,
                draggable: true,
                title: {
                    text: ':: Drag me'
                },
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
                    formatter: function() {
                        return this.value/1000 + "K"
                    },
                    x: 5
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
                        "<b>CPU norm:</b> " + dataPoint.cpu_norm + "<br>" +
                        "<b>Wall Time:</b> " + secondsToDhms(dataPoint.wall_time) + "<br>" +
                        "<b>Start Time:</b> " + msFormat(dataPoint.start_time) + "<br>" +
                        "<b>End Time:</b> " + msFormat(dataPoint.end_time) + "<br>" +
                        "<b>Total Time:</b> " + secondsToDhms(dataPoint.total_time) + "<br>" +
                        "<b>CPU Time:</b> " + secondsToDhms(dataPoint.cpu_time) + "<br>" +
                        "<b>CPU MHz:</b> " + msFormat(dataPoint.cpu_mhz) + "<br>" +
                        "<b>Site:</b> " + dataPoint.site + "<br>" +
                        "<b>Owner:</b> " + dataPoint.owner + "<br>" +
                        "<b>Job ID:</b> " + dataPoint.job_id + "<br>" +
                        "<b>Job Name:</b> " + dataPoint.job_name + "<br>" +
                        "<b>Job Group:</b> " + dataPoint.job_group + "<br>" +
                        "<b>Hostname:</b> " + dataPoint.hostname + "<br>" +
                        "<b>CPU model:</b> " + dataPoint.cpu_model + "<br>" +
                        "<b>Memory:</b> " + dataPoint.memory + "<br>" +
                        "<b>Memory Used:</b> " + dataPoint.memory_used + "<br>" +
                        "<b>Status:</b> " + dataPoint.status
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
                            try {
                                var extremesObject = event.xAxis[0];
                            } catch (e){
                                var extremesObject = event.target.axes[0];
                                this.xAxis[0].setExtremes(
                                    totalJobsPerHour[0][0],
                                    totalJobsPerHour[totalJobsPerHour.length - 1][0]
                                );
                            }
                            var min = extremesObject.min,
                                max = extremesObject.max,
                                detailData,
                                xAxis = this.xAxis[0];

                            detailChart.showLoading();

                            // change detailData for detailChart
                            detailData = SERIES_DATA.map(series => {
                                return {...series, data: series.data.filter((obj) => obj.start_time >= min && obj.start_time <= max) }
                            });
                            detailData = detailData.filter((series) => series.data.length > 0);

                            // update series in detailChart & redraw
                            while (detailChart.series.length > 0)
                                detailChart.series[0].remove(false);
                            detailData.forEach(series => {
                                series['marker'] = { 'radius': Number($("#select_marker_size").val()) };
                                detailChart.addSeries(series, false);
                            });
                            detailChart.setTitle({ text: msFormat(min) + ' - ' + msFormat(max) }, { text: 'Count of points: <b>' + detailData.reduce(function(sum, series) { return sum + series.data.length; }, 0) + '</b>' }, false);
                            detailChart.redraw();
                            setLegendSymbolSize(legendSymbolSize);
                            detailChart.hideLoading();

                            // move the plot bands to reflect the new detail span
                            xAxis.removePlotBand('mask-before');
                            xAxis.addPlotBand({
                                id: 'mask-before',
                                from: totalJobsPerHour[0][0],
                                to: min,
                                color: 'rgba(0, 0, 0, 0.2)'
                            });

                            xAxis.removePlotBand('mask-after');
                            xAxis.addPlotBand({
                                id: 'mask-after',
                                from: max,
                                to: totalJobsPerHour[totalJobsPerHour.length - 1][0],
                                color: 'rgba(0, 0, 0, 0.2)'
                            });

                            xAxis.setExtremes(min, max);
                            this.showResetZoom();

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
                    min: totalJobsPerHour[0][0],
                    max: totalJobsPerHour[totalJobsPerHour.length - 1][0],
                    showLastTickLabel: true,
                    startOnTick: true,
                    endOnTick: true,
                    minRange: 3600 * 1000, // 1 hour
                    plotBands: [{
                        id: 'mask-before',
                        from: totalJobsPerHour[0][0],
                        to: totalJobsPerHour[totalJobsPerHour.length - 1][0],
                        color: 'rgba(0, 0, 0, 0.2)'
                    }],
                    title: {
                        text: null
                    },
                    events: {
                        setExtremes: function(e) {
                            // console.log('e', e);
                            if (typeof e.min == 'undefined' && typeof e.max == 'undefined') {
                                // console.log('ZOOM OUT');
                            }
                        }
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
                        return '<b>Time:</b>' + msFormat(this.x) +
                            '<br><b>Jobs count:</b> ' + this.y;
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
                    type: 'spline',
                    name: 'Total jobs per hour',
                    pointInterval: 3600 * 1000, // 1 час
                    pointStart: totalJobsPerHour[0][0],
                    data: totalJobsPerHour
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

    totalJobsPerHour = getTotalJobs(INPUT_DATA);

    // create master and in its callback, create the detail chart
    createMaster();

    $('#master-container').css({
        'top': detailChart.chartHeight + "px"
    });
}