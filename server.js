// dependencies ================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const stylus = require('stylus');
const writeJSON = require('write-json');
const readJSON = require('read-json');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);


// settings ===================================================
app.set('view engine', 'pug');

function compile(str, sPath) {
	return stylus(str)
		.set('filename', sPath)
		.set('compress', true);
}

// routes ======================================================

app.use(stylus.middleware({
	src: path.join(__dirname, '/stylesheets/'),
	dest: path.join(__dirname, '/static/css/'),
	compile,
}));

app.use(express.static('static'));

app.get('/', (req, res) => {
	res.render('index');
});

io.on('connection', function (socket) {
	sendStocks(socket);
	socket.on('search', (data) => {
		autocomplete(socket, data.keyword);
	});
	socket.on('add', (data) => {
		evaluateNew(data.keyword);
	});

	socket.on('remove', (data) => {
		deleteSeries(data.keyword);
	});

});

function deleteSeries(symbol) {
	readJSON('./tickers.json', (err, manifest) => {
		delete manifest[symbol];
		writeJSON('./tickers.json', manifest, (err) => {
			if (!err) {
				io.sockets.emit('del', {
					name: symbol
				});
			}
		});
	});

}

function autocomplete(socket, keyword) {
	http.get('http://dev.markitondemand.com/MODApis/Api/v2/Lookup/json?input=' + keyword, (res) => {
		let data;
		res.on('data', (chunk) => {
			data += chunk;
		});
		res.on('end', () => {
			data = JSON.parse(data.slice(9));
			if (data.length > 0) {

				let names = [];
				let tickers = [];
				data.forEach((item) => {
					names.push(item.Name);
					tickers.push(item.Symbol);
				});

				socket.emit('reply', {
					names,
					tickers,
				});
			}
		});
	});
}

function sendStocks(socket) {
	let i = 0;
	readJSON('./tickers.json', (err, manifest) => {
		for (const prop in manifest) {
			readJSON('./models/' + prop + '.json', (err, data) => {
				socket.emit('new', {
					name: prop,
					data,
				});
				if (++i === Object.keys(manifest).length) {
					socket.emit('draw'); // could set a timeout or make an array of promises but this solution is the simplest
					// if we just put socket emit after the for...in loop, it'll be called async, before there is any data, and the chart is never redrawn
				}
			});
		}
	});
}


// ===============================================================

// fs.access('/etc/passwd', (err) => { // one way to check if a file exists
//   console.log(err ? 'no access!' : 'can read/write');
// });

// Filters out symbols that have already been updated within the past half a day, then sends the results to prepare the request
function evaluateNew(args) {
	args = args.toUpperCase();

	const twelveHours = 43200 * 1000; // UNIX time is in milliseconds
	const now = Date.now();
	readJSON('./alltickers.json', (err, manifest) => {
		if (!manifest[args]) {
			setOptions(args); // doesn't exist, send request
		} else {
			if (now - twelveHours < manifest[args]) { // recently been searched, add our existing data to tickers and redraw
				readJSON('./tickers.json', (err, manifest) => {
					io.sockets.emit('clear');
					manifest[args] = Date.now();
					writeJSON('./tickers.json', manifest, (err) => {
						sendStocks(io.sockets);
					});
				});
				return;
			} else {
				setOptions(args); // old data, send request
			}
		}
	});
}

let markitOptions = {};

function setOptions(args) {
	elements = [{
		"Symbol": args,
		"Type": "price",
		"Params": ["c"],
	}];

	markitOptions = {
		"Normalized": false,
		"NumberOfDays": 365,
		"DataPeriod": 'Day',
		"Elements": elements,
	};

	updateDB(markitOptions);
}

function updateDB(markitOptions) {
	let url = 'http://dev.markitondemand.com/MODApis/Api/v2/InteractiveChart/json?parameters=' + JSON.stringify(markitOptions).replace(/,/g, '%2C').replace(/:/g, '%3A').replace(/"/g, '%22');

	http.get(url, function (res) {
		let data;
		res.on('data', (chunk) => {
			data += chunk;
		});
		res.on('end', () => {
			if (data.includes('!DOCTYPE html')) { // means there was an error in the search or no results; server will crash if we try to parse this html page
				return;
			} else {
				data = JSON.parse(data.slice(9));
				data.Elements.forEach((ele) => {
					let d = []; // format/parse the data for Highstocks to graph
					for (let i = 0; i < data.Dates.length; i++) {
						d.push([new Date(data.Dates[i]).getTime(), ele.DataSeries.close.values[i]]);
					}
					// creates new stock record. overwrites if one already exists.
					writeJSON('./models/' + ele.Symbol + '.json', d, (err) => {
						if (err) console.log(err);
					});
					// updates the date associated with the symbol in the tickers file
					readJSON('./alltickers.json', (err, manifest) => {
						manifest[ele.Symbol] = Date.now();
						writeJSON('./alltickers.json', manifest, (err) => {});
					});
					readJSON('./tickers.json', (err, manifest) => {
						manifest[ele.Symbol] = Date.now();
						writeJSON('./tickers.json', manifest, (err) => {
							if (err) console.log(err);
							io.sockets.emit('clear');
							sendStocks(io.sockets); // sends to all connected sockets
						});
					});
				});

			}

		});
	});
}


server.listen(process.env.PORT || 3000, function () {
	console.log('Listening.');
});
