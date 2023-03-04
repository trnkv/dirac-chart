function createDateRangePicker() {
    var start = moment().subtract(5, 'years'); //moment().subtract(29, 'days');
    var end = moment();

    function cb(start, end) {
        $('#reportrange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
    }

    $('#reportrange').daterangepicker({
        timePicker: true,
        startDate: start,
        endDate: end,
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
            'All Data': ['01.01.1923', moment()]
        }
    }, cb);

    cb(start, end);

    return [start, end];
}