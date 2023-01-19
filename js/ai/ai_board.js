// An AI-board for 2048, makes 2048 much easier to play!
// needs to be executed just before application.js

const gamePadSim = new GamePadSimulator();
const Cacher = new CacheManager();
const AI = new AIBoard(GameManager, gamePadSim, 4, 'lowest', false);

function AIBoard(GameManager, gamePadSim, calcDepth, mode='highest', cooperate=false) {
	this.init = init;
	this.calcBestTileToAdd = calcBestTileToAdd;
	this.calcDepth = calcDepth;
	this.calcTile = calcTile;
	this.calcMove = calcMove;
	this.sortTiles = sortTiles;
	this.evaluate = evaluate;
	this.pre_evaluate = pre_evaluate;
	this.randint = randint;
	this.performance = {cutcount: 0, allcutcount: 0, calccount: 0}
	this.init();

	function init() {
		const self = this;
		const setup = GameManager.prototype.setup;
		GameManager.prototype.setup = function() {
			self.gameManager = this;
			return setup.apply(this, arguments);
		}
		GameManager.prototype.addRandomTile = function() {
			const tile = self.calcBestTileToAdd();
			this.grid.insertTile(tile);
		};
	}

	function calcBestTileToAdd() {
		/* random
		var value = Math.random() < 0.9 ? 2 : 4;
		var tile = new Tile(this.gameManager.grid.randomAvailableCell(), value);

		return tile;
		*/
		this.performance.calccount++;
		const tiles = this.calcTile(mode, this.gameManager.grid, this.calcDepth);
		const tile = tiles.tiles[randint(0, tiles.tiles.length-1)];
		const found = tiles.tiles.length < this.gameManager.grid.availableCells().length*2;
		console.log('%c%s%s%s%s%s%o%o', `color: ${found ? 'yellow' : 'white'}`, `${found ? 'FOUND' : 'noyet'}\n`, `Cache queried ${Cacher.count} times\n`, `Cut ${this.performance.cutcount} times\n`, `average cut ${this.performance.allcutcount / this.performance.calccount}\n`, `calculated ${this.performance.calccount} times\n`, tiles, tile);
		Cacher.clear();
		this.performance.cutcount = 0;
		return tile;
	}

	// Get tiles that has the highest/lowest score (specified in mode)
	// returns: {score, tiles=[all tiles for this score]}
	function calcTile(mode, grid, depth, parentBest=null) {
		// Query cached result
		const cached = Cacher.query(grid, 'tile', depth);
		if (cached) {
			return cached;
		}

		// Calc
		const self = this;
		depth--;

		const tiles = this.sortTiles(mode, grid, !cooperate && depth >= 2 ? 2 : 1);
		const best = {score: ({'lowest': Infinity, 'highest': -Infinity})[mode], tiles: []};
		for (const tile of tiles) {
			// Create a new grid and try insert
			const gridState = grid.serialize();
			const tryGrid = new Grid(gridState.size, gridState.cells);
			tryGrid.insertTile(tile);

			// Calc deeper if depth > 0, or evaluate score directly
			const score = depth ? self.calcMove(cooperate ? mode : ({'lowest': 'highest', 'highest': 'lowest'})[mode], tryGrid, depth, best).score : evaluate(tryGrid);
			if (({'lowest': score < best.score, 'highest': score > best.score})[mode]) {
				best.score = score;
				best.tiles = [tile];
			} else if (score === best.score) {
				best.tiles.push(tile);
			}

			// Cut
			if (parentBest && !cooperate && ({'lowest': score < parentBest.score, 'highest': score > parentBest.score})[mode]) {
				this.performance.cutcount++;
				this.performance.allcutcount++;
				break;
			}
		}
		if (Math.abs(best.score) === Infinity) {
			best.score = -Infinity;
		}

		// Cache result
		Cacher.cache(grid, 'tile', best, depth);
		return best;
	}

	// Get moves that has the highest/lowest score (specified in mode)
	// returns: {score, moves=[all moves for this score]}
	function calcMove(mode, grid, depth, parentBest=null) {
		// Query cached result
		const cached = Cacher.query(grid, 'move', depth);
		if (cached) {
			return cached;
		}

		// Calc
		const self = this;
		depth--;

		const best = {score: ({'lowest': Infinity, 'highest': -Infinity})[mode], moves:[]};
		for (const direction of [0, 1, 2, 3]) {
			// Create a new grid and try move
			const gridState = grid.serialize();
			const tryGrid = new Grid(gridState.size, gridState.cells);
			const moved = gamePadSim.move(tryGrid, direction);
			if (!moved) {continue;}

			// Calc deeper if depth > 0, or evaluate score directly
			const score = depth ? self.calcTile(cooperate ? mode : ({'lowest': 'highest', 'highest': 'lowest'})[mode], tryGrid, depth, best).score : evaluate(tryGrid);
			if (({'lowest': score < best.score, 'highest': score > best.score})[mode]) {
				best.score = score;
				best.moves = [direction];
			} else if (score === best.score) {
				best.moves.push(direction);
			}

			// Cut
			if (parentBest && !cooperate && ({'lowest': score < parentBest.score, 'highest': score > parentBest.score})[mode]) {
				this.performance.cutcount++;
				this.performance.allcutcount++;
				break;
			}
		}
		if (Math.abs(best.score) === Infinity) {
			best.score = -Infinity;
		}

		// Cache result
		Cacher.cache(grid, 'move', best, depth);
		return best;
	}

	function sortTiles(mode, grid, depth) {
		depth--;

		// Get all available tiles and get their score
		const tiles = [];
		for (const cell of grid.availableCells()) {
			for (const value of [2, 4]) {
				// Create a new grid and try insert
				const gridState = grid.serialize();
				const tryGrid = new Grid(gridState.size, gridState.cells);
				const tile = new Tile(cell, value);
				tryGrid.insertTile(tile);

				// Calc score
				//const score = depth ? this.calcMove(cooperate ? mode : ({'lowest': 'highest', 'highest': 'lowest'})[mode], tryGrid, depth) : evaluate(tryGrid);
				const score = this.pre_evaluate(tryGrid);
				tile.score = score;
				tiles.push(tile);
			}
		}

		// Sort tiles by score and delete score property
		tiles.sort((t1, t2) => ({'lowest': t1.score - t2.score, 'highest': t2.score - t1.score})[mode]);
		tiles.forEach(t => delete t.score);
		return tiles;
	}

	function evaluate(grid) {
		return grid.availableCells().length;
	}

	function pre_evaluate(grid) {
		let score = 0;
		const vectors = [0,1,2,3].map(d => gamePadSim.getVector(d));
		grid.eachCell((x, y, tile) => {
			for (const vector of vectors) {
				const pos = gamePadSim.findFarthestPosition(grid, {x: x, y: y}, vector);
				const next = grid.cellContent(pos.next);
				if (tile && next && next.value) {
					score += ({
						0.25: 1,
						4: 1,
						0.5: 2,
						2: 2,
						1: 4
					})[next.value / tile.value] || 0;
				}
			}
		});
		return score;
	}

	function randint(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
}