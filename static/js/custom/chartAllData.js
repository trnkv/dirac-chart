function chartAllData() {
  $.get("static/data/data.csv").done(function (data) {
    //column names:
    //;;result;table;_time;site;user;cpu_norm;job_id;wall_time;hostname;model;status
    DATA = Papa.parse(data, {
      delimiter: ";",
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      fastMode: true,
    }).data;
    console.log(DATA[0]);
    drawHighChart(DATA);
  });
}
