function CacheManager() {
	this.Zb = new Zobrist();
	this.cache = cache;
	this.query = query;
	this.clear = clear;
	this.stringify = stringify;
	this.count = 0;
	this.data = {};

	function cache(grid, type, result, depth) {
		if (!['tile', 'move'].includes(type)) {
			throw new TypeError('Cache type must be one of the following: tile, move');
		}

		const key = this.Zb.calc(grid);
		result.depth = depth;
		this.data[key] = {...this.data[key] || {}, [type]: result};
	}

	function query(grid, type, depth) {
		if (!['tile', 'move'].includes(type)) {
			throw new TypeError('Cache type must be one of the following: tile, move');
		}

		const key = this.Zb.calc(grid);
		const cacheExist = this.data.hasOwnProperty(key) && this.data[key].hasOwnProperty(type);
		const cacheValid = cacheExist && this.data[key][type].depth >= depth;
		cacheValid && this.count++;
		return cacheValid ? this.data[key][type] : null;
	}

	function clear() {
		this.count = 0;
		this.data = {};
	}

	function stringify(grid) {
		return grid.cells.reduce((pre, cur) => {
			return pre.concat(cur);
		}, []).map(tile => tile !== null ? tile.value : '').join(',');
	}
}

function Zobrist(initial_hash) {
	this.initial_hash = initial_hash || random();
	this.hash = this.initial_hash;
	this.table = [];
	this.init = init;
	this.calc = calc;
	this.zobrist = zobrist;
	this.init();

	function init() {
		for (let x = 0; x < 4; x++) {
			this.table[x] = [];
			for (let y = 0; y < 4; y++) {
				this.table[x][y] = {};
				for (let n = 0; n <= 17; n++) {
					this.table[x][y][2**n] = random();
				}
			}
		}
	}

	function calc(grid) {
		let hash = this.initial_hash;
		for (let x = 0; x < 4; x++) {
			for (let y = 0; y < 4; y++) {
				hash ^= this.table[x][y][(grid.cells[x][y] || {value: 1}).value];
			}
		}
		return hash;
	}

	function zobrist(x, y, ...values) {
		values.forEach(v => this.hash ^= v);
		return this.hash;
	}

	function random() {
		const array = new Uint32Array(1);
		window.crypto.getRandomValues(array);
		return array[0];
	}
}