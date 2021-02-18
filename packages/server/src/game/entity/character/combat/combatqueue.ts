import Hit, { HitData } from './hit';

class CombatQueue {
    hitQueue: Array<Hit>;

    constructor() {
        this.hitQueue = [];
    }

    add(hit: Hit): void {
        this.hitQueue.push(hit);
    }

    hasQueue(): boolean {
        return this.hitQueue.length > 0;
    }

    clear(): void {
        this.hitQueue = [];
    }

    getHit(): HitData {
        if (this.hitQueue.length === 0) return null;
        return this.hitQueue.shift().getData();
    }
}

export default CombatQueue;
