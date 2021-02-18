import _ from 'lodash';
import Player from './player';
import World from '../../../world';
import Map from '../../../../map/map';
import config from '../../../../../config';
import Regions from '../../../../map/regions';
import DoorData from '../../../../../data/doors.json';

class Doors {
    public world: World;
    public player: Player;
    public map: Map;
    public regions: Regions;

    public doors: any;

    constructor(player: Player) {
        this.world = player.world;
        this.player = player;
        this.map = this.world.map;
        this.regions = this.map.regions;
        this.doors = {};

        this.load();
    }

    load() {
        _.each(DoorData, (door: any) => {
            this.doors[door.id] = {
                id: door.id,
                x: door.x,
                y: door.y,
                status: door.status,
                requirement: door.requirement,
                level: door.level,
                questId: door.questId,
                achievementId: door.achievementId,
                closedIds: door.closedIds,
                openIds: door.openIds,
            };
        });
    }

    getStatus(door: any) {
        if (door.status) return door.status;

        if (config.offlineMode) return true;

        switch (door.requirement) {
            case 'quest': {
                const quest = this.player.quests.getQuest(door.questId);
                return quest && quest.hasDoorUnlocked(door) ? 'open' : 'closed';
            }
            case 'achievement': {
                const achievement = this.player.quests.getAchievement(door.achievementId);
                return achievement && achievement.isFinished() ? 'open' : 'closed';
            }
            case 'level':
                return this.player.level >= door.level ? 'open' : 'closed';
        }
    }

    getTiles(door: any) {
        const tiles = {
            indexes: [],
            data: [],
            collisions: [],
        };

        const status = this.getStatus(door);
        const doorState = {
            open: door.openIds,
            closed: door.closedIds,
        };

        _.each(doorState[status], (value: any, key: string) => {
            tiles.indexes.push(parseInt(key));
            tiles.data.push(value.data);
            tiles.collisions.push(value.isColliding);
        });

        return tiles;
    }

    getAllTiles() {
        const allTiles = {
            indexes: [],
            data: [],
            collisions: [],
        };

        _.each(this.doors, (door: any) => {
            // There's no need to send dynamic data if the player is not nearby.
            const doorRegion = this.regions.regionIdFromPosition(door.x, door.y);
            if (!this.regions.isSurrounding(this.player.region, doorRegion)) return;

            const tiles = this.getTiles(door);
            allTiles.indexes.push(...tiles.indexes);
            allTiles.data.push(...tiles.data);
            allTiles.collisions.push(...tiles.collisions);
        });

        return allTiles;
    }

    hasCollision(x: number, y: number) {
        const tiles = this.getAllTiles();
        const tileIndex = this.world.map.gridPositionToIndex(x, y);
        const index = tiles.indexes.indexOf(tileIndex);

        /**
         * We look through the indexes of the door json file and
         * only process for collision when tile exists in the index.
         * The index represents the key in `openIds` and `closedIds`
         * in doors.json file.
         */

        // Tile does not exist
        if (index < 0) return false;

        return tiles.collisions[index];
    }

    getDoor(x: number, y: number) {
        const doorIndex = Object.keys(this.doors).find(
            (id) => this.doors[id].x === x && this.doors[id].y === y,
        );
        return doorIndex ? this.doors[doorIndex] : null;
    }

    isDoor(x: number, y: number, callback: (_: boolean) => void): void {
        this.forEachDoor((door: any) => {
            callback(door.x === x && door.y === y);
        });
    }

    forEachDoor(callback: (_: any) => void): void {
        _.each(this.doors, (door) => {
            callback(door);
        });
    }
}

export default Doors;
