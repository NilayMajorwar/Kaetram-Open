import _ from 'lodash';
import ShopData from '../util/shops';
import Items from '../util/items';
import Messages from '../network/messages';
import Packets from '../network/packets';
import Player from '../game/entity/character/player/player';
import World from '../game/world';
import log from '../util/log';

export type ShopInfo = {
    id: number;
    strings: string[];
    names: string[];
    counts: number[];
    prices: number[];
};

class Shops {
    world: World;

    interval: number;
    shopInterval: NodeJS.Timeout;

    constructor(world: World) {
        this.world = world;

        this.interval = 60000;
        this.shopInterval = null;

        this.load();
    }

    load(): void {
        this.shopInterval = setInterval(() => {
            Object.values(ShopData.Data).forEach((info: any) => {
                for (let i = 0; i < info.count; i++)
                    if (info.count[i] < info.originalCount[i])
                        ShopData.increment(info.id, info.items[i], 1);
            });
        }, this.interval);
    }

    open(player: Player, npcId: number): void {
        player.send(
            new Messages.Shop(Packets.ShopOpcode.Open, {
                instance: player.instance,
                npcId: npcId,
                shopData: this.getShopData(npcId),
            }),
        );
    }

    buy(player: Player, npcId: number, buyId: number, count: number): void {
        const cost = ShopData.getCost(npcId, buyId, count);
        const currency = this.getCurrency(npcId);
        const stock = ShopData.getStock(npcId, buyId);

        if (!cost || !currency || !stock) {
            log.info('Invalid shop data.');
            return;
        }

        //TODO: Make it so that when you have the exact coin count,
        // it removes coins and replaces it with the item purchased.

        if (stock === 0) {
            player.notify('This item is currently out of stock.');
            return;
        }

        if (!player.inventory.contains(currency, cost)) {
            player.notify('You do not have enough money to purchase this.');
            return;
        }

        if (!player.inventory.hasSpace()) {
            player.notify('You do not have enough space in your inventory.');
            return;
        }

        if (count > stock) count = stock;

        player.inventory.remove(currency, cost);
        player.inventory.add({
            id: ShopData.getItem(npcId, buyId),
            count: count,
            ability: -1,
            abilityLevel: -1,
        });

        ShopData.decrement(npcId, buyId, count);
        this.refresh(npcId);
    }

    sell(player: Player, npcId: number, slotId: number): void {
        const item = player.inventory.slots[slotId];
        const shop = ShopData.Ids[npcId];

        if (!shop || !item) {
            log.info('Invalid shop data.');
            return;
        }

        if (!shop.items.includes(item.id)) {
            player.notify('That item cannot be sold in this store.');
            return;
        }

        const currency = this.getCurrency(npcId);
        const price = this.getSellPrice(npcId, item.id, item.count);

        ShopData.increment(npcId, item.id, item.count);

        player.inventory.remove(item.id, item.count, item.index);
        player.inventory.add({
            id: currency,
            count: price,
        });

        this.remove(player);
        this.refresh(npcId);
    }

    remove(player: Player): void {
        const selectedItem = player.selectedShopItem;
        if (!selectedItem) return;

        player.send(
            new Messages.Shop(Packets.ShopOpcode.Remove, {
                id: selectedItem.id,
                index: selectedItem.index,
            }),
        );

        player.selectedShopItem = null;
    }

    refresh(shop: number): void {
        this.world.push(Packets.PushOpcode.Broadcast, {
            message: new Messages.Shop(Packets.ShopOpcode.Refresh, this.getShopData(shop)),
        });
    }

    getCurrency(npcId: number) {
        const shop = ShopData.Ids[npcId];
        if (!shop) return null;
        return shop.currency;
    }

    getSellPrice(npcId: number, itemId: number, count = 1): number {
        const shop = ShopData.Ids[npcId];
        if (!shop) return 1;

        const buyId = shop.items.indexOf(itemId);
        if (buyId < 0) return 1;

        return Math.floor(ShopData.getCost(npcId, buyId, count) / 2);
    }

    getShopData(npcId: number): ShopInfo {
        const shop = ShopData.Ids[npcId];

        if (!shop || !_.isArray(shop.items)) return;

        const strings = [];
        const names = [];

        for (const id in shop.items) {
            strings.push(Items.idToString(shop.items[id]));
            names.push(Items.idToName(shop.items[id]));
        }

        return {
            id: npcId,
            strings: strings,
            names: names,
            counts: shop.count,
            prices: shop.prices,
        };
    }
}

export default Shops;
