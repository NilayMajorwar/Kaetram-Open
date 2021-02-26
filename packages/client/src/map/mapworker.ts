/// <reference lib="webworker" />

import mapData from '../../data/maps/map.json';

type MapDataType = typeof mapData;

export interface MapData extends MapDataType {
    grid: number[][];
    blocking: number[];
}

const data = mapData as MapData;

onmessage = () => {
    loadCollisionGrid();
    postMessage(data);
};

function loadCollisionGrid() {
    // const tileIndex = 0;
    console.log(data);

    data.grid = [];

    for (let i = 0; i < data.height; i++) {
        data.grid[i] = [];
        for (let j = 0; j < data.width; j++) data.grid[i][j] = 0;
    }

    data.collisions.forEach((tileIndex) => {
        const position = indexToGridPosition(tileIndex + 1);
        data.grid[position.y][position.x] = 1;
    });

    data.blocking &&
        data.blocking.forEach((tileIndex) => {
            const position = indexToGridPosition(tileIndex + 1);
            if (data.grid[position.y]) data.grid[position.y][position.x] = 1;
        });
}

function indexToGridPosition(index: number) {
    index -= 1;

    const x = getX(index + 1, data.width);
    const y = Math.floor(index / data.width);
    return { x, y };
}

function getX(index: number, width: number) {
    if (index === 0) return 0;

    return index % width === 0 ? width - 1 : (index % width) - 1;
}
