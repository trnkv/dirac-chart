var App = function () {
    var app = this;

    // Configuration
    this.Configuration = {
        startTime: moment(new Date(2020, 0, 1)),
        datetime_format: 'YYYY-MM-DD HH:mm:ss',
        markerSize: 1.0,
        legendSymbolSize: 10,
        useUTC: true
    };

    this.Utils = {
        secondsToDhms: function (seconds) {
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

        msFormat: function (milliseconds) {
            return Highcharts.dateFormat('%e %b %Y, %H:%M:%S', new Date(milliseconds));
        }
    }

    // Model
    this.Model = {
        // Application data
        base_data: null,
        data_filtered: null,
        dataCSV: null,
        filters: null,
        currentFilters: null,
        countOfPoints: 0,
        recent_actions: [],
        colorBy: null,
        y_value: null,

        // Visualization data
        visualization: {
            detailChart: null,
            masterChart: null,
            datatable: null,
            dataForDetailChart: null,
            dataForMasterChart: null,
            zoomedDataForDetailChart: null,
            zoomedDataForMasterChart: null,
            dataForDurationChart: null
        },

        initiateModel: function () {
            this.startTime = app.Configuration.startTime.format(app.Configuration.datetime_format);
            this.endTime = moment().format(app.Configuration.datetime_format);
            this.recent_actions = [];
            this.y_value = $("#select_y_value").val();
            this.colorBy = $("#select_colorBy").val();
        },

        reset: function () {
            this.base_data = null;
            this.data_filtered = null;
            this.dataCSV = null;
            this.filters = null;
            this.currentFilters = null;
            this.countOfPoints = 0;
            this.recent_actions = null;
            this.colorBy = null;
            this.y_value = null;

            // Reset visualization data
            this.visualization = {
                detailChart: null,
                masterChart: null,
                datatable: null,
                dataForDetailChart: null,
                dataForMasterChart: null,
                zoomedDataForDetailChart: null,
                zoomedDataForMasterChart: null,
                dataForDurationChart: null
            };
        },

        getFilters: function () {
            $.ajax({
                url: "get_filters",
                async: false,
            }).done(function (response) {
                app.Model.filters = response["filters"];
                app.Model.currentFilters = app.Model.filters;
                console.log("Model: SUCCESS - filters successfully loaded");
            }).fail(function (response) {
                console.log("Model: ERROR - filter loading issue" + response);
            });
        },

        parseDataCSV: function () {
            this.base_data = Papa.parse(this.dataCSV, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                fastMode: true,
            }).data;
            // this.base_data = this.dataCSV;

            this.base_data.forEach(obj => {
                obj['start_time'] = new Date(obj['start_time']).getTime();
                obj['x'] = obj['start_time'];
                obj['real_wt'] = (Date.parse(obj.end_time) - obj.start_time) / 1000;
                obj['efficiency'] = obj.total_time / obj.wall_time;
            });

            this.data_filtered = Object.assign([], this.base_data);
            this.countOfPoints = this.data_filtered.length;
        },

        getDataByFilters: function (done_handler, checkedFilters, startTime, endTime) {
            this.colorBy = $("#select_colorBy").val();

            $.ajax({
                xhr: function () {
                    var xhr = new window.XMLHttpRequest();
                    xhr.addEventListener("progress", function (evt) {
                        if (evt.lengthComputable) {
                            $("#spinner p").text(`${Math.round(evt.loaded * 9.54 * Math.pow(10, -7))} MB`);
                        }
                    }, false);
                    return xhr;
                },
                url: "get_data_by_filters",
                data: {
                    "filters[]": checkedFilters,
                    "start": startTime,
                    "end": endTime
                },
                async: true
            }).done(function (response) {
                app.Model.dataCSV = response;
                app.Model.done_handler = done_handler;
                $("#spinner p").text("process");
                setTimeout(app.Model.processData, 100);
            });
        },

        getAllData: function (done_handler) {
            this.colorBy = $("#select_colorBy").val();
            $.ajax({
                xhr: function () {
                    var xhr = new window.XMLHttpRequest();
                    xhr.addEventListener("progress", function (evt) {
                        if (evt.lengthComputable) {
                            $("#spinner p").text(`${Math.round(evt.loaded * 9.54 * Math.pow(10, -7))} MB`);
                        }
                    }, false);
                    return xhr;
                },
                url: "get_all_data",
                async: true,
                dataType: "text", // получаем как текст
                cache: false,     // отключаем кеширование на клиенте
            }).done(function (response) {
                // console.log(response);
                app.Model.dataCSV = response;
                app.Model.done_handler = done_handler;
                $("#spinner p").text("process");
                setTimeout(app.Model.processData, 100);
            }).fail(function (xhr, status, error) {
                console.error("Ошибка загрузки CSV:", error);
                $("#spinner p").text("CSV loading error");
            });
        },

        processData: function () {
            app.Model.parseDataCSV();
            app.Model.done_handler();
        },

        applyFilters: function (checked_filters) {
            var filters = {
                'site': [],
                'owner': [],
                'status': [],
                'job_group': []
            };

            checked_filters.forEach(element => {
                var category = element.split(':')[0];
                var value = element.split(':')[1];
                filters[category].push(value);
            });

            app.Model.data_filtered = app.Model.base_data.filter(function (el) {
                return filters['site'].includes(el.site) &&
                    filters['owner'].includes(el.owner) &&
                    filters['status'].includes(el.status) &&
                    filters['job_group'].includes(el.job_group);
            });
        },

        addRecentAction: function (action_type, action_value) {
            app.Model.recent_actions.push({ 'action_type': action_type, 'action_value': action_value });
        },

        // Visualization model methods
        initDataForDetailChart: function (inputData) {
            let seriesData = [];
            inputData.forEach((obj) => {
                var to_push = {};

                if (this.y_value === "diracWT") {
                    to_push = {
                        job_id: obj.job_id,
                        x: obj.cpu_norm + Math.random() * 0.1 - 0.05,
                        y: obj.wall_time,
                        start_time: obj.start_time
                    };
                } else if (this.y_value === "realWT") {
                    to_push = {
                        job_id: obj.job_id,
                        x: obj.cpu_norm + Math.random() * 0.1 - 0.05,
                        y: obj.real_wt,
                        start_time: obj.start_time
                    };
                } else {
                    to_push = {
                        job_id: obj.job_id,
                        x: obj.cpu_norm + Math.random() * 0.1 - 0.05,
                        y: obj.efficiency,
                        start_time: obj.start_time
                    };
                }

                for (var i = 0; i < seriesData.length; i++) {
                    if (seriesData[i].name == obj[this.colorBy]) {
                        seriesData[i].data.push(to_push);
                        return;
                    }
                }

                seriesData.push({
                    name: obj[this.colorBy],
                    data: [to_push],
                });
            });
            return seriesData;
        },

        initDataForMasterChart: function (inputData) {
            const startTime = performance.now();

            // Создаём массив пар [start, stop]
            const jobs = inputData.map(obj => {
                const y = obj.wall_time ?? obj.y;
                return [obj.start_time, Math.trunc(obj.start_time + y * 1000)];
            });

            // Сортируем по старту один раз
            jobs.sort((a, b) => a[0] - b[0]);

            const running_at_time = {};
            const stop_times = new MinHeap(); // наша куча (см. ниже реализацию)
            let current = 0;

            for (let i = 0; i < jobs.length; i++) {
                const [start, stop] = jobs[i];

                // Убираем все завершившиеся задачи
                while (stop_times.size() > 0 && start > stop_times.peek()) {
                    current--;
                    running_at_time[stop_times.pop()] = current;
                }

                current++;
                running_at_time[start] = current;
                stop_times.push(stop);
            }

            // Обрабатываем оставшиеся stop_times
            while (stop_times.size() > 0) {
                current--;
                running_at_time[stop_times.pop()] = current;
            }

            // Преобразуем в массив и сортируем один раз
            let result = Object.entries(running_at_time)
                .map(([t, val]) => [parseInt(t), val])
                .sort((a, b) => a[0] - b[0]);

            if (result.length === 0) return result;

            // Построение агрегированных значений по часам
            let current_hour_start = Math.floor(result[0][0] / 3600000) * 3600000;
            let current_hour_end = current_hour_start + 3600000;
            let current_hour_max_value = 0;
            const result_data_map = {};

            for (let i = 0; i < result.length; i++) {
                if (result[i][0] < current_hour_end) {
                    current_hour_max_value = Math.max(result[i][1], current_hour_max_value);
                } else {
                    current_hour_start = Math.floor(result[i][0] / 3600000) * 3600000;
                    current_hour_end = current_hour_start + 3600000;
                    current_hour_max_value = result[i][1];
                }
                result_data_map[current_hour_start] = current_hour_max_value;
            }

            let result_data = Object.entries(result_data_map)
                .map(([k, v]) => [Number(k), v])
                .sort((a, b) => a[0] - b[0]);

            // Добавляем точки с нулями
            const min_time = result_data[0][0];
            const max_time = result_data[result_data.length - 1][0];
            result_data.unshift([min_time - 3600000, 0]);
            result_data.push([max_time + 3600000, 0]);

            let index = 1;
            let lastTime = result_data[0][0];
            while (index < result_data.length) {
                if (result_data[index][0] - 3600000 === lastTime) {
                    lastTime = result_data[index][0];
                    index++;
                } else if (result_data[index][0] - 3600000 > lastTime) {
                    result_data.splice(index, 0, [lastTime + 3600000, 0]);
                    lastTime += 3600000;
                    index++;
                    if (result_data[index][0] - 3600000 !== lastTime) {
                        result_data.splice(index, 0, [result_data[index][0] - 3600000, 0]);
                        lastTime = result_data[index][0] - 3600000;
                        index++;
                    }
                }
            }

            console.log(`initDataForMasterChart выполнена за ${(performance.now() - startTime).toFixed(2)} ms`);
            return result_data;
        },

        initDataForDurationChart: function (inputData) {
            let groupMap = {},
                groupBy = inputData.every(obj => 'name' in obj) ? 'name' : this.colorBy,
                result = {};

            // Grouping objects by colorBy
            inputData.forEach(obj => {
                const groupName = obj[groupBy];
                if (groupName !== undefined) {
                    if (!groupMap[groupName]) {
                        groupMap[groupName] = [];
                    }
                    groupMap[groupName].push(obj);
                }
            });

            for (const groupName in groupMap) {
                if (!result[groupName]) {
                    result[groupName] = [];
                };
                groupMap[groupName].forEach(obj => {
                    let duration;
                    if ('y' in obj)
                        duration = obj.y;
                    else if (this.y_value === "diracWT") {
                        duration = obj.wall_time;
                    } else if (this.y_value === "realWT") {
                        duration = Date.parse(obj.end_time) - obj.start_time;
                    } else {
                        duration = (Date.parse(obj.end_time) - obj.start_time) / obj.cpu_time;
                    }
                    if (duration !== undefined) {
                        result[groupName].push(duration);
                    }
                });
            }
            return result;
        },

        setVisualizationData: function (data) {
            this.data_filtered = data;
            let start = Date.now();
            this.visualization.dataForDetailChart = this.initDataForDetailChart(data);
            console.log(`Time to initDataForDetailChart: ${Date.now() - start} ms`);
            this.visualization.dataForMasterChart = this.initDataForMasterChart(data);
            start = Date.now();
            this.visualization.zoomedDataForDetailChart = JSON.parse(JSON.stringify(this.visualization.dataForDetailChart));
            console.log(`Time to zoomedDataForDetailChart: ${Date.now() - start} ms`);
            start = Date.now();
            this.visualization.zoomedDataForMasterChart = JSON.parse(JSON.stringify(this.visualization.dataForMasterChart));
            console.log(`Time to zoomedDataForMasterChart: ${Date.now() - start} ms`);
            start = Date.now();
            this.visualization.dataForDurationChart = this.initDataForDurationChart(data);
            console.log(`Time to dataForDurationChart: ${Date.now() - start} ms`);
        }
    };

    // View
    this.View = {
        // Application view methods
        createDateRangePicker: function () {
            var start = moment(new Date(2020, 0, 1));
            var end = moment();

            function cb(start, end) {
                $('#reportrange span').html(start.format('DD.MM.YYYY') + ' - ' + end.format('DD.MM.YYYY'));
            }

            $('#reportrange').daterangepicker({
                timePicker: true,
                startDate: start,
                endDate: end,
                maxYear: parseInt(moment().format('YYYY'), 10),
                minYear: 2020,
                minDate: start,
                maxDate: moment(),
                timePicker24Hour: true,
                timePickerSeconds: true,
                showDropdowns: true,
                alwaysShowCalendars: true,
                locale: {
                    format: 'DD.MM.YYYY HH:MM:SS'
                },
                ranges: {
                    'Today': [moment(), moment()],
                    'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                    'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                    'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                    'This Month': [moment().startOf('month'), moment().endOf('month')],
                    'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
                    'All Data': [moment(new Date(2020, 0, 1)), moment()]
                }
            }, cb);
            cb(start, end);
            return [start, end];
        },

        showPreloader: function () {
            $("#data_loading_preloader").css("display", "block");
        },

        hidePreloader: function () {
            $("#data_loading_preloader").css("display", "none");
        },

        initiateView: function () {
            var start_end = this.createDateRangePicker();
            app.View.start_time = start_end[0].format(app.Configuration.datetime_format);
            app.View.end_time = start_end[1].format(app.Configuration.datetime_format);

            $('#reportrange').on('apply.daterangepicker', function (ev, picker) {
                app.View.start_time = picker.startDate.format(app.Configuration.datetime_format);
                app.View.end_time = picker.endDate.format(app.Configuration.datetime_format);
                app.Controller.recordRecentAction($(this));
            });

            $("#li_recent_actions").find(".badge").css("display", "none");
            $('#btn_select_all_sites').prop("checked", "checked");
            $('#btn_select_all_owners').prop("checked", "checked");
            $('#btn_select_all_statuses').prop("checked", "checked");
            $('#btn_select_all_job_groups').prop("checked", "checked");

            $('#btn_load_all').on('click', function () {
                $('#btn_select_all_sites').trigger('click');
                $('#btn_select_all_owners').trigger('click');
                $('#btn_select_all_statuses').trigger('click');
                $('#btn_select_all_job_groups').trigger('click');
                app.Controller.loadAllData();
                app.Controller.recordRecentAction($(this));
            });

            $('#btn_load_filtered').on('click', function () {
                app.Controller.loadDataByFilters();
                app.Controller.recordRecentAction($(this));
            });

            $('#btn_reset').on('click', function () {
                app.Controller.reset();
            });

            $('#btn_select_all_sites').on('click', function () {
                app.View.checkAllCheckboxes("site");
                app.Controller.recordRecentAction($(this));
            });

            $('#btn_select_none_sites').on('click', function () {
                app.View.check_none("site");
                app.Controller.recordRecentAction($(this));
            });

            $('#btn_select_all_owners').on('click', function () {
                app.View.checkAllCheckboxes("owner");
                app.Controller.recordRecentAction($(this));
            });

            $('#btn_select_none_owners').on('click', function () {
                app.View.check_none("owner");
                app.Controller.recordRecentAction($(this));
            });

            $('#btn_select_all_statuses').on('click', function () {
                app.View.checkAllCheckboxes("status");
                app.Controller.recordRecentAction($(this));
            });

            $('#btn_select_none_statuses').on('click', function () {
                app.View.check_none("status");
                app.Controller.recordRecentAction($(this));
            });

            $('#btn_select_all_job_groups').on('click', function () {
                $("#job_groups").val(app.Model.filters['job_group'].map(g => "job_group:" + g)).trigger('change');
                app.Controller.recordRecentAction($(this));
            });

            $('#btn_select_none_job_groups').on('click', function () {
                $("#job_groups").val(null).trigger('change');
                app.Controller.recordRecentAction($(this));
            });

            $("#job_groups").select2({
                placeholder: 'Select Job Group(s)',
                width: "100%",
                multiple: true,
                tags: true,
                tokenSeparators: [';', ','],
                createTag: function (params) {
                    var term = $.trim(params.term);

                    if (term === '') {
                        return null;
                    }

                    return {
                        id: term,
                        text: term,
                        newTag: true
                    }
                }
            });
        },

        drawFilter: function (selector, value, text) {
            $(selector).append(`\
                <li class="nav-item">
                    <a href="#" class="">
                            <div class="custom-control custom-switch">
                                <input type="checkbox" class="custom-control-input ${value.split(':')[0]}-checkbox" id="${value}" checked>
                                <label class="custom-control-label" for="${value}">${text}</label>\
                            </div>\
                    </a>\
                </li>`);
        },

        drawFilters: function (filters) {
            app.View.hidePreloader();
            for (var category in filters) {
                if (category === "job_group") {
                    for (var element in filters['job_group']) {
                        $("#job_groups").append(`<option value="job_group:${filters['job_group'][element]}">${filters['job_group'][element]}</option>`);
                    }
                    $("#job_groups").val(filters['job_group'].map(g => "job_group:" + g)).trigger('change');
                } else {
                    var id_name = "#" + category + "-selector";
                    for (var element in filters[category]) {
                        var value = category + ":" + filters[category][element];
                        var caption = filters[category][element];
                        this.drawFilter(id_name, value, caption);
                    }
                }
            }

            $("input[type=checkbox], #job_groups").change(function () {
                app.Controller.filtersChanged();
                app.Controller.recordRecentAction($(this));
            });
        },

        getCheckedFilters: function () {
            var checkedFilters = [];
            $("input[type=checkbox]:checked").each(function () {
                checkedFilters.push($(this).attr('id'));
            });
            checkedFilters = checkedFilters.concat($("#job_groups").val());
            console.log("Checked filters: ", checkedFilters);
            return checkedFilters;
        },

        leaveOnlyCheckedFilters: function () {
            $("input[type=checkbox]:not(:checked)").parent().parent().parent().remove();
            this.deleteNotSelectedJobGroups();
        },

        redrawJobGroupSelector: function () {
            const newJobGroups = [...new Set(app.Model.data_filtered.map(item => item.job_group))];
            $("#job_groups").val(newJobGroups.map(g => "job_group:" + g)).trigger('change');
            this.deleteNotSelectedJobGroups();
        },

        deleteNotSelectedJobGroups: function () {
            $('#job_groups option').each(function () {
                if (!$(this).is(':selected')) {
                    $(this).remove();
                }
            });
            $('#job_groups').trigger('change.select2');
        },

        checkAllCheckboxes: function (category) {
            $(`input[type=checkbox].${category}-checkbox`).prop('checked', true);
        },

        check_none: function (category) {
            $(`input[type=checkbox].${category}-checkbox`).prop('checked', false);
        },

        resetFilters: function () {
            $("input[type=checkbox]").parent().remove();
        },

        reset: function () {
            this.resetFilters();
            $('#masterdetail-container').html('');
            $('#duration-container').html('');
            $('#li_recent_actions').find(".dropdown-menu").html('\
                <span class="dropdown-item dropdown-header">Recent actions <i class="fa-solid fa-arrow-down-long"></i></span>\
                <div class="dropdown-divider"></div>');
            $('#li_recent_actions').find(".badge").text(0);
        },

        drawRecentActions: function () {
            var last_action = app.Model.recent_actions[app.Model.recent_actions.length - 1];
            $("#li_recent_actions").find(".dropdown-menu").append(`\
                <a href="#" class="dropdown-item noclick">\
                    ${last_action['action_value']}\
                    <span class="float-right text-muted text-sm">${last_action['action_type']}</span>\
                </a>`);
            var actions_number_increased = parseInt($("#li_recent_actions").find(".badge").text()) + 1;
            $("#li_recent_actions").find(".badge").text(actions_number_increased);
            $("#li_recent_actions").find(".badge").css('display', 'block');
        },

        // Visualization view methods
        initiateVisualizationView: function () {
            Highcharts.setOptions({
                time: {
                    useUTC: app.Configuration.useUTC,
                }
            });

            $('#masterdetail-container').html('<div id="detail-container"></div><div id="master-container"></div>');
            $('#select_marker_size').val(app.Configuration.markerSize);
            this.displayMarkerSize(app.Configuration.markerSize);

            $("#select_marker_size").on('input', function () {
                app.View.displayMarkerSize((Number($(this).val())).toFixed(1));
            });

            $("#select_marker_size").on('change', function () {
                app.Controller.recordRecentAction($(this));
                app.Controller.markerSizeChanged(Number($(this).val()));
            });

            app.Controller.setColorBy(app.Configuration.colorBy);

            $("#select_y_value").on('change', function () {
                app.Controller.recordRecentAction($(this));
                app.Controller.yValueChanged($(this).val());
            });

            $("#select_colorBy").on('change', function () {
                app.Controller.recordRecentAction($(this));
                app.Controller.colorByChanged($(this).val());
            });

            var datatable = new DataTable('#datatable', {
                columns: [
                    { 'data': 'data', 'title': $("#select_colorBy").val() },
                    { 'data': 'pointsCount', 'title': 'Count of points' },
                ],
                autowidth: false,
                paging: true,
                lengthChange: true,
                searching: true,
                ordering: true,
                order: [[1, "desc"]],
                info: true,
                responsive: true,
                retrieve: true,
                dom: 'Blfrtip',
                buttons: [
                    { extend: 'csv', className: '' },
                    { extend: 'excel', className: '' },
                    { extend: 'pdf', className: '' },
                    { extend: 'print', className: '' }
                ],
            });

            app.Controller.dataTableChanged(datatable);
            $('#datatable_wrapper').hide();
        },

        drawCharts: function () {
            this.createMasterDetailChart();
            this.createDurationChart();
            $('#master-container').css({
                'top': app.Model.visualization.detailChart.chartHeight + "px"
            });
        },

        drawDataTable: function (data) {
            console.log('data for DataTable: ', data);
            this.resetDataTable();
            var dataForDataTable = [],
                key = 'name';
            var categories = Array.from(new Set(data.map(obj => obj[key])));

            for (let i = 0; i < categories.length; i++) {
                var category = categories[i],
                    pointsCount = data.find(obj => {
                        return obj.name === category
                    }).data.length;
                dataForDataTable.push({ 'data': category, 'pointsCount': pointsCount });
            };

            app.Model.visualization.datatable.rows.add(dataForDataTable);
            $(app.Model.visualization.datatable.column(0).header()).text(app.Model.colorBy);
            app.Model.visualization.datatable.columns.adjust().draw();
            $('#datatable_wrapper').show();
        },

        createDetailChart: function (masterChart) {
            const dataForDetail = app.Model.visualization.zoomedDataForDetailChart.map(series => series.data).reduce((accumulator, currentArray) => {
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
                        render: function () {
                            this.showResetZoom();
                        },
                        selection: function (event) {
                            this.showLoading();
                            let currentZoomedDetailData_Series, currentZoomedMasterData;
                            if (!('resetSelection' in event)) {// проверяем, зум сброшен или нет
                                let minX = event.xAxis[0].min,
                                    maxX = event.xAxis[0].max,
                                    minY = event.yAxis[0].min,
                                    maxY = event.yAxis[0].max;
                                currentZoomedDetailData_Series = JSON.parse(JSON.stringify(app.Model.visualization.zoomedDataForDetailChart.map(series => {
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
                                const allObjects = currentZoomedDetailData_Series.flatMap(group => group.data);
                                let minStartTime = Math.min(...allObjects.map(obj => obj.start_time));
                                const minDate = new Date(minStartTime);
                                minStartTime = new Date(minDate).setUTCHours(
                                    new Date(minDate).getUTCHours(), 0, 0, 0
                                );
                                let maxStartTime = Math.max(...allObjects.map(obj => obj.start_time));
                                const maxDate = new Date(maxStartTime);
                                maxStartTime = new Date(maxDate).setUTCHours(
                                    new Date(maxDate).getUTCHours(), 0, 0, 0
                                );
                                if (minStartTime === maxStartTime) maxStartTime = new Date(minStartTime + 3600000).getTime(); // +1 hour
                                currentZoomedMasterData = app.Model.visualization.zoomedDataForMasterChart.filter((pair) =>
                                    pair[0] >= minStartTime &&
                                    pair[0] <= maxStartTime
                                )
                            } else { // если зум сброшен
                                currentZoomedDetailData_Series = JSON.parse(JSON.stringify(app.Model.visualization.dataForDetailChart));
                                currentZoomedMasterData = app.Model.visualization.dataForMasterChart;
                            }
                            app.Controller.saveZoomedDataForDetailChart(currentZoomedDetailData_Series);
                            app.Controller.saveZoomedDataForMasterChart(currentZoomedMasterData);
                            app.Controller.onZoom();
                            this.hideLoading();
                        },
                        redraw: function () {
                            const chart = this,
                                each = Highcharts.each;
                            each(chart.series, function (s, i) {
                                each(s.points, function (p, j) {
                                    if (p.graphic) {
                                        p.graphic.css({
                                            'marker': {
                                                'raduis': app.Configuration.markerSize
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
                    text: app.Utils.msFormat(dataForDetail[0]['start_time']) + ' - ' + app.Utils.msFormat(dataForDetail[dataForDetail.length - 1]['start_time']),
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
                    min: 0,
                    title: {
                        text: "DB12 value",
                    },
                    labels: {
                        format: "{value}",
                        zIndex: 6
                    },
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: $("#select_y_value option:selected").text() + " (secs)",
                    },
                    labels: {
                        x: 5,
                        zIndex: 6
                    },
                },
                plotOptions: {
                    scatter: {
                        marker: {
                            radius: app.Configuration.markerSize,
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
                        const dataPoint = app.Model.data_filtered.filter(obj => obj.job_id === this.point.job_id)[0];
                        return (
                            "<b>CPU norm:</b> " + dataPoint.cpu_norm + "<br>" +
                            "<b>Wall Time:</b> " + app.Utils.secondsToDhms(dataPoint.wall_time) + "<br>" +
                            "<b>Start Time:</b> " + app.Utils.msFormat(dataPoint.start_time) + "<br>" +
                            "<b>End Time:</b> " + app.Utils.msFormat(dataPoint.end_time) + "<br>" +
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
                series: app.Model.visualization.zoomedDataForDetailChart,
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
                },
                exporting: {
                    enabled: true,
                    sourceWidth: 1920,
                    sourceHeight: 1080,
                    // scale: 2 (default)
                    // chartOptions: {
                    //     subtitle: null
                    // }
                },
                boost: {
                    useGPUTranslations: true,
                    usePreAllocated: true,
                }
            });

            app.Controller.setDetailChart(detailChart);
            // this.setLegendSymbolSize(app.Configuration.legendSymbolSize);
        },

        createMasterDetailChart: function () {
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
                        render: function () {
                            this.showResetZoom();
                        },
                        selection: function (event) {// listen to the selection event on the master chart to update the extremes of the detail chart
                            let minStartTime, maxStartTime, currentZoomedDetailData_Series, currentZoomedMasterData;

                            if (!('resetSelection' in event)) {
                                minStartTime = event.xAxis[0].min;
                                maxStartTime = event.xAxis[0].max;
                                currentZoomedDetailData_Series = JSON.parse(JSON.stringify(app.Model.visualization.zoomedDataForDetailChart.map(series => {
                                    return { ...series, data: series.data.filter((obj) => obj.start_time >= minStartTime && obj.start_time <= maxStartTime) }
                                }).filter((series) => series.data.length > 0)));
                                currentZoomedMasterData = app.Model.visualization.zoomedDataForMasterChart.filter((pair) =>
                                    pair[0] >= minStartTime &&
                                    pair[0] <= maxStartTime
                                )
                            } else {
                                currentZoomedDetailData_Series = JSON.parse(JSON.stringify(app.Model.visualization.dataForDetailChart));
                                currentZoomedMasterData = app.Model.visualization.dataForMasterChart;
                            }

                            app.Controller.saveZoomedDataForDetailChart(currentZoomedDetailData_Series);
                            app.Controller.saveZoomedDataForMasterChart(currentZoomedMasterData);

                            app.Controller.onZoom();
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
                    min: app.Model.visualization.zoomedDataForMasterChart[0][0],
                    max: app.Model.visualization.zoomedDataForMasterChart[app.Model.visualization.zoomedDataForMasterChart.length - 1][0],
                    showLastTickLabel: true,
                    startOnTick: true,
                    endOnTick: true,
                    minRange: 3600 * 1000,
                    plotBands: [{
                        id: 'mask-before',
                        from: app.Model.visualization.zoomedDataForMasterChart[0][0],
                        to: app.Model.visualization.zoomedDataForMasterChart[app.Model.visualization.zoomedDataForMasterChart.length - 1][0],
                        color: 'rgba(0, 0, 0, 0.2)'
                    }],
                    title: {
                        text: null
                    },
                    events: {
                        setExtremes: function (e) {
                            if (typeof e.min == 'undefined' && typeof e.max == 'undefined') {
                                // Zoom out
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
                        return '<b>Time:</b>' + app.Utils.msFormat(this.x) +
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
                    pointInterval: 3600 * 1000,
                    pointStart: app.Model.visualization.zoomedDataForMasterChart[0][0],
                    data: app.Model.visualization.zoomedDataForMasterChart
                }],
                exporting: {
                    enabled: false
                },
                boost: {
                    useGPUTranslations: true,
                    usePreAllocated: true,
                }
            }, masterChart => {
                app.View.createDetailChart(masterChart);
            });

            app.Controller.setMasterChart(masterChart);
        },

        createDurationChart: function () {
            console.log(app.Model.visualization.dataForDurationChart);
            let data = Object.keys(app.Model.visualization.dataForDurationChart).map(groupName => ({
                'name': groupName,
                'data': app.Model.visualization.dataForDurationChart[groupName]
            }));

            console.log(data);
            let traces = [];
            data.forEach(obj => {
                traces.push({
                    'x': obj['data'],
                    'type': 'histogram',
                    'nbinsx': 100,
                    'name': obj['name'],
                    'hoverinfo': 'all',
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
        },

        displayMarkerSize: function (markerSize_value) {
            $("#marker_size_value").html(markerSize_value);
        },

        redrawDetailChart: function (optionsObj) {
            const detailChart = app.Model.visualization.detailChart;
            detailChart.showLoading();
            detailChart.series.map(series => series.update(optionsObj, false));
            detailChart.redraw();
            // this.setLegendSymbolSize(app.Configuration.legendSymbolSize);
            detailChart.hideLoading();
        },

        redrawAllCharts: function () {
            let start = Date.now();
            app.Controller.reinitDataForDetailChart();
            console.log(`Time to reinitDataForDetailChart: ${Date.now() - start} ms`);

            start = Date.now();
            app.Controller.reinitDataForDurationChart();
            console.log(`Time to reinitDataForDurationChart: ${Date.now() - start} ms`);

            start = Date.now();
            this.createMasterDetailChart();
            console.log(`Time to createMasterDetailChart: ${Date.now() - start} ms`);

            start = Date.now();
            this.createDurationChart();
            console.log(`Time to createDurationChart: ${Date.now() - start} ms`);
        },

        setChartTitle: function (periodStart, periodEnd, pointsCount) {
            let detailChart = app.Model.visualization.detailChart;
            detailChart.setTitle({ text: periodStart + ' - ' + periodEnd }, { text: 'Count of points: <b>' + pointsCount + '</b>' }, false);
        },

        setLegendSymbolSize: function (symbolSize) {
            $(app.Model.visualization.detailChart.series).each(function () {
                this.legendItem.symbol.attr('width', symbolSize);
                this.legendItem.symbol.attr('height', symbolSize);
            });
        },

        resetDataTable: function () {
            if (app.Model.visualization.datatable) {
                app.Model.visualization.datatable.clear().draw();
            }
            $('#datatable_wrapper').hide();
        }
    };

    // Controller
    this.Controller = {
        initiateApp: function () {
            app.Model.initiateModel();
            app.View.initiateView();
            app.View.showPreloader();
            app.Model.getFilters();
            app.View.drawFilters(app.Model.filters);
            this.initiateVisualization();
            app.View.hidePreloader();
        },

        initiateVisualization: function () {
            app.View.initiateVisualizationView();
        },

        loadAllData: function () {
            app.View.resetFilters();
            app.View.drawFilters(app.Model.filters);
            app.View.showPreloader();
            app.Model.getAllData(this.dataLoaded);
        },

        loadDataByFilters: function () {
            app.View.leaveOnlyCheckedFilters();
            let checkedFilters = app.View.getCheckedFilters();
            let start_time = app.View.start_time;
            let end_time = app.View.end_time;
            app.View.showPreloader();
            app.Model.getDataByFilters(this.dataLoaded, checkedFilters, start_time, end_time);
        },

        dataLoaded: function () {
            app.Model.setVisualizationData(app.Model.data_filtered);
            app.View.redrawJobGroupSelector();
            app.Controller.callDrawer();
            app.View.hidePreloader();
        },

        callDrawer: function () {
            const data = app.Model.data_filtered;
            if (data.length > 0) {
                app.View.drawCharts();
                app.View.drawDataTable(app.Model.visualization.zoomedDataForDetailChart);
            } else {
                $('#masterdetail-container').html('<h4 class="text-primary">There is no data on this request</h4>\
                <p>Change the request parameters and try again</p>');
            }
        },

        filtersChanged: function () {
            if (app.Model.base_data) {
                let checkedFilters = app.View.getCheckedFilters();
                app.Model.applyFilters(checkedFilters);
                app.Model.setVisualizationData(app.Model.data_filtered);
                app.Controller.callDrawer();
            }
        },

        recordRecentAction: function (triggered_element) {
            var action_type = new Date().getHours() + ":" + new Date().getMinutes() + ":" + new Date().getSeconds() + " | ",
                action_value = "";
            console.log(triggered_element.attr('id'));

            switch (triggered_element.attr('id')) {
                case "reportrange":
                    action_type += "Time period";
                    action_value = triggered_element.text();
                    break;
                case "btn_select_all_sites":
                case "btn_select_none_sites":
                    action_type += "Sites";
                    action_value = triggered_element.parent().find("label").text();
                    break;
                case "btn_select_all_owners":
                case "btn_select_none_owners":
                    action_type += "Owners";
                    action_value = triggered_element.parent().find("label").text();
                    break;
                case "btn_select_all_statuses":
                case "btn_select_none_statuses":
                    action_type += "Statuses";
                    action_value = triggered_element.parent().find("label").text();
                    break;
                case "btn_select_all_job_groups":
                case "btn_select_none_job_groups":
                    action_type += "Job Groups";
                    action_value = triggered_element.parent().find("label").text();
                    break;
                case "select_colorBy":
                    action_type += "Color";
                    action_value = "By " + triggered_element.find("option:selected").text();
                    break;
                case "select_marker_size":
                    action_type += "Marker size";
                    action_value = $("#marker_size_value").text();
                    break;
                case "job_groups":
                    action_type += "Job Group";
                    action_value = $("#job_groups").val().join(', ').replaceAll("job_group:", "");
                    break;
            }

            switch (true) {
                case /site:/.test(triggered_element.attr('id')):
                case /owner:/.test(triggered_element.attr('id')):
                case /status:/.test(triggered_element.attr('id')):
                    var category = triggered_element.attr('id').split(':')[0];
                    action_type += category.charAt(0).toUpperCase() + category.slice(1);
                    if (!triggered_element.is(":checked")) {
                        action_value = '<i class="fa-solid fa-circle-minus text-danger"></i> ' + triggered_element.attr('id').split(':')[1];
                    } else {
                        action_value = '<i class="fa-solid fa-circle-plus text-success"></i> ' + triggered_element.attr('id').split(':')[1];
                    }
                    break;
                case /btn_load/.test(triggered_element.attr('id')):
                    action_type += "Load data";
                    action_value = triggered_element.text();
                    break;
            }

            app.Model.addRecentAction(action_type, action_value);
            app.View.drawRecentActions();
        },

        // Visualization controller methods
        setMasterChart: function (masterChart) {
            app.Model.visualization.masterChart = masterChart;
        },

        setDetailChart: function (detailChart) {
            app.Model.visualization.detailChart = detailChart;
        },

        setColorBy: function (value) {
            app.Model.colorBy = value ? value : $("#select_colorBy").val();
        },

        yValueChanged: function (y_value) {
            app.Model.y_value = y_value;
            if (app.Model.visualization.zoomedDataForDetailChart) {
                app.View.redrawAllCharts();
                app.View.drawDataTable(app.Model.visualization.zoomedDataForDetailChart);
            }
        },

        colorByChanged: function (colorBy_value) {
            app.Model.colorBy = colorBy_value;
            if (app.Model.visualization.zoomedDataForDetailChart) {
                app.View.redrawAllCharts();
                app.View.drawDataTable(app.Model.visualization.zoomedDataForDetailChart);
            }
        },

        markerSizeChanged: function (markerSize_value) {
            app.Configuration.markerSize = markerSize_value;
            app.View.displayMarkerSize(markerSize_value);
            if (app.Model.visualization.zoomedDataForDetailChart)
                app.View.redrawDetailChart({
                    marker: {
                        radius: app.Configuration.markerSize
                    }
                });
        },

        dataTableChanged: function (datatable) {
            app.Model.visualization.datatable = datatable;
        },

        saveZoomedDataForDetailChart: function (newData) {
            app.Model.visualization.zoomedDataForDetailChart = newData;
        },

        saveZoomedDataForMasterChart: function (newData) {
            app.Model.visualization.zoomedDataForMasterChart = newData;
        },

        onZoom: function () {
            let detailChart = app.Model.visualization.detailChart,
                masterChart = app.Model.visualization.masterChart;

            // get limits on masterChart
            const minStartTime = app.Model.visualization.zoomedDataForMasterChart[0][0],
                maxStartTime = app.Model.visualization.zoomedDataForMasterChart[app.Model.visualization.zoomedDataForMasterChart.length - 1][0];

            // change data for detailChart & redraw
            while (detailChart.series.length > 0)
                detailChart.series[0].remove(false);
            app.Model.visualization.zoomedDataForDetailChart.forEach(series => {
                series['marker'] = { 'radius': app.Configuration.markerSize };
                detailChart.addSeries(series, false);
            });

            // reinit dataForMasterChart
            const zoomedDataForDetailChart_Values = app.Model.visualization.zoomedDataForDetailChart.map(series => series.data).reduce((accumulator, currentArray) => {
                return accumulator.concat(currentArray);
            }, []);
            const newTotalJobsPerHour = app.Model.initDataForMasterChart(zoomedDataForDetailChart_Values);

            if (newTotalJobsPerHour.length > 0) {
                const zoomedMinStartTime = newTotalJobsPerHour[0][0],
                    zoomedMaxStartTime = newTotalJobsPerHour[newTotalJobsPerHour.length - 1][0];

                // move the plot bands to reflect the new detail span
                masterChart.axes[0].removePlotBand('mask-before');
                masterChart.axes[0].addPlotBand({
                    id: 'mask-before',
                    from: minStartTime,
                    to: zoomedMinStartTime,
                    color: 'rgba(0, 0, 0, 0.2)'
                });

                masterChart.axes[0].removePlotBand('mask-after');
                masterChart.axes[0].addPlotBand({
                    id: 'mask-after',
                    from: zoomedMaxStartTime,
                    to: maxStartTime,
                    color: 'rgba(0, 0, 0, 0.2)'
                });

                // redraw masterChart
                masterChart.series[0].setData(newTotalJobsPerHour);
                app.Controller.saveZoomedDataForMasterChart(newTotalJobsPerHour);
                masterChart.redraw();

                // redraw detailChart
                app.View.setChartTitle(app.Utils.msFormat(zoomedMinStartTime), app.Utils.msFormat(zoomedMaxStartTime), zoomedDataForDetailChart_Values.length);
                // app.View.setLegendSymbolSize(app.Configuration.legendSymbolSize);
                detailChart.redraw();
                detailChart.hideLoading();

                // redraw durationChart
                app.Controller.reinitDataForDurationChart(app.Model.visualization.zoomedDataForDetailChart.flatMap(group =>
                    group.data.map(item => ({
                        ...item,
                        name: group.name
                    }))
                ));
                app.View.createDurationChart();

                // redraw dataTable
                app.View.drawDataTable(app.Model.visualization.zoomedDataForDetailChart);
            } else {
                app.View.setChartTitle(null, null, 0);
                app.View.resetDataTable();
            }
        },

        reinitDataForDetailChart: function () {
            // Пересоздаём полные данные для детализации
            const dataForDetailChart = app.Model.initDataForDetailChart(app.Model.data_filtered);
            app.Model.visualization.dataForDetailChart = dataForDetailChart;

            // Получаем все job_id из текущего "зумированного" набора
            const currentDetailData = app.Model.visualization.zoomedDataForDetailChart
                .flatMap(series => series.data);

            const currentJobIDsSet = new Set(currentDetailData.map(obj => obj.job_id));

            // Фильтруем новые данные, оставляя только те job_id, что есть в currentJobIDsSet
            app.Model.visualization.zoomedDataForDetailChart = dataForDetailChart.map(series => ({
                ...series,
                data: series.data
                    .filter(obj => currentJobIDsSet.has(obj.job_id))
                    .map(obj => ({ x: obj.x, y: obj.y, job_id: obj.job_id }))
            }));
        },

        reinitDataForDurationChart: function (newData = app.Model.data_filtered) {
            app.Model.visualization.dataForDurationChart = app.Model.initDataForDurationChart(newData);
        },

        reset: function () {
            app.Model.reset();
            app.View.reset();
            this.initiateApp();
        }
    };

    // Start the application
    this.StartApp = function () {
        this.Controller.initiateApp();
    };
};