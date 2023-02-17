function drawHighChart(data, filter) {
  let detailChart,
    DATA = [];

  function prepareData() {
    if (filter === undefined) filter = "site";
    data.forEach((obj) => {
      for (var i = 0; i < DATA.length; i++) {
        if (DATA[i].name == obj[filter]) {
          DATA[i].data.push({
            x: obj.cpu_norm,
            y: obj.wall_time,
            wall_time: secondsToDhms(obj.wall_time),
            time: obj._time,
            site: obj.site,
            user: obj.user,
            job_id: obj.job_id,
            hostname: obj.hostname,
            model: obj.model,
            status: obj.status,
          });
          return;
        }
      }
      DATA.push({
        name: obj[filter],
        data: [
          {
            x: obj.cpu_norm,
            y: obj.wall_time,
            wall_time: secondsToDhms(obj.wall_time),
            time: obj._time,
            site: obj.site,
            user: obj.user,
            cpu_norm: obj.cpu_norm,
            job_id: obj.job_id,
            hostname: obj.hostname,
            model: obj.model,
            status: obj.status,
          },
        ],
      });
    });
    return DATA;
  }

  // create the detail chart
  function createDetail(masterChart) {
    // prepare the detail chart
    var detailData = [],
      detailStart = data[0]["_time"];

    masterChart.series[0].data.forEach((point) => {
      console.log(point);
      if (point.x >= detailStart) {
        detailData.push(point.y);
      }
    });

    // create a detail chart referenced by a global variable
    detailChart = Highcharts.chart("detail-container", {
      chart: {
        marginBottom: 120,
        reflow: false,
        marginLeft: 50,
        marginRight: 20,
        style: {
          position: "absolute",
        },
      },
      credits: {
        enabled: false,
      },
      title: {
        text: "Dirac Chart",
        align: "left",
      },
      subtitle: {
        text: "Select an area by dragging across the lower chart",
        align: "left",
      },
      xAxis: {
        type: "datetime",
      },
      yAxis: {
        title: {
          text: null,
        },
        maxZoom: 0.1,
      },
      tooltip: {
        formatter: function () {
          var point = this.points[0];
          return (
            "<b>" +
            point.series.name +
            "</b><br/>" +
            this.x +
            ":<br/>" +
            "1 USD = " +
            point.y +
            " EUR"
          );
        },
        shared: true,
      },
      legend: {
        enabled: false,
      },
      plotOptions: {
        series: {
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: true,
                radius: 3,
              },
            },
          },
        },
      },
      series: [
        {
          name: "USD to EUR",
          pointStart: detailStart,
          // pointInterval: 24 * 3600 * 1000,
          data: detailData,
        },
      ],

      exporting: {
        enabled: false,
      },
    }); // return chart
  }

  // create the master chart
  function createMaster(data) {
    Highcharts.chart(
      "master-container",
      {
        chart: {
          type: "scatter",
          zoomType: "xy"
        },
        boost: {
          useGPUTranslations: true,
          usePreAllocated: true,
        },
        title: {
          text: "Performance monitoring",
          align: "center",
        },
        xAxis: {
          title: {
            text: "CPU norm",
          },
          labels: {
            format: "{value}",
          },
          startOnTick: true,
          endOnTick: true,
          showLastLabel: true,
        },
        yAxis: {
          title: {
            text: "WallTime (secs)",
          },
          labels: {
            format: "{value}",
          },
        },
        legend: {
          enabled: true,
        },
        plotOptions: {
          scatter: {
            marker: {
              radius: 1,
              symbol: "circle",
              states: {
                hover: {
                  enabled: true,
                  lineColor: "rgb(100,100,100)",
                },
              },
            },
            states: {
              hover: {
                marker: {
                  enabled: false,
                },
              },
            },
          },
          series: {
            turboThreshold: 0,
          },
        },
        tooltip: {
          formatter: function () {
            return (
              "<b>CPU norm:</b> " +
              this.x +
              "<br>" +
              "<b>Wall Time:</b> " +
              this.point.wall_time +
              "<br>" +
              "<b>Time:</b> " +
              this.point.time +
              "<br>" +
              "<b>Site:</b> " +
              this.point.site +
              "<br>" +
              "<b>User:</b> " +
              this.point.user +
              "<br>" +
              "<b>Job_ID:</b> " +
              this.point.job_id +
              "<br>" +
              "<b>Hostname:</b> " +
              this.point.hostname +
              "<br>" +
              "<b>Model:</b> " +
              this.point.model +
              "<br>" +
              "<b>Status:</b> " +
              this.point.status
            );
          },
        },
        series: data,
      },
      (masterChart) => {
        // createDetail(masterChart);
      }
    ); // return chart instance
  }

  // make the container smaller and add a second container for the master chart
  const container = document.getElementById("highcharts-container");
  container.style.position = "relative";
  container.innerHTML +=
    '<div id="detail-container"></div><div id="master-container"></div>';

  DATA = prepareData();
  console.log(DATA[0]);
  // create master and in its callback, create the detail chart
  createMaster(DATA);
}
