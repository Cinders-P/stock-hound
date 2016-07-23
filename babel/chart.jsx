const socket = io();
let series =  [];

// Load the fonts
Highcharts.createElement('link', {
   href: 'https://fonts.googleapis.com/css?family=Dosis:400,600',
   rel: 'stylesheet',
   type: 'text/css'
}, null, document.getElementsByTagName('head')[0]);

Highcharts.theme = {
   colors: ["#7cb5ec", "#f7a35c", "#90ee7e", "#7798BF", "#aaeeee", "#ff0066", "#eeaaee",
      "#55BF3B", "#DF5353", "#7798BF", "#aaeeee"],
   chart: {
      backgroundColor: null,
	//   height: 500,
	//   width: 900,
      style: {
         fontFamily: "Dosis, sans-serif"
      }
   },
   title: {
      style: {
         fontSize: '16px',
         fontWeight: 'bold',
         textTransform: 'uppercase'
      }
   },
   tooltip: {
      borderWidth: 0,
      backgroundColor: 'rgba(219,219,216,0.8)',
      shadow: false
   },
   legend: {
      itemStyle: {
         fontWeight: 'bold',
         fontSize: '13px'
      }
   },
   xAxis: {
      gridLineWidth: 1,
      labels: {
         style: {
            fontSize: '12px'
         }
      }
   },
   yAxis: {
      minorTickInterval: 'auto',
      title: {
         style: {
            textTransform: 'uppercase'
         }
      },
      labels: {
         style: {
            fontSize: '12px'
         }
      }
   },
   plotOptions: {
      candlestick: {
         lineColor: '#404048'
      }
   },


   // General
   background2: '#F0F0EA'

};

// Apply the theme
Highcharts.setOptions(Highcharts.theme);

$(function() {
	socket.on('clear', function() {
		series = [];
	});

	socket.on('del', function(data) {
		const chart = $('#container').highcharts();

		for (let i = 0; i < chart.series.length; i++) {
			if (chart.series[i].name === data.name) {
				chart.series[i].remove(true);
				series.splice(i, 1); // delete keyword leaves an undefined object in the array (?)
			}
		}
		$('#container').css('width', '80%').css('height', '80%'); // clear messes the size up
		setTimeout(() => {
			$('#container').css('width', '80%').css('height', '80%');
		}, 2000);
	});

    socket.on('new', function(data) {
		series.push({ name: data.name, data: data.data, tooptip: { valueDecimals: 2, }});
    });
	socket.on('draw', function() {

		$('#container').highcharts('StockChart', {
			rangeSelector: {
				selected: 1
			},

			title: {
				text: ''
			},

			series,
		});

		ReactDOM.render(<Sidebar />, document.getElementById('sidebar'));

	});
});
