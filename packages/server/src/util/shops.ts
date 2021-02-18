import _ from 'lodash';

export default {
    Data: {},
    Ids: {},

    isShopNPC(npcId: number): boolean {
        return npcId in this.Ids;
    },

    getItems(npcId: number) {
        return this.Ids[npcId].items;
    },

    shopIdToNPC(shopId: string) {
        return this.Data[shopId].npcId;
    },

    getItemCount(id: number): number {
        return this.getItems(id).length;
    },

    increment(npcId: number, itemId: number, count: number): void {
        const shop = this.Ids[npcId];
        const index = shop.items.indexOf(itemId);
        if (index < 0) return;
        shop.count[index] += count;
    },

    decrement(npcId: number, buyId: number, count: number): void {
        const shop = this.Ids[npcId];
        if (!buyId || buyId < 0) return;
        shop.count[buyId] -= count;
        if (shop.count[buyId] < 0) shop.count[buyId] = 0;
    },

    getCost(npcId: number, buyId: number, count: number): number {
        // Reason for the shopId variable is because some shops
        // may have different prices for the same item. A way to
        // spice up the game.
        const shop = this.Ids[npcId];
        if (!shop || buyId < 0) return 2;
        return shop.prices[buyId] * count;
    },

    getStock(npcId: number, buyId: number) {
        const shop = this.Ids[npcId];
        if (!shop || !buyId || buyId < 0) return null;
        return shop.count[buyId];
    },

    getOriginalStock(shopId: number, buyId: number) {
        const shop = this.Ids[shopId];
        if (!buyId || buyId < 0) return;
        return shop.originalCount[buyId];
    },

    getCount(npcId: number): number[] {
        const count = this.Ids[npcId].count;
        if (_.isArray(count)) return count;
        return Array.from<number>({ length: this.getItemCount(npcId) }).fill(count);
    },

    getItem(npcId: number, buyId: number) {
        if (!buyId || buyId < 0) return;
        return this.Ids[npcId].items[buyId];
    },
};
