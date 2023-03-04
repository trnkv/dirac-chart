function getDataByFilters(filters, startTime, endTime, value) {
    let color_filter = (value === undefined) ? "site" : value.split("_")[0];
    $.ajax({
        url: "get_data_by_filters",
        data: {
            "filters[]": filters,
            "start": startTime,
            "end": endTime
        },
    }).done(function(response) {
        $("#data_loading_preloader").css("display", "none");
        DATA = Papa.parse(response, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            fastMode: true,
        }).data;
        DATA.forEach(obj => {
            obj['_time'] = Date.parse(obj['_time']);
        });
        if (DATA.length >= 5000) {
            if (confirm(`Number of points: ${DATA.length}. Are you sure to display all points?`)) {
                drawHighChart(DATA, color_filter);
            }
        } else if (DATA.length > 0) {
            drawHighChart(DATA, color_filter);
        } else {
            $('#highcharts-container').html('<h4 class="text-primary">There is no data on this request</h4>\
            <p>Change the request parameters and try again</p>');
        }
    });
}