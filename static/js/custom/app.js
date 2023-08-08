var DiracChart = function() {
    var app = this;

    this.StartApp = function() {
        this.Controller.initiateApp();
    };

    this.Configuration = {
        data_source_url: "https://t1services.jinr.ru/rest/SSB/lastStatus?site_name=T1_RU_JINR",
        startTime: moment(new Date(2020, 0, 1)),
        datetime_format: 'YYYY-MM-DD HH:mm:ss',
        markerSize: 1.0
    };

    this.Utils = {
        getDuration: function(time) {
            var now = new Date().getTime();
            var error_time = new Date(time);
            return moment.duration(now - error_time).humanize();
        },

    };

    this.Model = {
        base_data: null,
        data_filtered: null,
        filters: null,
        startTime: null,
        endTime: null,
        colorBy: null,
        markerSize: null,
        done_handler: null,

        initiateModel: function() {
            this.startTime = app.Configuration.startTime.format(app.Configuration.datetime_format);
            this.endTime = moment().format(app.Configuration.datetime_format);
            this.markerSize = app.Configuration.markerSize;
        },

        reset: function() {
            this.base_data = null;
            this.data_filtered = null;
            this.filters = null;
            this.startTime = null;
            this.endTime = null;
            this.colorBy = null;
            this.markerSize = null;
            this.done_handler = null;
        },

        getFilters: function() {
            $.ajax({
                url: "get_filters",
                async: false,
            }).done(function(response) {
                app.Model.filters = response["filters"];
                app.Model.currentFilters = this.filters;
                console.log("Model: SUCCESS - filters successfully loaded");
            }).fail(function(response) {
                console.log("Model: ERROR - filter loading issue" + response);
            })
        },

        parseDataCSV: function() {
            this.base_data = Papa.parse(this.dataCSV, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                fastMode: true,
            }).data;
            this.base_data.forEach(obj => {
                // переводим в локальную и преобразовываем в миллисекунды (т.к. xAxis в master в датах умеет работать только с мс)
                obj['start_time'] = new Date(obj['start_time']).getTime()
                obj['x'] = obj['start_time']
            })
            this.data_filtered = Object.assign([], this.base_data);
        },

        getDataByFilters: function(done_handler, checkedFilters, startTime, endTime) {
            this.colorBy = $("#select_colorBy").val();
            $.ajax({
                xhr: function() {
                    var xhr = new window.XMLHttpRequest();
                    xhr.addEventListener("progress", function(evt) {
                        if (evt.lengthComputable) {
                            // var percentComplete = Math.round(evt.loaded / evt.total);
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
            }).done(function(response) {
                app.Model.dataCSV = response;
                app.Model.done_handler = done_handler;
                $("#spinner p").text("process");
                setTimeout(app.Model.processData, 100);
            });
        },

        getAllData: function(done_handler) {
            $.ajax({
                xhr: function() {
                    var xhr = new window.XMLHttpRequest();
                    xhr.addEventListener("progress", function(evt) {
                        if (evt.lengthComputable) {
                            // var percentComplete = Math.round(evt.loaded / evt.total);
                            $("#spinner p").text(`${Math.round(evt.loaded * 9.54 * Math.pow(10, -7))} MB`);
                        }
                    }, false);
                    return xhr;
                },
                url: "get_all_data",
                async: true,
            }).done(function(response) {
                app.Model.dataCSV = response;
                app.Model.done_handler = done_handler;
                $("#spinner p").text("processing");
                setTimeout(app.Model.processData, 100);
            });
        },

        processData: function() {
            app.Model.parseDataCSV();
            //console.log(app.Model.data);
            app.Model.done_handler();
        },

        applyFilters: function(checked_filters) {
            filters = {
                'site': [],
                'owner': [],
                'status': [],
            };
            checked_filters.forEach(element => {
                category = element.split(':')[0];
                value = element.split(':')[1];
                filters[category].push(value);
            });
            app.Model.data_filtered = [];
            app.Model.data_filtered = app.Model.base_data.filter(function(el) {
                return filters['site'].includes(el.site) &&
                    filters['owner'].includes(el.owner) &&
                    filters['status'].includes(el.status);
            });
        },
    };

    this.View = {

        createDateRangePicker: function() {
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

        showPreloader: function() {
            $("#data_loading_preloader").css("display", "block");
        },

        hidePreloader: function() {
            $("#data_loading_preloader").css("display", "none");
        },

        initiateView: function() {
            var start_end = this.createDateRangePicker();
            app.View.start_time = start_end[0].format(app.Configuration.datetime_format);
            app.View.end_time = start_end[1].format(app.Configuration.datetime_format);
            $("#select_marker_size").val(app.Model.markerSize);
            $('#reportrange').on('apply.daterangepicker', function(ev, picker) {
                app.View.start_time = picker.startDate.format(app.Configuration.datetime_format);
                app.View.end_time = picker.endDate.format(app.Configuration.datetime_format);
            });

            $('#btn_load_all').click(function() {
                app.Controller.loadAllData();
            });

            $('#btn_load_filtered').click(function() {
                app.Controller.loadDataByFilters();
            });

            $('#btn_reset').click(function() {
                app.Controller.reset();
            });

            $('#btn_select_all_sites').click(function() {
                app.View.check_all("site");
            });

            $('#btn_select_none_sites').click(function() {
                app.View.check_none("site");
            });

            $('#btn_select_all_owners').click(function() {
                app.View.check_all("owner");
            });

            $('#btn_select_none_owners').click(function() {
                app.View.check_none("owner");
            });

            $('#btn_select_all_statuses').click(function() {
                app.View.check_all("status");
            });

            $('#btn_select_none_statuses').click(function() {
                app.View.check_none("status");
            });

            $("#select_colorBy").on('change', function() {
                app.Controller.colorBy_Changed($(this).val());
                app.View.redrawByColorFilter();
            });

            // change marker size
            $("#select_marker_size").on('input', function() {
                app.View.displayMarkerSize((Number($(this).val())).toFixed(1));
            });
            $("#select_marker_size").on('change', function() {
                app.Controller.markerSize_Changed(Number($(this).val()));
                app.View.changeMarkerSize();
            });
        },

        drawFilter: function(selector, value, text) {
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

        drawFilters: function(filters) {
            app.View.hidePreloader();
            for (category in filters) {
                let id_name = "#" + category + "-selector";
                for (element in filters[category]) {
                    var value = category + ":" + filters[category][element];
                    var caption = filters[category][element];
                    this.drawFilter(id_name, value, caption);
                }
            }

            $("input[type=checkbox]").change(function() {
                app.Controller.filtersChanged();
            });
        },

        drawData: function(data, markerSize, colorBy) {
            if (data.length > 0) {
                DrawHighChart(data, markerSize, colorBy);
            } else {
                $('#highcharts-container').html('<h4 class="text-primary">There is no data on this request</h4>\
                <p>Change the request parameters and try again</p>');
            }
        },

        getCheckedFilters: function() {
            var checkedFilters = [];
            $("input[type=checkbox]:checked").each(function() {
                checkedFilters.push($(this).attr('id'))
            });
            // console.log("Checked filters: ", checkedFilters);
            return checkedFilters;
        },

        leaveOnlyCheckedFilters: function() {
            $("input[type=checkbox]:not(:checked)").parent().parent().parent().remove();
        },

        check_all: function(category) {
            $(`input[type=checkbox].${category}-checkbox`).prop('checked', true);
        },

        check_none: function(category) {
            $(`input[type=checkbox].${category}-checkbox`).prop('checked', false);
        },

        reset: function() {
            $("input[type=checkbox]").parent().remove();
        },

        redrawByColorFilter: function() {
            this.drawData(app.Model.data_filtered, app.Model.markerSize, app.Model.colorBy);
        },

        displayMarkerSize: function(markerSize_value) {
            $("#marker_size_value").html(markerSize_value);
        },

        changeMarkerSize: function() {
            redrawByMarkerSize(app.Model.markerSize); // in DrawHighChart.js
        }
    };

    this.Controller = {
        initiateApp: function() {
            app.Model.initiateModel();
            app.View.initiateView();
            app.Model.getFilters();
            app.View.drawFilters(app.Model.filters);
        },

        loadAllData: function() {
            app.View.showPreloader();
            app.Model.getAllData(this.dataLoaded);
        },

        loadDataByFilters: function() {
            app.View.leaveOnlyCheckedFilters();
            let checkedFilters = app.View.getCheckedFilters();
            start_time = app.View.start_time;
            end_time = app.View.end_time;
            app.View.showPreloader();
            app.Model.getDataByFilters(this.dataLoaded, checkedFilters, start_time, end_time);
        },

        dataLoaded: function() {
            app.View.drawData(app.Model.data_filtered, app.Model.markerSize);
            app.View.hidePreloader();
        },

        reset: function() {
            app.Model.reset();
            app.View.reset();
            app.Controller.initiateApp();
        },

        filtersChanged: function() {
            if (app.Model.base_data) {
                let checkedFilters = app.View.getCheckedFilters();
                app.Model.applyFilters(checkedFilters);
                app.View.drawData(app.Model.data_filtered, app.Model.markerSize);
            }
        },

        colorBy_Changed: function(colorBy_value) {
            app.Model.colorBy = colorBy_value;
        },

        markerSize_Changed: function(markerSize_value) {
            app.Model.markerSize = markerSize_value;
        }
    }
}