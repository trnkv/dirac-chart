var DiracChart = function() {
    var app = this;
    
    this.StartApp =  function() {
        this.Controller.initiateApp();
    };

    this.Configuration = {
        data_source_url: "https://t1services.jinr.ru/rest/SSB/lastStatus?site_name=T1_RU_JINR",
        startTime: moment(new Date(2020, 0, 1)),
        datetime_format: 'YYYY-MM-DD HH:mm:ss',
    };

    this.Utils ={
        getDuration: function(time) {
            var now = new Date().getTime();
            var error_time = new Date(time);
            return moment.duration(now - error_time).humanize();
        },

        waitForRender: function() {
            setTimeout(console.log, 50);
        },

    };

    this.Model = {
        data: null,
        filters: null,
        startTime: null,
        endTime: null,
        checkedFilters: null,
        colorFilter: null,
        done_handler: null,

        initiateModel: function() {
            this.startTime = app.Configuration.startTime.format(app.Configuration.datetime_format);
            this.endTime = moment().format(app.Configuration.datetime_format);
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

        setCheckedFilters: function(checkedFilters) {
            this.checkedFilters = checkedFilters;
        },

        parseDataCSV: function() {
            this.data = Papa.parse(this.dataCSV, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                fastMode: true,
            }).data;
            this.data.forEach(obj => {
                // переводим в локальную и преобразовываем в миллисекунды (т.к. xAxis в master в датах умеет работать только с мс)
                obj['start_time'] = new Date(obj['start_time']).getTime()
                obj['x'] = obj['start_time']
            })
        },

        getDataByFilters: function(done_handler) {
            this.colorFilter = $("#select_color_filter").val();
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
                    "filters[]": app.Model.checkedFilters,
                    "start": app.Model.startTime,
                    "end": app.Model.endTime
                },
                async: true,
            }).done(function(response) {
                app.Model.dataCSV = response;
                app.Model.done_handler = done_handler;
                $("#spinner p").text("processing");
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
        }
    };

    this.View = {

        waitForRender: function() {
            console.log("waiting for render");
        },

        showTooltip: function(el) {
            $(".tooltip").remove();
            var show_btn = $("<button />", {
                text: 'Show',
                class: 'btn btn-primary',
                click: function () {
                    if (FILTERS.length > 0) {
                        $("#data_loading_preloader").css("display", "block");
                        getDataByFilters(FILTERS, START_TIME, END_TIME);
                    };
                    $(".tooltip").remove();
                }
            });
            var tooltip = new bootstrap.Tooltip(el, {
                template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
                placement: 'auto',
                html: true,
                title: show_btn,
                trigger: "click manual",
            });
            tooltip.show();
        },

        createDateRangePicker: function() {
            var start = moment(new Date(2020, 0, 1));
            var end = moment();

            function cb(start, end) {
                $('#reportrange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
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

        initiateView: function() {
            var start_end = this.createDateRangePicker();
            START_TIME = start_end[0].format(app.Configuration.datetime_format);
            END_TIME = start_end[1].format(app.Configuration.datetime_format);
            $('#reportrange').on('apply.daterangepicker', function(ev, picker) {
                START_TIME = picker.startDate.format(dt_format);
                END_TIME = picker.endDate.format(dt_format);
                this.showTooltip($(this));
            });

            $('#btn_load_all').click(function(){
                app.Controller.loadAllData();
            });

            $('#btn_load_filtered').click(function(){
                app.Controller.loadFilteredData();
            });
        },

        drawFilter: function(selector, value, text) {
            $(selector).append(`\
                <div class="form-check">\
                <input class="form-check-input" type="checkbox" checked value="${value}" id="${value}">\
                <label class="form-check-label" for="${value}">\
                    ${text}\
                </label>\
                </div>`
            );
        },

        drawFilters: function(filters) {
            $("#data_loading_preloader").css("display", "none");
            for (category in filters) {
                let id_name = "#" + category + "-selector p";
                for (element in filters[category]) {
                    var value = category + ":" + filters[category][element];
                    var caption = filters[category][element];
                    this.drawFilter(id_name, value, caption);
                }
            }
        },

        drawData: function(data) {
            if (data.length > 0) {
                DrawHighChart(data);
            } else {
                $('#highcharts-container').html('<h4 class="text-primary">There is no data on this request</h4>\
                <p>Change the request parameters and try again</p>');
            }
        },

        getCheckedFilters: function() {
            var checkedFilters=[];
            $("input[type=checkbox]:checked").each(function() {
                checkedFilters.push($(this).val())
            });
            console.log(checkedFilters);       
            return checkedFilters;
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
            $("#data_loading_preloader").css("display", "block");
            app.Model.getAllData(this.dataLoaded);
        },

        loadDataByFilters: function() {
            let checkedFilters = app.View.getCheckedFilters();
            app.Model.setCheckedFilters(checkedFilters);
            app.Model.getDataByFilters(this.dataLoaded);
        },

        dataLoaded: function() {
            app.View.drawData(app.Model.data);
            $("#data_loading_preloader").css("display", "none");
        },


    }
}