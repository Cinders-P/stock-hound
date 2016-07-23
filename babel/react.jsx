let colors = ["#7cb5ec", "#f7a35c", "#90ee7e", "#7798BF", "#aaeeee", "#ff0066", "#eeaaee",
   "#55BF3B", "#DF5353", "#7798BF", "#aaeeee"];

const Sidebar = React.createClass({
	refresh() {
		this.forceUpdate();
	},
	render() {
		tickers = [];
		for (let i = 0; i < series.length; i++) {
			tickers.push(<Ticker refresh={this.refresh} color={colors[i]} stock={ series[i].name }/>);
		}
		return (
			<div>
				<InputBox />
				<div id="tickers">{tickers}</div>
				<small>Website created by <a href="http://freecodecamp.com/Cinders-P">Cinders-P</a><br/></small>
			</div>
		);
	}
});

const Ticker = React.createClass({
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
			borderColor: this.props.color,
		}
		return <div className='ticker' style={style}><strong>{this.props.stock}</strong><span onClick={this.removeStock} className="fui-cross"></span></div>;
	}
});

let searchTimeout = '';
const InputBox = React.createClass({
	getInitialState() {
		return({
			val: '',
			results: [],
			tickers: [],
		});
	},
	handleChange(e) {
		if (e.target.value === '') {
			this.setState({
				val: e.target.value,
				results: [],
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
				tickers: [],
			});
		}

	},
	componentDidMount() {
		socket.on('reply', (reply) => {
			this.setState({
				results: reply.names,
				tickers: reply.tickers,
			});
		});
	},
	listSelect(ticker) {
		clearTimeout(searchTimeout);
		socket.emit('add', { keyword: ticker });
		this.setState({
			val:  '',
			results: [],
			tickers: [],
		});
	},
	addNew() {
		clearTimeout(searchTimeout);
		socket.emit('add', { keyword: this.state.val });
		this.setState({
			val:  '',
			results: [],
			tickers: [],
		});
	},
	render() {
		let list = [];
		for (let i = 0; i < this.state.results.length; i++) {
			list.push(<p className='form-control' onClick={this.listSelect.bind(this, this.state.tickers[i])} >{this.state.results[i]} ({this.state.tickers[i]})</p>);
		}
		return (
			<div>
				<input onKeyDown={this.hotkeys} onKeyPress={this.typing} className='stockInput form-control' value={this.state.val} onChange={this.handleChange} placeholder='Search for a stock...'></input>
					<button onClick={this.addNew} type='button' className="btn btn-primary">
					<span className="fui-plus"></span>
					</button>
				<div className='autocomplete'>
					{list}
				</div>
			</div>
		);
	}
});
