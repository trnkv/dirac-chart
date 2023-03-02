function drawColorFilters(options_titles_array, select) {
    select.find('option').remove();
    $.each(options_titles_array, function(i, filter_title) {
        select.append($('<option>', {
            value: filter_title.value,
            text: filter_title.text
        }));
    });
}