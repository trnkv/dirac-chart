function getDataByFilters(filters, value) {
  $.ajax({
    url: "get_data_by_filters",
    data: {
      "filters[]": filters,
    },
  }).done(function (response) {
    DATA = Papa.parse(response, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      fastMode: true,
    }).data;
    if (value === undefined) value = "site";
    else value = value.split("_")[0];
    drawHighChart(DATA, value);
  });
}
