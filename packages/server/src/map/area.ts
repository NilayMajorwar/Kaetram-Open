import Mob from '../game/entity/character/mob/mob';
import Player from '../game/entity/character/player/player';

class Area {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;

    entities: any;
    chest: any;
    items: any;

    hasRespawned: boolean;

    maxEntities: number;
    spawnDelay: number;

    spawnCallback: () => void;
    emptyCallback: () => void;

    achievement: any;

    constructor(id: number, x: number, y: number, width: number, height: number) {
        this.id = id;

        this.x = x;
        this.y = y;

        this.width = width;
        this.height = height;

        this.entities = [];
        this.items = [];

        this.hasRespawned = true;
        this.chest = null;

        this.maxEntities = 0;
        this.spawnDelay = 0;
    }

    contains(x: number, y: number): boolean {
        return x >= this.x && y >= this.y && x < this.x + this.width && y < this.y + this.height;
    }

    addEntity(mob: Mob): void {
        if (this.entities.indexOf(mob) > 0) return;

        this.entities.push(mob);
        mob.area = this;

        // Grab a spawn delay from an mob to create an offset for the chest.
        if (!this.spawnDelay) this.spawnDelay = mob.respawnDelay;

        if (this.spawnCallback) this.spawnCallback();
    }

    removeEntity(mob: Mob): void {
        const index = this.entities.indexOf(mob);
        if (index > -1) this.entities.splice(index, 1);

        if (this.entities.length === 0 && this.emptyCallback) {
            if (mob.lastAttacker && mob.lastAttacker instanceof Player)
                this.handleAchievement(mob.lastAttacker);
            this.emptyCallback();
        }
    }

    handleAchievement(player: Player): void {
        if (!this.achievement) return;
        player.finishAchievement(this.achievement);
    }

    setMaxEntities(maxEntities: number): void {
        this.maxEntities = maxEntities;
    }

    onEmpty(callback: () => void): void {
        this.emptyCallback = callback;
    }

    onSpawn(callback: () => void): void {
        this.spawnCallback = callback;
    }
}

export default Area;
