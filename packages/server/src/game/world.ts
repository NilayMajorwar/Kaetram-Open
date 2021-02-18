import _ from 'lodash';
import log from '../util/log';
import config from '../../config';
import Discord from '../network/discord';
import Map from '../map/map';
import Messages from '../network/messages';
import Utils from '../util/utils';
import Mobs from '../util/mobs';
import Mob from './entity/character/mob/mob';
import NPCs from '../util/npcs';
import NPC from './entity/npc/npc';
import Items from '../util/items';
import Item from './entity/objects/item';
import Chest from './entity/objects/chest';
import Character from './entity/character/character';
import Projectile from './entity/objects/projectile';
import Minigames from '../controllers/minigames';
import Packets from '../network/packets';
import Formulas from '../util/formulas';
import Modules from '../util/modules';
import Shops from '../controllers/shops';
import Region from '../region/region';
import GlobalObjects from '../controllers/globalobjects';
import Network from '../network/network';
import Trees from '../../data/professions/trees';
import Rocks from '../../data/professions/rocks';
import Player from './entity/character/player/player';
import Entity from './entity/entity';
import WebSocket from '../network/websocket';
import MongoDB from '../database/mongodb/mongodb';
import API from '../network/api';
import Grids from '../map/grids';
import Connection from '../network/connection';

class World {
    public socket: WebSocket;
    public database: MongoDB;

    public maxPlayers: number;
    public updateTime: number;
    public debug: boolean;
    public allowConnections: boolean;

    public players: { [key: string]: Player };
    public entities: { [key: string]: Entity };
    public items: { [key: string]: Item };
    public mobs: { [key: string]: Mob };
    public chests: { [key: string]: Chest };
    public npcs: { [key: string]: NPC };
    public projectiles: { [key: string]: Projectile };

    public trees: { [key: string]: any };
    public cutTrees: { [key: string]: any };

    public rocks: { [key: string]: any };
    public depletedRocks: { [key: string]: any };

    public loadedRegions: boolean;
    public ready: boolean;

    public map: Map;
    public api: API;
    public shops: Shops;
    public region: Region;
    public network: Network;
    public discord: Discord;
    public minigames: Minigames;
    public globalObjects: GlobalObjects;

    public playerConnectCallback: (conn: Connection) => void;
    public populationCallback: () => void;

    constructor(socket: WebSocket, database: MongoDB) {
        this.socket = socket;
        this.database = database;

        this.maxPlayers = config.maxPlayers;
        this.updateTime = config.updateTime;

        this.debug = false;
        this.allowConnections = false;

        this.players = {};
        this.entities = {};
        this.items = {};
        this.chests = {};
        this.mobs = {};
        this.npcs = {};
        this.projectiles = {};

        // Lumberjacking Variables
        this.trees = {};
        this.cutTrees = {};

        // Mining Variables
        this.rocks = {};
        this.depletedRocks = {};

        this.loadedRegions = false;

        this.ready = false;
    }

    load(onWorldLoad: () => void): void {
        log.info('************ World Information ***********');

        /**
         * The reason maps are loaded per each world is because
         * we can have slight modifications for each world if we want in the
         * future. Using region loading, we can just send the client
         * whatever new map we have created server sided. Cleaner and nicer.
         */

        this.map = new Map(this);
        this.map.isReady(() => {
            log.info('The map has been successfully loaded!');

            this.loaded();

            this.spawnChests();
            this.spawnEntities();

            setTimeout(onWorldLoad, 100);
        });
    }

    loaded(): void {
        /**
         * The following are all globally based 'plugins'. We load them
         * in a batch here in order to keep it organized and neat.
         */

        this.minigames = new Minigames(this);

        this.api = new API(this);
        this.shops = new Shops(this);
        this.region = new Region(this);
        this.discord = new Discord(this);
        this.network = new Network(this);
        this.globalObjects = new GlobalObjects(this);

        this.ready = true;

        this.tick();

        log.info('******************************************');
    }

    async tick(): Promise<void> {
        const update = 1000 / this.updateTime;

        // Utility setInterval fn that waits for async functions to end
        const setIntervalAsync = (fn: () => Promise<void>, ms: number) => {
            fn().then(() => {
                setTimeout(() => setIntervalAsync(fn, ms), ms);
            });
        };

        setIntervalAsync(async () => {
            this.network.parsePackets();
            this.region.parseRegions();
        }, update);

        setIntervalAsync(async () => {
            this.parseTrees();
        }, config.treeTick || 1000);

        if (!config.hubEnabled) return;
        if (!config.apiEnabled) log.warning('Server is in hub-mode but API is not enabled!');

        setIntervalAsync(async () => {
            this.api.pingHub();
        }, config.hubPing);
    }

    /****************************
     * Entity related functions *
     ****************************/

    kill(character: Character): void {
        character.applyDamage(character.hitPoints);

        this.push(Packets.PushOpcode.Regions, [
            {
                regionId: character.region,
                message: new Messages.Points({
                    id: character.instance,
                    hitPoints: character.getHitPoints(),
                    mana: null,
                }),
            },
            {
                regionId: character.region,
                message: new Messages.Despawn(character.instance),
            },
        ]);

        this.handleDeath(character, true);
    }

    handleDamage(attacker: Character, target: Character, damage: number): void {
        if (!attacker || !target || isNaN(damage) || target.invincible) return;
        if (target.type === 'player' && target.hitCallback) target.hitCallback(attacker, damage);

        // Stop screwing with this - it's so the target retaliates.

        target.hit(attacker);
        target.applyDamage(damage, attacker);

        this.push(Packets.PushOpcode.Regions, {
            regionId: target.region,
            message: new Messages.Points({
                id: target.instance,
                hitPoints: target.getHitPoints(),
                mana: null,
            }),
        });

        // If target has died...
        if (target.getHitPoints() < 1) {
            if (target.type === 'mob') attacker.addExperience(Mobs.getXp(target.id));
            if (attacker.type === 'player') attacker.killCharacter(target);

            target.combat.forEachAttacker((attacker: Character) => {
                attacker.removeTarget();
            });

            this.push(Packets.PushOpcode.Regions, [
                {
                    regionId: target.region,
                    message: new Messages.Combat(Packets.CombatOpcode.Finish, {
                        attackerId: attacker.instance,
                        targetId: target.instance,
                    }),
                },
                {
                    regionId: target.region,
                    message: new Messages.Despawn(target.instance),
                },
            ]);

            this.handleDeath(target, false, attacker);
        }
    }

    handleDeath(character: Character, ignoreDrops?: boolean, lastAttacker?: Character): void {
        if (!character) return;

        if (character.type === 'mob') {
            const deathX = character.x;
            const deathY = character.y;

            if (lastAttacker) character.lastAttacker = lastAttacker;
            if (character.deathCallback) character.deathCallback();
            this.removeEntity(character);

            character.dead = true;
            character.destroy();
            character.combat.stop();

            if (!ignoreDrops) {
                const drop = character.getDrop();
                if (drop) this.dropItem(drop.id, drop.count, deathX, deathY);
            }
        } else if (character.type === 'player') character.die();
    }

    createProjectile(info: any): Projectile {
        const attacker = info.shift();
        const target = info.shift();
        if (!attacker || !target) return null;

        const startX = attacker.x;
        const startY = attacker.y;

        const type = attacker.getProjectile();
        const projectile = new Projectile(type, Utils.generateInstance());
        projectile.setStart(startX, startY);
        projectile.setTarget(target);

        let hit = null;
        if (attacker.type === 'player') hit = attacker.getHit(target);

        projectile.damage = hit ? hit.damage : Formulas.getDamage(attacker, target, true);
        projectile.hitType = hit ? hit.type : Modules.Hits.Damage;
        projectile.owner = attacker;

        this.addProjectile(projectile, projectile.owner.region);
        return projectile;
    }

    getEntityByInstance(instance: string): Entity {
        if (instance in this.entities) return this.entities[instance];
    }

    spawnEntities(): void {
        _.each(this.map.staticEntities, (data: any) => {
            const key: string = data.string;
            const isMob = !!Mobs.Properties[key];
            const isNpc = !!NPCs.Properties[key];
            const isItem = !!Items.Data[key];
            const position = this.map.indexToGridPosition(data.tileIndex);

            let info: any;
            if (isMob) info = Mobs.Properties[key];
            if (isNpc) info = NPCs.Properties[key];
            if (isItem) info = Items.getData(key);

            position.x++;

            if (!info || info === 'null') {
                if (this.debug)
                    log.info('Unknown object spawned at: ' + position.x + ' ' + position.y);
                return;
            }

            const instance = Utils.generateInstance();

            if (isMob) {
                const mob = new Mob(info.id, instance, position.x, position.y, this);
                mob.static = true;
                if (data.roaming) mob.roaming = true;
                if (data.miniboss) {
                    if (data.achievementId) mob.achievementId = data.achievementId;
                    mob.miniboss = data.miniboss;
                }
                if (data.boss) mob.boss = data.boss;
                if (Mobs.Properties[key].hiddenName)
                    mob.hiddenName = Mobs.Properties[key].hiddenName;

                mob.load();
                mob.onRespawn(() => {
                    mob.dead = false;
                    mob.lastAttacker = null;
                    mob.refresh();
                    this.addMob(mob);
                });
                this.addMob(mob);
            }

            if (isNpc) this.addNPC(new NPC(info.id, instance, position.x, position.y));

            if (isItem) {
                const item = this.createItem(info.id, instance, position.x, position.y);
                item.static = true;
                this.addItem(item);
            }
        });

        log.info('Spawned ' + Object.keys(this.entities).length + ' entities!');
    }

    spawnChests(): void {
        _.each(this.map.chests, (info: any) => {
            this.spawnChest(info.i, info.x, info.y, info.achievement, true);
        });

        log.info('Spawned ' + Object.keys(this.chests).length + ' static chests');
    }

    spawnMob(id: number, x: number, y: number): Mob {
        if (!Mobs.exists(id)) return;

        const mob = new Mob(id, Utils.generateInstance(), x, y);
        this.addMob(mob);
        return mob;
    }

    spawnChest(
        items: any,
        x: number,
        y: number,
        achievement?: string,
        staticChest?: boolean,
    ): Chest {
        const chest = new Chest(194, Utils.generateInstance(), x, y, achievement);
        chest.items = items;
        if (staticChest) {
            chest.static = staticChest;
            chest.onRespawn(this.addChest.bind(this, chest));
        }

        chest.onOpen((player?: Player) => {
            /**
             * Pretty simple concept, detect when the player opens the chest
             * then remove it and drop an item instead. Give it a 25 second
             * cooldown prior to respawning and voila.
             */

            this.removeChest(chest);

            if (config.debug) log.info(`Opening chest at x: ${chest.x}, y: ${chest.y}`);

            const item = chest.getItem();
            if (!item) return;

            this.dropItem(Items.stringToId(item.string), item.count, chest.x, chest.y);
            if (player && chest.achievement) player.finishAchievement(parseInt(chest.achievement));
        });

        this.addChest(chest);
        return chest;
    }

    createItem(
        id: number,
        instance: string,
        x: number,
        y: number,
        ability?: number,
        abilityLevel?: number,
    ) {
        return new Item(id, instance, x, y, ability, abilityLevel);
    }

    dropItem(
        id: number,
        count: number,
        x: number,
        y: number,
        ability?: number,
        abilityLevel?: number,
    ): void {
        const item = this.createItem(id, Utils.generateInstance(), x, y, ability, abilityLevel);

        item.count = count;
        item.dropped = true;

        this.addItem(item);
        item.despawn();

        if (config.debug) {
            log.info(`Item - ${id} has been dropped at x: ${x}, y: ${y}.`);
            log.info(`Item Region - ${item.region}`);
        }

        item.onBlink(() => {
            this.push(Packets.PushOpcode.Broadcast, {
                message: new Messages.Blink(item.instance),
            });
        });

        item.onDespawn(() => {
            this.removeItem(item);
        });
    }

    parseTrees(): void {
        const time = Date.now();
        const treeTypes = Object.keys(Modules.Trees);

        _.each(this.cutTrees, (tree, key) => {
            const type = treeTypes[tree.treeId];
            if (time - tree.time < Trees.Regrowth[type]) return;

            _.each(tree.data, (tile: any) => {
                this.map.data[tile.index] = tile.oldTiles;
            });

            const position = this.map.idToPosition(key);
            const regionId = this.map.regions.regionIdFromPosition(position.x, position.y);

            this.region.updateRegions(regionId);

            delete this.cutTrees[key];
        });
    }

    parseRocks(): void {
        const time = Date.now();
        const rockTypes = Object.keys(Modules.Rocks);

        _.each(this.depletedRocks, (rock, key) => {
            const type = rockTypes[rock.rockId];
            if (time - rock.time < Rocks.Respawn[type]) return;

            _.each(rock.data, (tile: any) => {
                this.map.data[tile.index] = tile.oldTiles;
            });

            const position = this.map.idToPosition(key);
            const regionId = this.map.regions.regionIdFromPosition(position.x, position.y);

            this.region.updateRegions(regionId);
            delete this.depletedRocks[key];
        });
    }

    isTreeCut(id: string): boolean {
        if (id in this.cutTrees) return true;

        for (const i in this.cutTrees) {
            if (id in this.cutTrees[i]) return true;
        }

        return false;
    }

    isRockDepleted(id: string): boolean {
        if (id in this.depletedRocks) return true;

        for (const i in this.depletedRocks) {
            if (id in this.depletedRocks[i]) return true;
        }
        return false;
    }

    /**
     * We save trees we are about to destroy
     * to the `this.trees` and once they are destroyed
     * we pluck them into the `this.destroyedTrees`.
     * We run a tick that re-spawns them after a while
     * using the data from `this.trees`.
     */
    destroyTree(id: any, treeId: any): void {
        const position = this.map.idToPosition(id);

        if (!(id in this.trees)) this.trees[id] = {};

        this.search(position.x + 1, position.y, id, this.trees, 'tree');

        this.cutTrees[id] = {
            data: {},
            time: Date.now(),
            treeId: treeId,
        };

        _.each(this.trees[id], (tile: any, key) => {
            const tiles = this.map.data[tile.index];

            // Store the original tiles for respawning.
            this.cutTrees[id].data[key] = {
                oldTiles: tiles,
                index: tile.index,
            };

            // We do not remove tiles that do not have another tile behind them.
            if (Array.isArray(tiles)) {
                const index = tiles.indexOf(tile.objectTile);

                // We map the uncut trunk to the cut trunk tile.
                if (tile.objectTile in Trees.Stumps) tiles[index] = Trees.Stumps[tile.objectTile];
                else tiles.splice(index, 1);
            }
        });

        const regionId = this.map.regions.regionIdFromPosition(position.x, position.y);
        this.region.updateRegions(regionId);
        this.trees[id] = {};
    }

    /**
     * The following functions recursively iterate through tiles of
     * a certain type. For example, we can look for all the tree tiles,
     * given a starting tile, and we stop when all tiles are detected.
     * Because this method is not exactly perfect, trees have to be
     * placed one tile apart such that the algorithm does not 'leak'
     * and cut both trees.
     * `refId` - The intial object we click on.
     * `data` - The array we are working with.
     * `type` - The type of tile we are looking for.
     */
    getSearchTile(type: string, x: number, y: number) {
        switch (type) {
            case 'tree':
                return this.map.getTree(x, y);

            case 'rock':
                return this.map.getRock(x, y);
        }
    }

    search(x: number, y: number, refId: any, data: any, type: string): boolean {
        const objectTile = this.getSearchTile(type, x, y);
        if (!objectTile) return false;

        const id = x + '-' + y;
        if (id in data[refId]) return false;

        data[refId][id] = {
            index: this.map.gridPositionToIndex(x, y) - 1,
            objectTile: objectTile,
        };

        if (this.search(x + 1, y, refId, data, type)) return true;
        if (this.search(x - 1, y, refId, data, type)) return true;
        if (this.search(x, y + 1, refId, data, type)) return true;
        if (this.search(x, y - 1, refId, data, type)) return true;
        return false;
    }

    push(type: number, info: any): void {
        if (_.isArray(info)) {
            _.each(info, (i) => {
                this.push(type, i);
            });
            return;
        }

        if (!info.message) {
            log.info('No message found whilst attempting to push.');
            log.info(info);
            return;
        }

        switch (type) {
            case Packets.PushOpcode.Broadcast:
                this.network.pushBroadcast(info.message);
                break;

            case Packets.PushOpcode.Selectively:
                this.network.pushSelectively(info.message, info.ignores);
                break;

            case Packets.PushOpcode.Player:
                this.network.pushToPlayer(info.player, info.message);
                break;

            case Packets.PushOpcode.Players:
                this.network.pushToPlayers(info.players, info.message);
                break;

            case Packets.PushOpcode.Region:
                this.network.pushToRegion(info.regionId, info.message, info.ignoreId);
                break;

            case Packets.PushOpcode.Regions:
                this.network.pushToAdjacentRegions(info.regionId, info.message, info.ignoreId);
                break;

            case Packets.PushOpcode.NameArray:
                this.network.pushToNameArray(info.names, info.message);
                break;

            case Packets.PushOpcode.OldRegions:
                this.network.pushToOldRegions(info.player, info.message);
                break;
        }
    }

    addEntity(entity: Entity, region?: string): void {
        if (entity.instance in this.entities)
            log.info('Entity ' + entity.instance + ' already exists.');

        this.entities[entity.instance] = entity;

        if (entity.type !== 'projectile') this.region.handle(entity, region);

        if (entity.x > 0 && entity.y > 0)
            this.getGrids().addToEntityGrid(entity, entity.x, entity.y);

        entity.onSetPosition(() => {
            this.getGrids().updateEntityPosition(entity);

            if (entity.isMob() && entity.isOutsideSpawn()) {
                entity.removeTarget();
                entity.combat.forget();
                entity.combat.stop();

                entity.return();

                this.push(Packets.PushOpcode.Broadcast, [
                    {
                        message: new Messages.Combat(Packets.CombatOpcode.Finish, {
                            attackerId: null,
                            targetId: entity.instance,
                        }),
                    },
                    {
                        message: new Messages.Movement(Packets.MovementOpcode.Move, {
                            id: entity.instance,
                            x: entity.x,
                            y: entity.y,
                            forced: false,
                            teleport: false,
                        }),
                    },
                ]);
            }
        });

        if (entity instanceof Character) {
            entity.getCombat().setWorld(this);

            entity.onStunned((stun: boolean) => {
                this.push(Packets.PushOpcode.Regions, {
                    regionId: entity.region,
                    message: new Messages.Movement(Packets.MovementOpcode.Stunned, {
                        id: entity.instance,
                        state: stun,
                    }),
                });
            });
        }
    }

    addPlayer(player: Player): void {
        this.addEntity(player);
        this.players[player.instance] = player;

        if (this.populationCallback) this.populationCallback();
    }

    addNPC(npc: NPC, region?: string): void {
        this.addEntity(npc, region);
        this.npcs[npc.instance] = npc;
    }

    addMob(mob: Mob, region?: string): void {
        if (!Mobs.exists(mob.id)) {
            log.error('Cannot spawn mob. ' + mob.id + ' does not exist.');
            return;
        }

        this.addEntity(mob, region);
        this.mobs[mob.instance] = mob;

        mob.addToChestArea(this.getChestAreas());

        mob.onHit((attacker) => {
            if (mob.isDead() || mob.combat.started) return;
            // @ts-ignore Fix this
            mob.combat.begin(attacker);
        });
    }

    addItem(item: Item, region?: string): void {
        if (item.static) item.onRespawn(this.addItem.bind(this, item));
        this.addEntity(item, region);
        this.items[item.instance] = item;
    }

    addProjectile(projectile: Projectile, region?: string): void {
        this.addEntity(projectile, region);
        this.projectiles[projectile.instance] = projectile;
    }

    addChest(chest: Chest, region?: string): void {
        this.addEntity(chest, region);
        this.chests[chest.instance] = chest;
    }

    removeEntity(entity: Entity): void {
        if (entity.instance in this.entities) delete this.entities[entity.instance];
        if (entity.instance in this.mobs) delete this.mobs[entity.instance];
        if (entity.instance in this.items) delete this.items[entity.instance];

        this.getGrids().removeFromEntityGrid(entity, entity.x, entity.y);
        this.region.remove(entity);
    }

    cleanCombat(character: Character): void {
        Object.values(this.entities).forEach((otherCharacter) => {
            if (otherCharacter instanceof Character && otherCharacter.combat.hasAttacker(character))
                otherCharacter.combat.removeAttacker(character);
        });
    }

    removeItem(item: Item): void {
        this.removeEntity(item);
        this.push(Packets.PushOpcode.Broadcast, {
            message: new Messages.Despawn(item.instance),
        });
        if (item.static) item.respawn();
    }

    removePlayer(player: Player): void {
        this.push(Packets.PushOpcode.Regions, {
            regionId: player.region,
            message: new Messages.Despawn(player.instance),
        });

        if (player.ready) player.save();
        if (this.populationCallback) this.populationCallback();

        this.removeEntity(player);
        this.cleanCombat(player);

        if (player.isGuest) this.database.delete(player);

        delete this.players[player.instance];
        delete this.network.packets[player.instance];

        player.destroy();
        player = null;
    }

    removeProjectile(projectile: Projectile): void {
        this.removeEntity(projectile);
        delete this.projectiles[projectile.instance];
    }

    removeChest(chest: Chest): void {
        this.removeEntity(chest);
        this.push(Packets.PushOpcode.Broadcast, {
            message: new Messages.Despawn(chest.instance),
        });

        if (chest.static) chest.respawn();
        else delete this.chests[chest.instance];
    }

    globalMessage(
        source: any,
        message: any,
        colour?: string,
        isGlobal?: boolean,
        withBubble?: boolean,
    ): void {
        this.push(Packets.PushOpcode.Broadcast, {
            message: new Messages.Chat({
                name: source,
                text: message,
                colour: colour,
                isGlobal: isGlobal,
                withBubble: withBubble,
            }),
        });
    }

    isOnline(username: string): boolean {
        for (const id in this.players)
            if (this.players[id].username.toLowerCase() === username.toLowerCase()) return true;
        return false;
    }

    getPlayerByName(username: string): Player | null {
        for (const id in this.players)
            if (this.players[id].username.toLowerCase() === username.toLowerCase())
                return this.players[id];
        return null;
    }

    isFull(): boolean {
        return this.getPopulation() >= this.maxPlayers;
    }

    getPlayerByInstance(instance: string): Player | null {
        if (instance in this.players) return this.players[instance];
        return null;
    }

    forEachPlayer(callback: (p: Player) => void): void {
        _.each(this.players, (player) => {
            callback(player);
        });
    }

    getPVPAreas() {
        return this.map.areas['PVP'].pvpAreas;
    }

    getMusicAreas() {
        return this.map.areas['Music'].musicAreas;
    }

    getChestAreas() {
        return this.map.areas['Chests'].chestAreas;
    }

    getOverlayAreas() {
        return this.map.areas['Overlays'].overlayAreas;
    }

    getCameraAreas() {
        return this.map.areas['Cameras'].cameraAreas;
    }

    getAchievementAreas() {
        return this.map.areas['Achievements'].achievementAreas;
    }

    getGrids(): Grids {
        return this.map.grids;
    }

    getPopulation(): number {
        return _.size(this.players);
    }

    onPlayerConnection(callback: (conn: Connection) => void): void {
        this.playerConnectCallback = callback;
    }

    onPopulationChange(callback: () => void): void {
        this.populationCallback = callback;
    }
}

export default World;
