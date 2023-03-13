function chartAllData() {
    $.get("static/data/data.csv").done(function(data) {
        DATA = Papa.parse(data, {
            delimiter: ";",
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            fastMode: true,
        }).data;
        DrawHighChart(DATA);
    });
}