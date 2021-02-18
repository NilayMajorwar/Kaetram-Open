import _ from 'lodash';
import Map from './map';

class Regions {
    map: Map;

    width: number;
    height: number;

    zoneWidth: number;
    zoneHeight: number;

    regionWidth: number;
    regionHeight: number;

    linkedRegions: { [key: string]: { x: number; y: number }[] };

    constructor(map: Map) {
        this.map = map;

        this.width = this.map.width;
        this.height = this.map.height;

        this.zoneWidth = this.map.zoneWidth; // 25
        this.zoneHeight = this.map.zoneHeight; // 20

        this.regionWidth = this.map.regionWidth;
        this.regionHeight = this.map.regionHeight;

        this.linkedRegions = {};

        this.loadDoors();
    }

    loadDoors(): void {
        const doors = this.map.doors;

        _.each(doors, (door) => {
            const regionId = this.regionIdFromPosition(door.x, door.y),
                linkedRegionId = this.regionIdFromPosition(door.tx, door.ty),
                linkedRegionPosition = this.regionIdToPosition(linkedRegionId);

            if (regionId in this.linkedRegions)
                this.linkedRegions[regionId].push(linkedRegionPosition);
            else this.linkedRegions[regionId] = [linkedRegionPosition];
        });
    }

    // y y x y y
    // y y x y y
    // y x x x y
    // y y x y x
    // y y x y y

    getSurroundingRegions(id: string, offset = 1): { x: number; y: number }[] {
        const position = this.regionIdToPosition(id),
            x = position.x,
            y = position.y;

        let list: { x: number; y: number }[] = [];

        for (let i = -offset; i <= offset; i++) {
            // for each y...
            for (let j = -1; j <= 1; j++) {
                // for each x...
                if (i > -2 || i < 2) list.push({ x: x + j, y: y + i });
            }
        }

        _.each(this.linkedRegions[id], (regionPosition) => {
            if (!_.some(list, (regionPosition) => regionPosition.x === x && regionPosition.y === y))
                list.push(regionPosition);
        });

        list = _.reject(list, (regionPosition) => {
            const gX = regionPosition.x,
                gY = regionPosition.y;

            return gX < 0 || gY < 0 || gX >= this.regionWidth || gY >= this.regionHeight;
        });
        return list;
    }

    getAdjacentRegions(id: string, offset: number): { x: number; y: number }[] {
        const surroundingRegions = this.getSurroundingRegions(id, offset);

        /**
         * We will leave this hardcoded to surrounding areas of
         * 9 since we will not be processing larger regions at
         * the moment.
         */

        if (surroundingRegions.length !== 9) return;

        /**
         * 11-0 12-0 13-0
         * 11-1 12-1 13-1
         * 11-2 12-2 13-2
         */

        const centreRegion = this.regionIdToPosition(id);
        return surroundingRegions.filter((r) => r.x === centreRegion.x || r.y === centreRegion.y);
    }

    forEachRegion(callback: (pos: string) => void): void {
        for (let x = 0; x < this.regionWidth; x++)
            for (let y = 0; y < this.regionHeight; y++) callback(x + '-' + y);
    }

    forEachSurroundingRegion(
        regionId: string,
        callback: (pos: string) => void,
        offset?: number,
    ): void {
        if (!regionId) return;
        _.each(this.getSurroundingRegions(regionId, offset), (region) => {
            callback(region.x + '-' + region.y);
        });
    }

    forEachAdjacentRegion(
        regionId: string,
        callback: (pos: string) => void,
        offset?: number,
    ): void {
        if (!regionId) return;

        _.each(this.getAdjacentRegions(regionId, offset), (region) => {
            callback(region.x + '-' + region.y);
        });
    }

    regionIdFromPosition(x: number, y: number): string {
        return Math.floor(x / this.zoneWidth) + '-' + Math.floor(y / this.zoneHeight);
    }

    regionIdToPosition(id: string): { x: number; y: number } {
        const position = id.split('-');

        return {
            x: parseInt(position[0], 10),
            y: parseInt(position[1], 10),
        };
    }

    regionIdToCoordinates(id: string): { x: number; y: number } {
        const position = id.split('-');

        return {
            x: parseInt(position[0]) * this.zoneWidth,
            y: parseInt(position[1]) * this.zoneHeight,
        };
    }

    /**
     * Converts an array of regions from object type to string format.
     */
    regionsToCoordinates(regions: { x: number; y: number }[]): string[] {
        return regions.map((r) => r.x + '-' + r.y);
    }

    isSurrounding(regionId: string, toRegionId: string): boolean {
        if (!regionId || !toRegionId) return false;
        const surroundingRegions = this.getSurroundingRegions(regionId, 1);
        return this.regionsToCoordinates(surroundingRegions).includes(toRegionId);
    }
}

export default Regions;
