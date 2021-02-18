import _ from 'lodash';
import fs from 'fs';
import path from 'path';

import Grids from './grids';
import Regions from './regions';
import Utils from '../util/utils';
import Modules from '../util/modules';
import Objects from '../util/objects';
import PVPAreas from './areas/pvpareas';
import MusicAreas from './areas/musicareas';
import ChestAreas from './areas/chestareas';
import OverlayAreas from './areas/overlayareas';
import CameraAreas from './areas/cameraareas';
import AchievementAreas from './areas/achievementareas';
import World from '../game/world';
import Area from './area';
import Entity from '../game/entity/entity';
import Spawns from '../../data/spawns.json';

import log from '../util/log';

let map: any;

const mapDestination = path.resolve(__dirname, '../../data/map/world.json');

class Map {
    world: World;
    ready: boolean;

    regions: Regions;
    grids: Grids;

    version: number;

    data: any[];

    width: number;
    height: number;

    collisions: any;
    chestAreas: any;
    chests: any;
    tilesets: any;
    lights: any;
    plateau: any;
    objects: any;
    cursors: any;
    doors: any;
    warps: any;

    trees: any;
    treeIndexes: number[];

    rocks: any;
    rockIndexes: any;

    zoneWidth: number;
    zoneHeight: number;

    regionWidth: number;
    regionHeight: number;

    areas: any;

    staticEntities: any;

    checksum: string;

    readyInterval: any;
    readyCallback: () => void;

    constructor(world: World) {
        this.world = world;

        this.ready = false;

        this.create();
        this.load();

        this.regions = new Regions(this);
        this.grids = new Grids(this);
    }

    create(jsonData?: any): void {
        try {
            map =
                jsonData ||
                JSON.parse(
                    fs.readFileSync(mapDestination, {
                        encoding: 'utf8',
                        flag: 'r',
                    }),
                );
        } catch {
            log.error('Could not create the map file.');
        }
    }

    load(): void {
        this.version = map.version || 0;

        this.data = map.data;

        this.width = map.width;
        this.height = map.height;
        this.collisions = map.collisions;
        this.chestAreas = map.chestAreas;
        this.chests = map.chests;

        this.loadStaticEntities();

        this.tilesets = map.tilesets;
        this.lights = map.lights;
        this.plateau = map.plateau;
        this.objects = map.objects;
        this.cursors = map.cursors;
        this.warps = map.warps;

        // Lumberjacking
        this.trees = map.trees;
        this.treeIndexes = map.treeIndexes;

        // Mining
        this.rocks = map.rocks;
        this.rockIndexes = map.rockIndexes;

        this.zoneWidth = 25;
        this.zoneHeight = 25;

        /**
         * These are temporarily hardcoded,
         * but we will use a dynamic approach.
         */
        this.regionWidth = this.width / this.zoneWidth;
        this.regionHeight = this.height / this.zoneHeight;

        this.checksum = Utils.getChecksum(JSON.stringify(map));

        this.areas = {};

        this.loadAreas();
        this.loadDoors();

        this.ready = true;

        if (this.world.ready) return;

        this.readyInterval = setInterval(() => {
            if (this.readyCallback) this.readyCallback();
            clearInterval(this.readyInterval);
            this.readyInterval = null;
        }, 75);
    }

    loadAreas(): void {
        /**
         * The structure for the new this.areas is as follows:
         *
         * this.areas = {
         *      pvpAreas = {
         *          allPvpAreas
         *      },
         *
         *      musicAreas = {
         *          allMusicAreas
         *      },
         *
         *      ...
         * }
         */

        this.areas['PVP'] = new PVPAreas();
        this.areas['Music'] = new MusicAreas();
        this.areas['Chests'] = new ChestAreas(this.world);
        this.areas['Overlays'] = new OverlayAreas();
        this.areas['Cameras'] = new CameraAreas();
        this.areas['Achievements'] = new AchievementAreas();
    }

    loadDoors(): void {
        this.doors = {};

        _.each(map.doors, (door: any) => {
            let orientation: number;

            switch (door.o) {
                case 'u':
                    orientation = Modules.Orientation.Up;
                    break;

                case 'd':
                    orientation = Modules.Orientation.Down;
                    break;

                case 'l':
                    orientation = Modules.Orientation.Left;
                    break;

                case 'r':
                    orientation = Modules.Orientation.Right;
                    break;
            }

            const index = this.gridPositionToIndex(door.x, door.y) + 1;

            this.doors[index] = {
                x: door.tx,
                y: door.ty,
                orientation: orientation,
                portal: door.p ? door.p : 0,
                level: door.l,
                achievement: door.a,
                rank: door.r,
            };
        });
    }

    loadStaticEntities(): void {
        this.staticEntities = [];

        // Legacy static entities (from Tiled);
        _.each(map.staticEntities, (entity: any, tileIndex) => {
            this.staticEntities.push({
                tileIndex: tileIndex,
                string: entity.type,
                roaming: entity.roaming,
            });
        });

        _.each(Spawns, (data) => {
            const tileIndex = this.gridPositionToIndex(data.x, data.y);

            this.staticEntities.push({
                tileIndex: tileIndex,
                string: data.string,
                roaming: data.roaming,
                miniboss: data.miniboss,
                achievementId: data.achievementId,
                boss: data.boss,
            });
        });
    }

    indexToGridPosition(tileIndex: number): { x: number; y: number } {
        tileIndex -= 1;
        const x = this.getX(tileIndex + 1, this.width);
        const y = Math.floor(tileIndex / this.width);
        return { x, y };
    }

    gridPositionToIndex(x: number, y: number): number {
        return y * this.width + x;
    }

    getX(index: number, width: number): number {
        if (index === 0) return 0;
        return index % width === 0 ? width - 1 : (index % width) - 1;
    }

    getRandomPosition(area: Area): { x: number; y: number } {
        const pos = { x: 0, y: 0 };
        let valid = false;

        while (!valid) {
            pos.x = area.x + Utils.randomInt(0, area.width + 1);
            pos.y = area.y + Utils.randomInt(0, area.height + 1);
            valid = this.isValidPosition(pos.x, pos.y);
        }

        return pos;
    }

    inArea(
        posX: number,
        posY: number,
        x: number,
        y: number,
        width: number,
        height: number,
    ): boolean {
        return posX >= x && posY >= y && posX <= width + x && posY <= height + y;
    }

    inTutorialArea(entity: Entity): boolean {
        if (entity.x === -1 || entity.y === -1) return true;

        return (
            this.inArea(entity.x, entity.y, 370, 36, 10, 10) ||
            this.inArea(entity.x, entity.y, 312, 11, 25, 22) ||
            this.inArea(entity.x, entity.y, 399, 18, 20, 15)
        );
    }

    nearLight(light: any, x: number, y: number): boolean {
        const diff = Math.round(light.distance / 16);
        const startX = light.x - this.zoneWidth - diff;
        const startY = light.y - this.zoneHeight - diff;
        const endX = light.x + this.zoneWidth + diff;
        const endY = light.y + this.zoneHeight + diff;

        return x > startX && y > startY && x < endX && y < endY;
    }

    isObject(object: any) {
        return this.objects.includes(object);
    }

    getPositionObject(x: number, y: number) {
        const index = this.gridPositionToIndex(x, y);
        const tiles = this.data[index];
        let objectId: any;

        if (Array.isArray(tiles))
            for (const i in tiles)
                if (this.isObject(tiles[i])) objectId = tiles[i];
                else if (this.isObject(tiles)) objectId = tiles;

        return objectId;
    }

    getCursor(tileIndex: number, tileId: number) {
        if (tileId in this.cursors) return this.cursors[tileId];
        const cursor = Objects.getCursor(this.getObjectId(tileIndex));
        if (!cursor) return null;
        return cursor;
    }

    getObjectId(tileIndex: number): string {
        const position = this.indexToGridPosition(tileIndex + 1);
        return position.x + '-' + position.y;
    }

    getObject(x: number, y: number, data: any) {
        const index = this.gridPositionToIndex(x, y) - 1;
        const tiles = this.data[index];

        if (Array.isArray(tiles)) {
            const tile = tiles.find((t) => t in data);
            if (tile) return tile;
        }

        if (tiles in data) return tiles;
        return null;
    }

    getTree(x: number, y: number) {
        return this.getObject(x, y, this.trees);
    }

    getRock(x: number, y: number) {
        return this.getObject(x, y, this.rocks);
    }

    // Transforms an object's `instance` or `id` into position
    idToPosition(id: string): { x: number; y: number } {
        const split = id.split('-');
        return { x: parseInt(split[0]), y: parseInt(split[1]) };
    }

    isDoor(x: number, y: number): boolean {
        return !!this.doors[this.gridPositionToIndex(x, y) + 1];
    }

    getDoorDestination(x: number, y: number) {
        return this.doors[this.gridPositionToIndex(x, y) + 1];
    }

    isValidPosition(x: number, y: number): boolean {
        return (
            Number.isInteger(x) &&
            Number.isInteger(y) &&
            !this.isOutOfBounds(x, y) &&
            !this.isColliding(x, y)
        );
    }

    isOutOfBounds(x: number, y: number): boolean {
        return x < 0 || x >= this.width || y < 0 || y >= this.height;
    }

    isPlateau(index: number): boolean {
        return index in this.plateau;
    }

    isColliding(x: number, y: number) {
        if (this.isOutOfBounds(x, y)) return false;
        const tileIndex = this.gridPositionToIndex(x, y);
        return this.collisions.includes(tileIndex);
    }

    /* For preventing NPCs from roaming in null areas. */
    isEmpty(x: number, y: number): boolean {
        if (this.isOutOfBounds(x, y)) return true;
        const tileIndex = this.gridPositionToIndex(x, y);
        return this.data[tileIndex] === 0;
    }

    getPlateauLevel(x: number, y: number): number {
        const index = this.gridPositionToIndex(x, y);
        if (!this.isPlateau(index)) return 0;
        return this.plateau[index];
    }

    getActualTileIndex(tileIndex: number): number {
        const tileset = this.getTileset(tileIndex);
        if (!tileset) return;
        return tileIndex - tileset.firstGID - 1;
    }

    getTileset(tileIndex: number) {
        /**
         if (id > this.tilesets[idx].firstGID - 1 &&
         id < this.tilesets[idx].lastGID + 1)
            return this.tilesets[idx];
         */

        for (const id in this.tilesets) {
            if (
                tileIndex > this.tilesets[id].firstGID - 1 &&
                tileIndex < this.tilesets[id].lastGID + 1
            )
                return this.tilesets[id];
        }
        return null;
    }

    getWarpById(id: number) {
        const warpName = Object.keys(Modules.Warps)[id];
        if (!warpName) return null;

        const warp = this.warps[warpName.toLowerCase()];
        warp.name = warpName;
        return warp;
    }

    isReady(callback: () => void): void {
        this.readyCallback = callback;
    }
}

export default Map;
