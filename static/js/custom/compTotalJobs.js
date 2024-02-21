//function getTotalJobs(data) {
// new Date(...) - date with timezone!

//    result = {}
//    var allData = data.slice();
//    console.log(allData);
//    var jobs = allData.map(obj => [new Date(obj.start_time), new Date(Math.trunc(obj.start_time + obj.wall_time))]);
// var hour = Math.floor((jobs[0][0] / (1000 * 60 * 60)) % 24);
// var timePoint = new Date(jobs[0][0].getFullYear(), jobs[0][0].getMonth(), jobs[0][0].getDate(), hour, 0, 0, 0);
//    var periodStart = new Date(jobs[0][0].getFullYear(), jobs[0][0].getMonth(), jobs[0][0].getDate(), jobs[0][0].getHours(), 0, 0, 0);
//    var periodEnd = jobs[jobs.length - 1][1]
//    var hours = [],
//        i = periodStart;
// get all period hours
//    while (i < periodEnd) {
//        hours.push(i)
//        i = new Date(i.getTime() + (1000 * 60 * 60))
//    }
// get count of working jobs per hour
//    for (let i = 0; i < jobs.length; i++) {
//        var jobStartHour = jobs[i][0].getHours();
//        var timePoint = new Date(jobs[i][0].getFullYear(), jobs[i][0].getMonth(), jobs[i][0].getDate(), jobStartHour, 0, 0, 0);
//        if (timePoint in result)
//            result[timePoint] += 1
//        else result[timePoint] = 1
//    }
//    result = Object.entries(result);
//    result = result.map(pair => [Date.parse(pair[0]), pair[1]]);
//    result = result.sort();
//    console.log(result);
//    return result;
//};

function getTotalJobs(data) {
    var result = {},
        allData = data.slice();
    // console.log(allData);
    // var jobs = allData.map(obj => 'wall_time' in obj ? [obj.start_time, Math.trunc(obj.start_time + obj.wall_time * 1000)] : );
    var jobs = [];
    allData.forEach(obj => {
        var y = 'wall_time' in obj ? 'wall_time' : 'y';
        jobs.push([obj.start_time, Math.trunc(obj.start_time + obj[y] * 1000)])
    });
    jobs.sort(function (a, b) { return a[0] - b[0] });
    // console.log(jobs);

    var running_at_time = {};
    var stop_times = [];
    var current = 0;
    for (let i = 0; i < jobs.length; i++) {
        var start = jobs[i][0];
        var stop = jobs[i][1];

        while ((stop_times.length !== 0) && (start > stop_times[0])) {
            current -= 1;
            running_at_time[stop_times[0]] = current;
            stop_times.shift();
        }

        current += 1;
        running_at_time[start] = current;
        stop_times.push(stop);
        stop_times.sort(function (a, b) { return a - b });
    }
    // console.log(running_at_time);

    var result = Object.entries(running_at_time);
    result = result.map(pair => [parseInt(pair[0]), pair[1]]);
    result.sort(function (a, b) { return a[0] - b[0] });
    // console.log(result);

    current_hour_start = Math.floor(result[0][0] / 60 / 60 / 1000) * 60 * 60 * 1000;
    current_hour_end = current_hour_start + 60 * 60 * 1000;
    current_hour_max_value = 0;
    result_data = {};
    for (let i = 0; i < result.length; i++) {
        if (result[i][0] < current_hour_end) {
            current_hour_max_value = Math.max(result[i][1], current_hour_max_value);
            // !!! в result_data никогда ничего не кладётся 
        }
        else {
            // result_data.push([current_hour_start, current_hour_max_value]);
            current_hour_start = Math.floor(result[i][0] / 60 / 60 / 1000) * 60 * 60 * 1000;
            current_hour_end = current_hour_start + 60 * 60 * 1000;
            current_hour_max_value = result[i][1];
        }
        result_data[current_hour_start] = current_hour_max_value;
    }
    // console.log(result_data);
    // result_data = result_data.map(pair => [pair[0], pair[1]]);
    result_data = Object.keys(result_data).map((key) => [Number(key), result_data[key]]);
    // console.log(result_data);
    return result_data;
}