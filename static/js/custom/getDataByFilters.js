function getDataByFilters(filters, startTime, endTime, value) {
    $("#data_loading_preloader").css("display", "block");
    console.log(startTime);
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
        if (DATA.length >= 500) {
            if (confirm(`Number of points: ${DATA.length}. Are you sure to display all points?`)) {
                if (value === undefined) value = "site";
                else value = value.split("_")[0];
                drawHighChart(DATA, value);
            }
        } else if (DATA.length > 0) {
            if (value === undefined) value = "site";
            else value = value.split("_")[0];
            drawHighChart(DATA, value);
        } else {
            $('#highcharts-container').html('<h4 class="text-primary">There is no data on this request</h4>\
            <p>Change the request parameters and try again</p>');
        }
    });
}