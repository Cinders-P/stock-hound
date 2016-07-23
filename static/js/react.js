let colors = ["#7cb5ec", "#f7a35c", "#90ee7e", "#7798BF", "#aaeeee", "#ff0066", "#eeaaee", "#55BF3B", "#DF5353", "#7798BF", "#aaeeee"];

const Sidebar = React.createClass({
	displayName: "Sidebar",

	refresh() {
		this.forceUpdate();
	},
	render() {
		tickers = [];
		for (let i = 0; i < series.length; i++) {
			tickers.push(React.createElement(Ticker, { refresh: this.refresh, color: colors[i], stock: series[i].name }));
		}
		return React.createElement(
			"div",
			null,
			React.createElement(InputBox, null),
			React.createElement(
				"div",
				{ id: "tickers" },
				tickers
			),
			React.createElement(
				"small",
				null,
				"Website created by ",
				React.createElement(
					"a",
					{ href: "http://freecodecamp.com/Cinders-P" },
					"Cinders-P"
				),
				React.createElement("br", null)
			)
		);
	}
});

const Ticker = React.createClass({
	displayName: "Ticker",

	removeStock(e) {
		socket.emit('remove', { keyword: this.props.stock });
		const chart = $('#container').highcharts();

		for (let i = 0; i < chart.series.length; i++) {
			if (chart.series[i].name === this.props.stock) {
				chart.series[i].remove(true);
				series.splice(i, 1); // delete keyword leaves an undefined object in the array (?)
			}
		}
	},
	componentDidMount() {
		socket.on('del', this.props.refresh);
	},
	render() {
		let style = {
			borderColor: this.props.color
		};
		return React.createElement(
			"div",
			{ className: "ticker", style: style },
			React.createElement(
				"strong",
				null,
				this.props.stock
			),
			React.createElement("span", { onClick: this.removeStock, className: "fui-cross" })
		);
	}
});

let searchTimeout = '';
const InputBox = React.createClass({
	displayName: "InputBox",

	getInitialState() {
		return {
			val: '',
			results: [],
			tickers: []
		};
	},
	handleChange(e) {
		if (e.target.value === '') {
			this.setState({
				val: e.target.value,
				results: []
			});
		} else {
			this.setState({
				val: e.target.value
			});
		}
	},
	typing() {
		clearTimeout(searchTimeout); // refresh the timeout every time the user adds something, so we don't send 10 useless requests in a row
		searchTimeout = setTimeout(() => {
			this.sendSearch(this.state.val);
		}, 500);
	},
	sendSearch() {
		socket.emit('search', { keyword: this.state.val });
	},
	hotkeys(e) {
		if (e.keyCode === 13) {
			this.addNew();
		} else if (e.keyCode === 8) {
			clearTimeout(searchTimeout);
			this.setState({
				results: [],
				tickers: []
			});
		}
	},
	componentDidMount() {
		socket.on('reply', reply => {
			this.setState({
				results: reply.names,
				tickers: reply.tickers
			});
		});
	},
	listSelect(ticker) {
		clearTimeout(searchTimeout);
		socket.emit('add', { keyword: ticker });
		this.setState({
			val: '',
			results: [],
			tickers: []
		});
	},
	addNew() {
		clearTimeout(searchTimeout);
		socket.emit('add', { keyword: this.state.val });
		this.setState({
			val: '',
			results: [],
			tickers: []
		});
	},
	render() {
		let list = [];
		for (let i = 0; i < this.state.results.length; i++) {
			list.push(React.createElement(
				"p",
				{ className: "form-control", onClick: this.listSelect.bind(this, this.state.tickers[i]) },
				this.state.results[i],
				" (",
				this.state.tickers[i],
				")"
			));
		}
		return React.createElement(
			"div",
			null,
			React.createElement("input", { onKeyDown: this.hotkeys, onKeyPress: this.typing, className: "stockInput form-control", value: this.state.val, onChange: this.handleChange, placeholder: "Search for a stock..." }),
			React.createElement(
				"button",
				{ onClick: this.addNew, type: "button", className: "btn btn-primary" },
				React.createElement("span", { className: "fui-plus" })
			),
			React.createElement(
				"div",
				{ className: "autocomplete" },
				list
			)
		);
	}
});