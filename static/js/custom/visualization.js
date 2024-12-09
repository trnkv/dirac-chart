let DiracChart_Visualization = function(app) {
    let vis = this;

    this.StartVis = function(data) {
        this.Controller.initiateVis(data);
    };

    this.Configuration = {
            markerSize: 1.0,
            legendSymbolSize: 10,
            y_value: $("#select_y_value").val(),
            colorBy: $("#select_colorBy").val(),
            useUTC: true,
        },

        this.Utils = {
            useUTC: function(flag) {
                Highcharts.setOptions({
                    time: {
                        useUTC: flag,
                    }
                });
            },
            secondsToDhms: function(seconds) {
                if (seconds) {
                    seconds = Number(seconds);
                    const d = Math.floor(seconds / (3600 * 24));
                    const h = Math.floor(seconds % (3600 * 24) / 3600);
                    const m = Math.floor(seconds % 3600 / 60);
                    const s = Math.floor(seconds % 60);

                    const dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
                    const hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
                    const mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
                    const sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
                    return dDisplay + hDisplay + mDisplay + sDisplay;
                }
                return seconds;
            },
            msFormat: function(milliseconds) {
                // if (milliseconds)
                return Highcharts.dateFormat('%e %b %Y, %H:%M:%S', new Date(milliseconds));
                // return milliseconds;
            }
        },

        this.Model = {
            app: app,
            data: null,
            detailChart: null,
            masterChart: null,
            dataForDetailChart: undefined,
            dataForMasterChart: undefined,
            zoomedDataForDetailChart: undefined,
            zoomedDataForMasterChart: undefined,
            dataForDurationChart: undefined,
            //dataForDurationCountChart: undefined,
            y_value: null,
            colorBy: null,
            markerSize: 0.1,

            initiateModel: function() {
                this.y_value = vis.Configuration.y_value;
                this.colorBy = vis.Configuration.colorBy;
                this.markerSize = vis.Configuration.markerSize;
                this.recent_actions = [];
            },

            setData: function(data) {
                this.data = data;
                this.dataForDetailChart = this.initDataForDetailChart(this.data);
                this.dataForMasterChart = this.initDataForMasterChart(this.data);
                this.zoomedDataForDetailChart = JSON.parse(JSON.stringify(this.dataForDetailChart));
                this.zoomedDataForMasterChart = JSON.parse(JSON.stringify(this.dataForMasterChart));
                this.dataForDurationChart = this.initDataForDurationChart(this.data);
                //this.dataForDurationCountChart = this.initDataForDurationCountChart(this.data);
            },

            reset: function() {
                this.app = null;
                this.data = null;
                this.y_value = null;
                this.colorBy = null;
                this.markerSize = 0.1;
                this.detailChart = null;
                this.masterChart = null;
                this.dataForMasterChart = undefined;
                this.dataForDetailChart = undefined;
                this.zoomedDataForDetailChart = undefined;
                this.zoomedDataForMasterChart = undefined;
                this.dataForDurationChart = undefined;
            },

            initDataForDetailChart: function(inputData) {
                let seriesData = [];
                inputData.forEach((obj) => {
                    for (var i = 0; i < seriesData.length; i++) {
                        if (seriesData[i].name == obj[vis.Model.colorBy]) {
                            if (vis.Model.y_value === "diracWT") {
                                seriesData[i].data.push({
                                    job_id: obj.job_id,
                                    x: obj.cpu_norm + Math.random() * 0.1 - 0.05,
                                    y: obj.wall_time,
                                    start_time: obj.start_time
                                });
                            } else if (vis.Model.y_value === "realWT") {
                                seriesData[i].data.push({
                                    job_id: obj.job_id,
                                    x: obj.cpu_norm + Math.random() * 0.1 - 0.05,
                                    y: Date.parse(obj.end_time) - obj.start_time,
                                    start_time: obj.start_time
                                });
                            } else {
                                seriesData[i].data.push({
                                    job_id: obj.job_id,
                                    x: obj.cpu_norm + Math.random() * 0.1 - 0.05,
                                    y: (Date.parse(obj.end_time) - obj.start_time) / obj.cpu_time,
                                    start_time: obj.start_time
                                });
                            }
                            return;
                        }
                    }
                    seriesData.push({
                        name: obj[vis.Model.colorBy],
                        data: [{
                            job_id: obj.job_id,
                            x: obj.cpu_norm + Math.random() * 0.1 - 0.05,
                            y: obj.wall_time,
                            start_time: obj.start_time
                        }],
                    });
                });
                return seriesData;
            },

            initDataForMasterChart: function(inputData) {
                //console.log(inputData);
                const start = Date.now();
                let result = {},
                    allData = inputData.slice(),
                    jobs = [];

                allData.forEach(obj => {
                    var y = 'wall_time' in obj ? 'wall_time' : 'y';
                    jobs.push([obj.start_time, Math.trunc(obj.start_time + obj[y] * 1000)])
                });

                jobs.sort(function(a, b) { return a[0] - b[0] });
                //console.log(jobs);

                let running_at_time = {};
                let stop_times = [];
                let current = 0;

                for (let i = 0; i < jobs.length; i++) {
                    const start = jobs[i][0];
                    const stop = jobs[i][1];

                    while ((stop_times.length !== 0) && (start > stop_times[0])) {
                        current -= 1;
                        running_at_time[stop_times[0]] = current;
                        stop_times.shift();
                    }

                    current += 1;
                    running_at_time[start] = current;
                    stop_times.push(stop);
                    stop_times.sort(function(a, b) { return a - b });
                }
                for (let i = 0; i < stop_times.length; i++) {
                    const stop = stop_times[i];
                    current -= 1;
                    running_at_time[stop] = current;
                }
                //console.log(Object.keys(running_at_time).length)
                //console.log(running_at_time);

                result = Object.entries(running_at_time);
                result = result.map(pair => [parseInt(pair[0]), pair[1]]);
                result.sort(function(a, b) { return a[0] - b[0] });
                //console.log(result);
                //console.log(result.length);

                if (result.length > 0) {
                    let current_hour_start = Math.floor(result[0][0] / 60 / 60 / 1000) * 60 * 60 * 1000,
                        current_hour_end = current_hour_start + 60 * 60 * 1000,
                        current_hour_max_value = 0,
                        result_data = {};

                    for (let i = 0; i < result.length; i++) {
                        if (result[i][0] < current_hour_end) {
                            current_hour_max_value = Math.max(result[i][1], current_hour_max_value);
                            // !!! в result_data никогда ничего не кладётся 
                        } else {
                            // result_data.push([current_hour_start, current_hour_max_value]);
                            current_hour_start = Math.floor(result[i][0] / 60 / 60 / 1000) * 60 * 60 * 1000;
                            current_hour_end = current_hour_start + 60 * 60 * 1000;
                            current_hour_max_value = result[i][1];
                        }
                        result_data[current_hour_start] = current_hour_max_value;
                    }
                    // console.log(result_data);
                    // result_data = result_data.map(pair => [pair[0], pair[1]]);
                    result_data = Object.keys(result_data).map((key) => [Number(key), result_data[key]]);
                    //console.log(result_data);
                    //IGOR
                    //This code is supposed to add 0 values. Issue appears when we suddensly stop jobs and suddenly start jobs. In that case in master chart there will be a line not equal to 0 when it should be 0.
                    var min_time = result_data[0][0];
                    var max_time = result_data[result_data.length - 1][0];
                    result_data.unshift([min_time - 3600000, 0]);
                    result_data.push([max_time + 3600000, 0]);

                    var index = 1;
                    var lastTime = result_data[0][0];
                    while (index < result_data.length) {
                        if (result_data[index][0] - 3600000 == lastTime) {
                            lastTime = result_data[index][0]
                            index += 1;
                            continue;
                        }
                        if (result_data[index][0] - 3600000 > lastTime) {
                            result_data.splice(index, 0, [lastTime + 3600000, 0]);
                            lastTime = lastTime + 3600000;
                            index += 1;
                            if (result_data[index][0] - 3600000 != lastTime) {
                                result_data.splice(index, 0, [result_data[index][0] - 3600000, 0]);
                                lastTime = result_data[index][0] - 3600000;
                                index += 1;
                            }
                            continue;
                        }
                    }
                    const end = Date.now();
                    console.log(`Time to initDataForMasterChart: ${end - start} ms`);

                    //IGOR
                    return result_data;
                }
                return result;
            },

            initDataForDurationChart: function(inputData) {
                let groupMap = {},
                    groupBy = vis.Model.colorBy,
                    result = {};

                // Группируем объекты по colorBy
                inputData.forEach(obj => {
                    const groupName = obj[groupBy];
                    if (groupName !== undefined) {
                        if (!groupMap[groupName]) {
                            groupMap[groupName] = [];
                        }
                        groupMap[groupName].push(obj);
                    }
                });

                // console.log(groupMap);

                for (const groupName in groupMap) {
                    if (!result[groupName]) {
                        result[groupName] = {};
                    };
                    groupMap[groupName].forEach(obj => {
                        let duration;
                        if (vis.Model.y_value === "diracWT") {
                            duration = obj.wall_time;
                        } else if (vis.Model.y_value === "realWT") {
                            duration = Date.parse(obj.end_time) - obj.start_time;
                        } else {
                            duration = (Date.parse(obj.end_time) - obj.start_time) / obj.cpu_time;
                        }
                        if (duration !== undefined) {
                            result[groupName][duration] = (result[groupName][duration] || 0) + 1;
                        }
                    });
                }
                // console.log(result);
                return result;
            },

            // не используем
            // initDataForDurationCountChart: function(inputData) {
            //     const grouped = inputData.reduce((acc, item) => {
            //         const key = item[vis.Model.colorBy];
            //         const wallTime = item.wall_time;

            //         if (!acc[wallTime]) {
            //             acc[wallTime] = {};
            //         }

            //         if (!acc[wallTime][key]) {
            //             acc[wallTime][key] = 0;
            //         }

            //         acc[wallTime][key] += 1;

            //         return acc;
            //     }, {});

            //     const result = [];

            //     // Получаем все уникальные значения wall_time
            //     const wallTimes = Object.keys(grouped);

            //     // Получаем все уникальные значения vis.Model.colorBy (например, 'site')
            //     const uniqueKeys = [...new Set(inputData.map(item => item[vis.Model.colorBy]))];

            //     // Формируем результирующий массив
            //     uniqueKeys.forEach(name => {
            //         const dataPoints = wallTimes.map(wallTime => {
            //             return grouped[wallTime][name] || 0; // Если нет записей, то 0
            //         });

            //         result.push({ name, data: dataPoints });
            //     });

            //     return result;
            // }
        },

        this.View = {
            initiateView: function() {
                vis.Utils.useUTC(vis.Configuration.useUTC);
                $('#masterdetail-container').html('<div id="detail-container"></div><div id="master-container"></div>');
                $('#select_color_filter, #select_marker_size').prop("disabled", false);
                $('#select_marker_size').val(vis.Configuration.markerSize);
                vis.View.displayMarkerSize(vis.Configuration.markerSize);

                $("#select_marker_size").on('input', function() {
                    vis.View.displayMarkerSize((Number($(this).val())).toFixed(1));
                });
                $("#select_marker_size").on('change', function() {
                    vis.Model.app.Controller.recordRecentAction($(this));
                    vis.Controller.markerSize_Changed(Number($(this).val()));
                });
                vis.Controller.setColorBy(vis.Configuration.colorBy);

                $("#select_y_value").on('change', function() {
                    vis.Model.app.Controller.recordRecentAction($(this));
                    vis.Controller.y_value_Changed($(this).val());
                });

                $("#select_colorBy").on('change', function() {
                    vis.Model.app.Controller.recordRecentAction($(this));
                    vis.Controller.colorBy_Changed($(this).val());
                });
            },

            drawChart: function() {
                this.createMasterDetailChart();
                this.createDurationChart();
                //this.createDurationCountChart();
                vis.Model.app.View.resetDataTable();
                vis.Model.app.View.drawDataTable(vis.Model.zoomedDataForDetailChart);
                $('#master-container').css({
                    'top': vis.Model.detailChart.chartHeight + "px"
                });
            },

            createDetailChart: function(masterChart) {
                const dataForDetail = vis.Model.zoomedDataForDetailChart.map(series => series.data).reduce((accumulator, currentArray) => {
                    return accumulator.concat(currentArray);
                }, []);
                let detailChart = Highcharts.chart('detail-container', {
                    chart: {
                        marginBottom: 120,
                        marginLeft: 50,
                        marginRight: 20,
                        type: "scatter",
                        zoomType: "xy",
                        height: '50%',
                        zooming: {
                            resetButton: {
                                theme: {
                                    fill: 'white',
                                    stroke: 'silver',
                                    states: {
                                        hover: {
                                            fill: '#41739D',
                                            style: {
                                                color: 'white'
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        events: {
                            render: function() {
                                this.showResetZoom();
                            },
                            selection: function(event) {
                                this.showLoading();
                                const min_start_time = vis.Model.zoomedDataForMasterChart[0][0],
                                    max_start_time = vis.Model.zoomedDataForMasterChart[vis.Model.zoomedDataForMasterChart.length - 1][0];
                                let minX, maxX, minY, maxY, newZoomedSeriesData;

                                if (!('resetSelection' in event)) {
                                    minX = event.xAxis[0].min;
                                    maxX = event.xAxis[0].max;
                                    minY = event.yAxis[0].min;
                                    maxY = event.yAxis[0].max;
                                    newZoomedSeriesData = JSON.parse(JSON.stringify(vis.Model.zoomedDataForDetailChart.map(series => {
                                        return {
                                            ...series,
                                            data: series.data.filter((obj) =>
                                                obj.x >= minX &&
                                                obj.x <= maxX &&
                                                obj.y >= minY &&
                                                obj.y <= maxY
                                            )
                                        }
                                    })));
                                } else {
                                    newZoomedSeriesData = JSON.parse(JSON.stringify(vis.Model.dataForDetailChart));
                                }
                                // console.log(minX, maxX, minY, maxY);

                                vis.Controller.changeZoomedDataForDetailChart(newZoomedSeriesData);

                                // change data for detailChart & redraw
                                while (this.series.length > 0)
                                    this.series[0].remove(false);
                                newZoomedSeriesData.forEach(series => {
                                    series['marker'] = { 'radius': vis.Model.markerSize };
                                    this.addSeries(series, false);
                                });

                                const newZoomedData = newZoomedSeriesData.map(series => series.data).reduce((accumulator, currentArray) => {
                                    return accumulator.concat(currentArray);
                                }, []);
                                const newTotalJobsPerHour = vis.Model.initDataForMasterChart(newZoomedData);

                                if (newTotalJobsPerHour.length > 0) {
                                    const zoomedMinStartTime = newTotalJobsPerHour[0][0],
                                        zoomedMaxStartTime = newTotalJobsPerHour[newTotalJobsPerHour.length - 1][0];

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

                                    masterChart.series[0].setData(newTotalJobsPerHour);
                                    vis.Controller.changeZoomedDataForMasterChart(newTotalJobsPerHour);

                                    vis.View.setChartTitle(vis.Utils.msFormat(zoomedMinStartTime), vis.Utils.msFormat(zoomedMaxStartTime), newZoomedData.length);
                                    this.redraw();
                                    masterChart.redraw();
                                    vis.View.setLegendSymbolSize(vis.Configuration.legendSymbolSize);
                                    this.hideLoading();

                                    vis.Model.app.View.resetDataTable();
                                    vis.Model.app.View.drawDataTable(newZoomedSeriesData);
                                } else {
                                    vis.View.setChartTitle(null, null, 0);
                                    vis.Model.app.View.resetDataTable();
                                    this.hideLoading();
                                }
                            },
                            redraw: function() {
                                const chart = this,
                                    each = Highcharts.each;
                                each(chart.series, function(s, i) {
                                    each(s.points, function(p, j) {
                                        if (p.graphic) {
                                            p.graphic.css({
                                                'marker': {
                                                    'raduis': vis.Model.markerSize
                                                }
                                            })
                                        }
                                    })
                                })
                            }
                        }
                    },
                    credits: {
                        enabled: false
                    },
                    title: {
                        text: vis.Utils.msFormat(dataForDetail[0]['start_time']) + ' - ' + vis.Utils.msFormat(dataForDetail[dataForDetail.length - 1]['start_time']),
                        align: 'left'
                    },
                    subtitle: {
                        text: `Count of points: <b>${dataForDetail.length}</b>`,
                        align: 'center',
                        style: {
                            fontWeight: 'bold',
                            fontSize: '1em'
                        }
                    },
                    xAxis: {
                        title: {
                            text: "DB12 value",
                        },
                        labels: {
                            format: "{value}",
                            zIndex: 6
                        },
                    },
                    yAxis: {
                        title: {
                            text: $("#select_y_value option:selected").text() + " (secs)",
                        },
                        labels: {
                            formatter: function() {
                                if (this.value > 1000000) return this.value / 1000000 + "M"
                                return this.value / 1000 + "K"
                            },
                            x: 5,
                            zIndex: 6
                        },
                        // maxZoom: 0.1
                    },
                    plotOptions: {
                        scatter: {
                            marker: {
                                radius: vis.Model.markerSize,
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
                            const dataPoint = vis.Model.data.filter(obj => obj.job_id === this.point.job_id)[0];
                            return (
                                "<b>CPU norm:</b> " + dataPoint.cpu_norm + "<br>" +
                                "<b>Wall Time:</b> " + vis.Utils.secondsToDhms(dataPoint.wall_time) + "<br>" +
                                "<b>Start Time:</b> " + vis.Utils.msFormat(dataPoint.start_time) + "<br>" +
                                "<b>End Time:</b> " + vis.Utils.msFormat(dataPoint.end_time) + "<br>" +
                                // "<b>Total Time:</b> " + secondsToDhms(dataPoint.total_time) + "<br>" +
                                // "<b>CPU Time:</b> " + secondsToDhms(dataPoint.cpu_time) + "<br>" +
                                // "<b>CPU MHz:</b> " + vis.Utils.msFormat(dataPoint.cpu_mhz) + "<br>" +
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
                    series: vis.Model.zoomedDataForDetailChart,
                    legend: {
                        backgroundColor: "rgba(255, 255, 255, 0.5)",
                        layout: 'vertical',
                        align: 'left',
                        verticalAlign: 'top',
                        x: 50,
                        y: 60,
                        borderWidth: 1,
                        borderRadius: 5,
                        maxHeight: 200,
                        floating: true,
                        draggable: true,
                        title: {
                            text: ':: Drag me'
                        },
                        zIndex: 20
                            // labelFormatter: function () {
                            //     return '<span style="color:' + this.color + ';">' + this.name + '</span>';
                            // },
                    },
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
                vis.Controller.setDetailChart(detailChart);
                vis.View.setLegendSymbolSize(vis.Configuration.legendSymbolSize);
            },

            createMasterDetailChart: function() {
                $('#masterdetail-container').html('<div id="detail-container"></div><div id="master-container"></div>');
                let masterChart = Highcharts.chart('master-container', {
                        chart: {
                            reflow: false,
                            borderWidth: 0,
                            backgroundColor: null,
                            marginLeft: 50,
                            marginRight: 20,
                            zoomType: 'x',
                            events: {
                                render: function() {
                                    this.showResetZoom();
                                },
                                selection: function(event) { // listen to the selection event on the master chart to update the extremes of the detail chart
                                    let extremesObject, min, max, newSeries;
                                    const detailChart = vis.Model.detailChart,
                                        xAxis = this.xAxis[0];

                                    if (!('resetSelection' in event)) {
                                        extremesObject = event.xAxis[0];
                                        min = extremesObject.min;
                                        max = extremesObject.max;
                                        newSeries = JSON.parse(JSON.stringify(vis.Model.zoomedDataForDetailChart.map(series => {
                                            return {...series, data: series.data.filter((obj) => obj.start_time >= min && obj.start_time <= max) }
                                        }).filter((series) => series.data.length > 0)));
                                    } else {
                                        extremesObject = event.target.axes[0];
                                        min = vis.Model.zoomedDataForMasterChart[0][0];
                                        max = vis.Model.zoomedDataForMasterChart[vis.Model.zoomedDataForMasterChart.length - 1][0];
                                        newSeries = JSON.parse(JSON.stringify(vis.Model.dataForDetailChart));
                                    }

                                    vis.Controller.changeZoomedDataForDetailChart(newSeries);

                                    detailChart.showLoading();

                                    // change data for detailChart & redraw
                                    while (detailChart.series.length > 0)
                                        detailChart.series[0].remove(false);

                                    newSeries.forEach(series => {
                                        series['marker'] = { 'radius': vis.Model.markerSize };
                                        detailChart.addSeries(series, false);
                                    });
                                    detailChart.redraw();
                                    vis.View.setLegendSymbolSize(vis.Configuration.legendSymbolSize);

                                    detailChart.hideLoading();

                                    // move the plot bands to reflect the new detail span
                                    xAxis.removePlotBand('mask-before');
                                    xAxis.addPlotBand({
                                        id: 'mask-before',
                                        from: vis.Model.zoomedDataForMasterChart[0][0],
                                        to: min,
                                        color: 'rgba(0, 0, 0, 0.2)'
                                    });

                                    xAxis.removePlotBand('mask-after');
                                    xAxis.addPlotBand({
                                        id: 'mask-after',
                                        from: max,
                                        to: vis.Model.zoomedDataForMasterChart[vis.Model.zoomedDataForMasterChart.length - 1][0],
                                        color: 'rgba(0, 0, 0, 0.2)'
                                    });

                                    xAxis.setExtremes(min, max);

                                    // vis.Model.app.View.resetDataTable();
                                    // is.Model.app.View.drawDataTable(dataForDetail.filter(obj => obj.start_time >= min && obj.start_time <= max));
                                    vis.View.setChartTitle(vis.Utils.msFormat(min), vis.Utils.msFormat(max),
                                        newSeries.reduce(function(sum, series) { return sum + series.data.length; }, 0));
                                    vis.Model.app.View.resetDataTable();
                                    vis.Model.app.View.drawDataTable(newSeries);

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
                            min: vis.Model.zoomedDataForMasterChart[0][0],
                            max: vis.Model.zoomedDataForMasterChart[vis.Model.zoomedDataForMasterChart.length - 1][0],
                            showLastTickLabel: true,
                            startOnTick: true,
                            endOnTick: true,
                            minRange: 3600 * 1000, // 1 hour
                            plotBands: [{
                                id: 'mask-before',
                                from: vis.Model.zoomedDataForMasterChart[0][0],
                                to: vis.Model.zoomedDataForMasterChart[vis.Model.zoomedDataForMasterChart.length - 1][0],
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
                                return '<b>Time:</b>' + vis.Utils.msFormat(this.x) +
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
                            pointStart: vis.Model.zoomedDataForMasterChart[0][0],
                            data: vis.Model.zoomedDataForMasterChart
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
                        vis.View.createDetailChart(masterChart);
                    }); // return chart instance
                //console.log(masterChart);

                vis.Controller.setMasterChart(masterChart);
            },

            createDurationChart: function() {
                let data = Object.keys(vis.Model.dataForDurationChart).map(groupName => ({
                    'name': groupName,
                    'data': Object.keys(vis.Model.dataForDurationChart[groupName]).map(walltime => Number(walltime))
                }));
                // console.log(data);
                let traces = [];
                data.forEach(obj => {
                    traces.push({
                        'x': obj['data'],
                        'type': 'histogram',
                        'name': obj['name'],
                        //'text': obj['data'].map(sec => vis.Utils.secondsToDhms(sec)),
                        'hoverinfo': 'all',
                        /*'hovertemplate': (obj['data'].map(sec => vis.Utils.secondsToDhms(sec))).map((formattedTime, index) => {
                            return formattedTime;
                        }),*/
                        'texttemplate': " "
                    })
                });
                var layout = {
                    barmode: "stack",
                    title: "Jobs' duration",
                    xaxis: {
                        title: {
                            text: 'Duration (WallTime in seconds)',
                        }
                    },
                    yaxis: {
                        title: {
                            text: 'Count of jobs',
                        }
                    }
                };
                Plotly.newPlot('duration-container', traces, layout);

                /*let durationChart = Highcharts.chart('duration-container', {
                    chart: {
                        type: 'spline'
                    },
                    title: {
                        text: "Jobs' duration"
                    },
                    xAxis: {
                        // categories: Object.keys(vis.Model.dataForDurationChart)
                    },
                    yAxis: {
                        title: {
                            text: 'Duration (WallTime)'
                        },
                        labels: {
                            format: '{value}'
                        }
                    },
                    tooltip: {
                        // shared: true
                        formatter: function () {
                            console.log(this);
                            // vis.Utils.secondsToDhms(walltime)
                            return `<b>${this.point.series.name}</b><br>` +
                                vis.Utils.secondsToDhms(this.y);
                        }
                    },
                    plotOptions: {
                        spline: {
                            marker: {
                                radius: 4,
                                lineColor: '#666666',
                                lineWidth: 1
                            }
                        }
                    },
                    series: Object.keys(vis.Model.dataForDurationChart).map(groupName => ({
                        'name': groupName,
                        'data': Object.keys(vis.Model.dataForDurationChart[groupName]).map(walltime => Number(walltime))
                    }))
                });*/
            },

            // не используем
            createDurationCountChart: function() {
                let walltimes = Object.keys(vis.Model.dataForDurationChart).map(groupName => Object.keys(vis.Model.dataForDurationChart[groupName])).flat();
                walltimes = walltimes.map(sec => vis.Utils.secondsToDhms(sec));
                Highcharts.chart('durationCount-container', {
                    chart: {
                        type: 'column'
                    },
                    title: {
                        text: 'Количество задач определенной продолжительности'
                    },
                    xAxis: {
                        categories: walltimes
                    },
                    yAxis: {
                        min: 0,
                        title: {
                            text: "Jobs count"
                        },
                        stackLabels: {
                            enabled: true
                        }
                    },
                    legend: {
                        align: 'left',
                        x: 70,
                        verticalAlign: 'top',
                        y: 70,
                        floating: true,
                        backgroundColor: Highcharts.defaultOptions.legend.backgroundColor || 'white',
                        borderColor: '#CCC',
                        borderWidth: 1,
                        shadow: false
                    },
                    tooltip: {
                        headerFormat: '<b>{series.name}</b><br/>'
                    },
                    plotOptions: {
                        column: {
                            stacking: 'normal',
                            dataLabels: {
                                enabled: true
                            }
                        }
                    },
                    series: vis.Model.dataForDurationCountChart
                });
            },

            redrawAll: function() {
                vis.Controller.reinitDataForDetailChart();
                vis.Controller.reinitDataForDurationChart();
                this.createMasterDetailChart();
                this.createDurationChart();
                //this.createDurationCountChart();
            },

            displayMarkerSize: function(markerSize_value) {
                $("#marker_size_value").html(markerSize_value);
            },

            redrawDetailChart: function(optionsObj) {
                const detailChart = vis.Model.detailChart;
                detailChart.showLoading();

                detailChart.series.map(series => series.update(optionsObj, false));

                detailChart.redraw();
                this.setLegendSymbolSize(vis.Configuration.legendSymbolSize);
                detailChart.hideLoading();
            },

            setChartTitle: function(periodStart, periodEnd, pointsCount) {
                let detailChart = vis.Model.detailChart;
                detailChart.setTitle({ text: periodStart + ' - ' + periodEnd }, { text: 'Count of points: <b>' + pointsCount + '</b>' }, false);
            },

            setLegendSymbolSize: function(symbolSize) {
                $(vis.Model.detailChart.series).each(function() {
                    this.legendItem.symbol.attr('width', symbolSize);
                    this.legendItem.symbol.attr('height', symbolSize);
                });
            },
        },

        this.Controller = {
            initiateVis: function(data) {
                vis.Model.initiateModel();
                if (data) vis.Model.setData(data);
                vis.View.initiateView();
            },

            setColorBy: function(value) {
                vis.Model.colorBy = value ? value : $("#select_colorBy").val();
            },

            setMasterChart: function(masterChart) {
                vis.Model.masterChart = masterChart;
            },

            setDetailChart: function(detailChart) {
                vis.Model.detailChart = detailChart;
            },

            y_value_Changed: function(y_value) {
                vis.Model.y_value = y_value;
                if (vis.Model.zoomedDataForDetailChart) {
                    vis.View.redrawAll();
                    vis.Model.app.View.resetDataTable();
                    vis.Model.app.View.drawDataTable(vis.Model.zoomedDataForDetailChart);
                }
            },

            colorBy_Changed: function(colorBy_value) {
                vis.Model.colorBy = colorBy_value;
                if (vis.Model.zoomedDataForDetailChart) {
                    vis.View.redrawAll();
                    vis.Model.app.View.resetDataTable();
                    vis.Model.app.View.drawDataTable(vis.Model.zoomedDataForDetailChart);
                }
            },

            markerSize_Changed: function(markerSize_value) {
                vis.Model.markerSize = markerSize_value;
                vis.View.displayMarkerSize(markerSize_value);
                if (vis.Model.zoomedDataForDetailChart)
                    vis.View.redrawDetailChart({
                        marker: {
                            radius: vis.Model.markerSize
                        }
                    });
            },

            changeZoomedDataForDetailChart: function(newData) {
                vis.Model.zoomedDataForDetailChart = newData;
            },

            changeZoomedDataForMasterChart: function(newData) {
                vis.Model.zoomedDataForMasterChart = newData;
            },

            reinitDataForDetailChart: function() {
                vis.Model.dataForDetailChart = vis.Model.initDataForDetailChart(vis.Model.data);
                let currentZoomedDataForDetailChart = JSON.parse(JSON.stringify(vis.Model.zoomedDataForDetailChart)),
                    currentDetailData = currentZoomedDataForDetailChart.map(series => series.data).reduce((accumulator, currentArray) => {
                        return accumulator.concat(currentArray);
                    }, []),
                    currentJobIDs = currentDetailData.map(obj => obj.job_id);

                vis.Model.zoomedDataForDetailChart = JSON.parse(JSON.stringify(vis.Model.dataForDetailChart.map(series => {
                    return {...series, data: series.data.filter((obj) => currentJobIDs.includes(obj.job_id)) }
                })));
            },

            reinitDataForDurationChart: function() {
                vis.Model.dataForDurationChart = vis.Model.initDataForDurationChart(vis.Model.data);
                //console.log(vis.Model.dataForDurationChart);
            }
        }
}