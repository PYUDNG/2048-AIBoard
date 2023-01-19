function GamePadSimulator() {
	this.move = move;
	this.getVector = getVector;
	this.buildTraversals = buildTraversals;
	this.prepareTiles = prepareTiles;
	this.findFarthestPosition = findFarthestPosition;
	this.moveTile = moveTile;
	this.positionsEqual = positionsEqual;

	function move(grid, direction) {
		// 0: up, 1: right, 2: down, 3: left
		var self = this;

		var cell, tile;

		var vector = this.getVector(direction);
		var traversals = this.buildTraversals(grid, vector);
		var moved = false;

		// Save the current tile positions and remove merger information
		this.prepareTiles(grid);

		// Traverse the grid in the right direction and move tiles
		traversals.x.forEach(function(x) {
			traversals.y.forEach(function(y) {
				cell = {x: x, y: y};
				tile = grid.cellContent(cell);

				if (tile) {
					var positions = self.findFarthestPosition(grid, cell, vector);
					var next = grid.cellContent(positions.next);

					// Only one merger per row traversal?
					if (next && next.value === tile.value && !next.mergedFrom) {
						var merged = new Tile(positions.next, tile.value * 2);
						merged.mergedFrom = [tile, next];

						grid.insertTile(merged);
						grid.removeTile(tile);

						// Converge the two tiles' positions
						tile.updatePosition(positions.next);

						// Update the score
						self.score += merged.value;

						// The mighty 2048 tile
						if (merged.value === 2048) self.won = true;
					} else {
						self.moveTile(grid, tile, positions.farthest);
					}

					if (!self.positionsEqual(cell, tile)) {
						moved = true; // The tile moved from its original cell!
					}
				}
			});
		});

		return moved;
	}

	function getVector(direction) {
		// Vectors representing tile movement
		var map = {
			0: {x: 0, y: -1}, // Up
			1: {x: 1, y: 0}, // Right
			2: {x: 0, y: 1}, // Down
			3: {x: -1, y: 0} // Left
		};

		return map[direction];
	};

	function buildTraversals(grid, vector) {
		var traversals = {x: [], y: []};

		for (var pos = 0; pos < grid.size; pos++) {
			traversals.x.push(pos);
			traversals.y.push(pos);
		}

		// Always traverse from the farthest cell in the chosen direction
		if (vector.x === 1) traversals.x = traversals.x.reverse();
		if (vector.y === 1) traversals.y = traversals.y.reverse();

		return traversals;
	}

	function prepareTiles(grid) {
		grid.eachCell(function(x, y, tile) {
			if (tile) {
				tile.mergedFrom = null;
				tile.savePosition();
			}
		});
	};

	function findFarthestPosition(grid, cell, vector) {
		var previous;

		// Progress towards the vector direction until an obstacle is found
		do {
			previous = cell;
			cell = {
				x: previous.x + vector.x,
				y: previous.y + vector.y
			};
		} while (grid.withinBounds(cell) &&
			grid.cellAvailable(cell));

		return {
			farthest: previous,
			next: cell // Used to check if a merge is required
		};
	};

	function moveTile(grid, tile, cell) {
		grid.cells[tile.x][tile.y] = null;
		grid.cells[cell.x][cell.y] = tile;
		tile.updatePosition(cell);
	};

	function positionsEqual(first, second) {
		return first.x === second.x && first.y === second.y;
	};
}