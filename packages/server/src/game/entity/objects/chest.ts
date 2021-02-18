import Entity from '../entity';
import Player from '../character/player/player';
import Utils from '../../../util/utils';

class Chest extends Entity {
    respawnDuration: number;
    static: boolean;

    items: Array<string>;
    achievement: string;

    openCallback: (player?: Player) => void;
    respawnCallback: () => void;

    constructor(id: number, instance: string, x: number, y: number, achievement?: string) {
        super(id, 'chest', instance, x, y);

        this.respawnDuration = 25000;
        this.static = false;

        this.achievement = achievement;
        this.items = [];
    }

    openChest(player?: Player): void {
        if (this.openCallback) this.openCallback(player);
    }

    respawn(): void {
        setTimeout(() => {
            if (this.respawnCallback) this.respawnCallback();
        }, this.respawnDuration);
    }

    getItem(): { string: string; count: number } | null {
        const random = Utils.randomInt(0, this.items.length - 1);
        let item = this.items[random];
        let count = 1;
        let probability = 100;

        if (item.includes(':')) {
            const itemData = item.split(':');

            item = itemData.shift(); // name
            count = parseInt(itemData.shift()); // count
            probability = parseInt(itemData.shift()); // probability
        }

        /**
         * We must ensure an item is always present in order
         * to avoid any unforeseen circumstances.
         */
        if (!item) return null;
        if (Utils.randomInt(0, 100) > probability) return null;

        return {
            string: item,
            count: count,
        };
    }

    onOpen(callback: (player?: Player) => void): void {
        this.openCallback = callback;
    }

    onRespawn(callback: () => void): void {
        this.respawnCallback = callback;
    }
}

export default Chest;
