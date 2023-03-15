function getTotalJobs(data) {
    // new Date(...) - date with timezone!
    
    result = {}
    var allData = data.slice();
    var jobs = allData.map(obj => [new Date(obj._time), new Date(Math.trunc(obj._time + obj.wall_time))]);
    // var hour = Math.floor((jobs[0][0] / (1000 * 60 * 60)) % 24);
    // var timePoint = new Date(jobs[0][0].getFullYear(), jobs[0][0].getMonth(), jobs[0][0].getDate(), hour, 0, 0, 0);
    var periodStart = new Date(jobs[0][0].getFullYear(), jobs[0][0].getMonth(), jobs[0][0].getDate(), jobs[0][0].getHours(), 0, 0, 0);
    var periodEnd = jobs[jobs.length - 1][1]
    var hours = [],
        i = periodStart;
    // get all period hours
    while (i < periodEnd) {
        hours.push(i)
        i = new Date(i.getTime() + (1000 * 60 * 60))
    }
    // get count of working jobs per hour
    for (let i = 0; i < jobs.length; i++) {
        var jobStartHour = jobs[i][0].getHours();
        var timePoint = new Date(jobs[i][0].getFullYear(), jobs[i][0].getMonth(), jobs[i][0].getDate(), jobStartHour, 0, 0, 0);
        if (timePoint in result)
            result[timePoint] += 1
        else result[timePoint] = 1
    }
    result = Object.entries(result);
    result = result.map(pair => [Date.parse(pair[0]), pair[1]]);
    result = result.sort();
    return result;
}