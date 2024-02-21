function prepareData(inputData, colorBy) {
    var SERIES_DATA = [];
    inputData.forEach((obj) => {
        for (var i = 0; i < SERIES_DATA.length; i++) {
            if (SERIES_DATA[i].name == obj[colorBy]) {
                SERIES_DATA[i].data.push({
                    job_id: obj.job_id,
                    x: obj.cpu_norm + Math.random() * 0.1 - 0.05,
                    y: obj.wall_time,
                    start_time: obj.start_time
                });
                return;
            }
        }
        SERIES_DATA.push({
            name: obj[colorBy],
            data: [{
                job_id: obj.job_id,
                x: obj.cpu_norm + Math.random() * 0.1 - 0.05,
                y: obj.wall_time,
                start_time: obj.start_time
            }],
        });
    });
    return SERIES_DATA;
}

function msFormat(milliseconds) {
    if (milliseconds !== 'undefined')
        return Highcharts.dateFormat('%e %b %Y, %H:%M:%S', new Date(milliseconds));
    return milliseconds;
}

// ======================================= main function =======================================
function DrawHighChart(app, INPUT_DATA, markerSize, color_filter) {

    Highcharts.setOptions({
        time: {
            useUTC: true,
        }
    });

    // create the detail chart
    function createDetail(masterChart, dataForDetail) {
        // create a detail chart referenced by a global variable
        var detailChart = Highcharts.chart('detail-container', {
            chart: {
                marginBottom: 120,
                marginLeft: 50,
                marginRight: 20,
                type: "scatter",
                zoomType: "xy",
                height: '50%',
                events: {
                    selection: function (event) {
                        // console.log(event);

                        var min_start_time = masterChart.series[0].data[0].x,
                            max_start_time = masterChart.series[0].data[masterChart.series[0].data.length - 1].x;

                        var detailedData = dataForDetail.map(series => series.data).reduce((accumulator, currentArray) => {
                            return accumulator.concat(currentArray);
                        }, [])
                        var min_x_limit = detailedData.sort((a, b) => a.x - b.x)[0].x,
                            max_x_limit = detailedData.sort((a, b) => a.x - b.x).findLast((element) => element).x,
                            min_y_limit = detailedData.sort((a, b) => a.y - b.y)[0].y,
                            max_y_limit = detailedData.sort((a, b) => a.y - b.y).findLast((element) => element).y;

                        var minX, maxX, minY, maxY;

                        if (!('resetSelection' in event)) {
                            minX = event.xAxis[0].min;
                            maxX = event.xAxis[0].max;
                            minY = event.yAxis[0].min;
                            maxY = event.yAxis[0].max;
                            if (!this.resetZoomButton) this.showResetZoom();
                        }
                        else {
                            minX = min_x_limit;
                            maxX = max_x_limit;
                            minY = min_y_limit;
                            maxY = max_y_limit;
                        }

                        // console.log(minX, maxX);
                        // console.log(minY, maxY);

                        var zoomedSeriesData = dataForDetail.map(series => {
                            return {
                                ...series, data: series.data.filter((obj) =>
                                    obj.x >= minX &&
                                    obj.x <= maxX &&
                                    obj.y >= minY &&
                                    obj.y <= maxY
                                )
                            }
                        });
                        // console.log(zoomedSeriesData);

                        var zoomedData = zoomedSeriesData.map(series => series.data).reduce((accumulator, currentArray) => {
                            return accumulator.concat(currentArray);
                        }, []);
                        // console.log(zoomedData);
                        var newTotalJobsPerHour = getTotalJobs(zoomedData);
                        // console.log(newTotalJobsPerHour);

                        var zoomedMinStartTime = newTotalJobsPerHour[0][0],
                            zoomedMaxStartTime = newTotalJobsPerHour[newTotalJobsPerHour.length - 1][0];
                        // console.log(zoomedMinStartTime);
                        // console.log(zoomedMaxStartTime);

                        // move the plot bands to reflect the new detail span
                        masterChart.axes[0].removePlotBand('mask-before');
                        masterChart.axes[0].addPlotBand({
                            id: 'mask-before',
                            from: min_start_time,
                            to: zoomedMinStartTime,
                            color: 'rgba(0, 0, 0, 0.2)'
                        });

                        masterChart.axes[0].removePlotBand('mask-after');
                        masterChart.axes[0].addPlotBand({
                            id: 'mask-after',
                            from: zoomedMaxStartTime,
                            to: max_start_time,
                            color: 'rgba(0, 0, 0, 0.2)'
                        });

                        masterChart.axes[0].setExtremes(zoomedMinStartTime, zoomedMaxStartTime);

                        app.View.setChartTitle(msFormat(zoomedMinStartTime), msFormat(zoomedMaxStartTime), zoomedSeriesData);
                        app.View.resetDataTable();
                        app.View.drawDataTable(zoomedSeriesData);
                    }
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
                align: 'center',
                style: {
                    fontWeight: 'bold',
                    fontSize: '1em'
                }
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
                    text: "DB12 value",
                },
                labels: {
                    format: "{value}",
                },
            },
            yAxis: {
                title: {
                    text: "WallTime (secs)",
                },
                labels: {
                    formatter: function () {
                        return this.value / 1000 + "K"
                    },
                    x: 5
                },
                // maxZoom: 0.1
            },
            plotOptions: {
                scatter: {
                    marker: {
                        radius: markerSize,
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
                formatter: function () {
                    var dataPoint = INPUT_DATA.filter(obj => obj.job_id === this.point.job_id)[0];
                    return (
                        "<b>CPU norm:</b> " + dataPoint.cpu_norm + "<br>" +
                        "<b>Wall Time:</b> " + secondsToDhms(dataPoint.wall_time) + "<br>" +
                        "<b>Start Time:</b> " + msFormat(dataPoint.start_time) + "<br>" +
                        "<b>End Time:</b> " + msFormat(dataPoint.end_time) + "<br>" +
                        // "<b>Total Time:</b> " + secondsToDhms(dataPoint.total_time) + "<br>" +
                        // "<b>CPU Time:</b> " + secondsToDhms(dataPoint.cpu_time) + "<br>" +
                        // "<b>CPU MHz:</b> " + msFormat(dataPoint.cpu_mhz) + "<br>" +
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
            series: dataForDetail,
            exporting: {
                enabled: true
            },
            boost: {
                useGPUTranslations: true,
                usePreAllocated: true,
            },
            exporting: {
                sourceWidth: 1920,
                sourceHeight: 1080,
                // scale: 2 (default)
                // chartOptions: {
                //     subtitle: null
                // }
            }
        });
        app.Controller.setDetailChart(detailChart);
        app.View.setLegendSymbolSize(app.Configuration.legendSymbolSize);
    }

    // create the master chart
    function createChart(dataForMaster, dataForDetail) {
        var masterChart = Highcharts.chart('master-container', {
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
                    selection: function (event) {
                        try {
                            var extremesObject = event.xAxis[0];
                            if (!this.resetZoomButton) this.showResetZoom();
                        } catch (e) {
                            var extremesObject = event.target.axes[0];
                            this.xAxis[0].setExtremes(
                                dataForMaster[0][0],
                                dataForMaster[dataForMaster.length - 1][0]
                            );
                            if (this.resetZoomButton) this.resetZoomButton = null;
                        }
                        var min = extremesObject.min,
                            max = extremesObject.max,
                            detailChart = app.Model.detailChart,
                            detailData,
                            xAxis = this.xAxis[0];

                        // console.log(xAxis);

                        detailChart.showLoading();

                        // change detailData for detailChart
                        detailData = dataForDetail.map(series => {
                            return { ...series, data: series.data.filter((obj) => obj.start_time >= min && obj.start_time <= max) }
                        });
                        detailData = detailData.filter((series) => series.data.length > 0);
                        // console.log(detailData);

                        // update series in detailChart & redraw
                        while (detailChart.series.length > 0)
                            detailChart.series[0].remove(false);
                        detailData.forEach(series => {
                            series['marker'] = { 'radius': Number($("#select_marker_size").val()) };
                            detailChart.addSeries(series, false);
                        });
                        app.View.setChartTitle(msFormat(min), msFormat(max), detailData);
                        detailChart.redraw();
                        app.View.setLegendSymbolSize(app.Configuration.legendSymbolSize);
                        detailChart.hideLoading();

                        // move the plot bands to reflect the new detail span
                        xAxis.removePlotBand('mask-before');
                        xAxis.addPlotBand({
                            id: 'mask-before',
                            from: dataForMaster[0][0],
                            to: min,
                            color: 'rgba(0, 0, 0, 0.2)'
                        });

                        xAxis.removePlotBand('mask-after');
                        xAxis.addPlotBand({
                            id: 'mask-after',
                            from: max,
                            to: dataForMaster[dataForMaster.length - 1][0],
                            color: 'rgba(0, 0, 0, 0.2)'
                        });

                        xAxis.setExtremes(min, max);

                        app.View.resetDataTable();
                        app.View.drawDataTable(INPUT_DATA.filter(obj => obj.start_time >= min && obj.start_time <= max), colorBy);

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
                min: dataForMaster[0][0],
                max: dataForMaster[dataForMaster.length - 1][0],
                showLastTickLabel: true,
                startOnTick: true,
                endOnTick: true,
                minRange: 3600 * 1000, // 1 hour
                plotBands: [{
                    id: 'mask-before',
                    from: dataForMaster[0][0],
                    to: dataForMaster[dataForMaster.length - 1][0],
                    color: 'rgba(0, 0, 0, 0.2)'
                }],
                title: {
                    text: null
                },
                events: {
                    setExtremes: function (e) {
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
                formatter: function () {
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
                pointStart: dataForMaster[0][0],
                data: dataForMaster
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
                createDetail(masterChart, dataForDetail);
            }); // return chart instance
        app.Controller.setMasterChart(masterChart);
    }

    // console.log(INPUT_DATA);

    // make the container smaller and add a second container for the master chart
    $('#highcharts-container').html('<div id="detail-container"></div><div id="master-container"></div>');

    $('#select_color_filter, #select_marker_size').prop("disabled", false);

    var colorBy = (color_filter === undefined || color_filter === null) ? $("#select_colorBy").val() : color_filter;

    var series = prepareData(INPUT_DATA, colorBy);

    var totalJobsPerHour = getTotalJobs(INPUT_DATA);

    // create master and in its callback, create the detail chart
    createChart(totalJobsPerHour, series);

    $('#master-container').css({
        'top': app.Model.detailChart.chartHeight + "px"
    });
}
// =============================================================================================