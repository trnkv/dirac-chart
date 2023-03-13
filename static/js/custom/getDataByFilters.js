function getDataByFilters(filters, startTime, endTime, value) {
    let colorFilter = (value === undefined) ? "site" : value.split("_")[0];
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
            "filters[]": filters,
            "start": startTime,
            "end": endTime
        },
    }).done(function(response) {
        $("#data_loading_preloader").css("display", "none");
        $("#spinner p").text("loading");
        GLOBAL_DATA = Papa.parse(response, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            fastMode: true,
        }).data;
        GLOBAL_DATA.forEach(obj => {
            obj['_time'] = Date.parse(obj['_time']);
        });
        if (GLOBAL_DATA.length > 0) {
            DrawHighChart(GLOBAL_DATA, colorFilter);
        } else {
            $('#highcharts-container').html('<h4 class="text-primary">There is no data on this request</h4>\
            <p>Change the request parameters and try again</p>');
        }
    });
}