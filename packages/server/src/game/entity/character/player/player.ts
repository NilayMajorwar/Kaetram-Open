import log from '../../../../util/log';
import Character, { CharacterState } from '../character';
import Incoming from '../../../../controllers/incoming';
import Armour from './equipment/armour';
import Weapon from './equipment/weapon';
import Pendant from './equipment/pendant';
import Ring from './equipment/ring';
import Boots from './equipment/boots';
import Items from '../../../../util/items';
import Messages from '../../../../network/messages';
import Formulas from '../../../../util/formulas';
import HitPoints from './points/hitpoints';
import Mana from './points/mana';
import Packets from '../../../../network/packets';
import Modules from '../../../../util/modules';
import Handler from './handler';
import Quests from '../../../../controllers/quests';
import Inventory from './containers/inventory/inventory';
import Abilities from './abilities/abilities';
import Professions from './professions/professions';
import Bank from './containers/bank/bank';
import Enchant from './enchant';
import Utils from '../../../../util/utils';
import Constants from '../../../../util/constants';
import MongoDB from '../../../../database/mongodb/mongodb';
import Connection from '../../../../network/connection';
import World from '../../../world';
import Map from '../../../../map/map';
import Area from '../../../../map/area';
import Regions from '../../../../map/regions';
import GlobalObjects from '../../../../controllers/globalobjects';
import Hit from '../combat/hit';
import Trade from './trade';
import Warp from './warp';
import Doors from './doors';
import Friends from './friends';
import config from '../../../../../config';
import NPC from '../../npc/npc';
import { EquipmentData } from './equipment/equipment';

export interface PlayerState extends CharacterState {
    rights: number;
    level: number;
    pvp: boolean;
    pvpKills: number;
    pvpDeaths: number;
    attackRange: number;
    orientation: number;
    hitPoints: [number, number];
    mana: [number, number];
    armour: EquipmentData;
    weapon: EquipmentData;
    pendant: EquipmentData;
    ring: EquipmentData;
    boots: EquipmentData;
}

class Player extends Character {
    public world: World;
    public database: MongoDB;
    public connection: Connection;

    public clientId: string;

    public map: Map;
    public regions: Regions;
    public globalObjects: GlobalObjects;

    public incoming: Incoming;

    public ready: boolean;

    public moving: boolean;
    public potentialPosition: any;
    public futurePosition: any;
    public regionPosition: any;

    public newRegion: boolean;

    public team: any; // TODO
    public userAgent: any; // TODO
    public minigame: any; // TODO

    public disconnectTimeout: any;
    public timeoutDuration: number;
    public lastRegionChange: number;

    public handler: Handler;

    public inventory: Inventory;
    public professions: Professions;
    public abilities: Abilities;
    public friends: Friends;
    public enchant: Enchant;
    public bank: Bank;
    public quests: Quests;
    public trade: Trade;
    public doors: Doors;
    public warp: Warp;

    public introduced: boolean;
    public currentSong: string;
    public acceptedTrade: boolean;
    public invincible: boolean;
    public noDamage: boolean;
    public isGuest: boolean;

    public canTalk: boolean;

    public instanced: boolean;
    public visible: boolean;

    public talkIndex: number;
    public cheatScore: number;
    public defaultMovementSpeed: number;

    public regionsLoaded: any;
    public lightsLoaded: any;

    public npcTalk: any;

    public username: string;
    public password: string;
    public email: string;

    public kind: any; // TO REMOVE;
    public rights: number;
    public experience: number;
    public ban: number;
    public mute: number;
    public membership: number; // TO REMOVE;
    public lastLogin: number;
    public pvpKills: number;
    public pvpDeaths: number;
    public orientation: number;
    public mapVersion: number;

    public nextExperience: number;
    public prevExperience: number;
    public hitPoints: HitPoints;
    public mana: Mana;

    public armour: Armour;
    public weapon: Weapon;
    public pendant: Pendant;
    public ring: Ring;
    public boots: Boots;

    public cameraArea: Area;
    public overlayArea: Area;

    public permanentPVP: boolean;
    public movementStart: number;

    public pingTime: any;

    public regionWidth: number;
    public regionHeight: number;

    questsLoaded: boolean;
    achievementsLoaded: boolean;

    public new: boolean;
    public lastNotify: number;
    public profileDialogOpen: boolean;
    public inventoryOpen: boolean;
    public warpOpen: boolean;

    public selectedShopItem: any;

    public deathCallback: () => void;
    public teleportCallback: (x: number, y: number, isDoor?: boolean) => void;
    public cheatScoreCallback: () => void;
    public profileToggleCallback: (state: boolean) => void;
    public inventoryToggleCallback: (state: boolean) => void;
    public warpToggleCallback: (state: boolean) => void;
    public orientationCallback: (orientation: number) => void;
    public regionCallback: () => void;
    public killCallback: (character: Character) => void;
    public attackCallback: () => void;
    public npcTalkCallback: (npc: NPC) => void;
    public doorCallback: (x: number, y: number) => void;
    public readyCallback: () => void;

    constructor(world: World, database: MongoDB, connection: Connection, clientId: string) {
        super(-1, 'player', connection.id, -1, -1);

        this.world = world;
        this.database = database;
        this.connection = connection;

        this.clientId = clientId;

        this.map = world.map;
        this.regions = world.map.regions;
        this.globalObjects = world.globalObjects;

        this.incoming = new Incoming(this);

        this.ready = false;

        this.moving = false;
        this.potentialPosition = null;
        this.futurePosition = null;
        this.regionPosition = null;

        this.newRegion = false;

        this.team = null;
        this.userAgent = null;
        this.minigame = null;

        this.disconnectTimeout = null;
        this.timeoutDuration = 1000 * 60 * 10; //10 minutes
        this.lastRegionChange = Date.now();

        this.handler = new Handler(this);

        this.inventory = new Inventory(this, 20);
        this.professions = new Professions(this);
        this.abilities = new Abilities(this);
        // this.friends = new Friends(this);
        this.enchant = new Enchant(this);
        this.bank = new Bank(this, 56);
        this.quests = new Quests(this);
        this.trade = new Trade(this);
        this.doors = new Doors(this);
        this.warp = new Warp(this);

        this.introduced = false;
        this.currentSong = null;
        this.acceptedTrade = false;
        this.invincible = false;
        this.noDamage = false;
        this.isGuest = false;

        this.pvp = false;

        this.canTalk = true;

        this.instanced = false;
        this.visible = true;

        this.talkIndex = 0;
        this.cheatScore = 0;
        this.defaultMovementSpeed = 250; // For fallback.

        this.regionsLoaded = [];
        this.lightsLoaded = [];

        this.npcTalk = null;
    }

    load(data: any): void {
        this.kind = data.kind;
        this.rights = data.rights;
        this.experience = data.experience;
        this.ban = data.ban;
        this.mute = data.mute;
        this.membership = data.membership;
        this.lastLogin = data.lastLogin;
        this.pvpKills = data.pvpKills;
        this.pvpDeaths = data.pvpDeaths;
        this.orientation = data.orientation;
        this.mapVersion = data.mapVersion;

        this.warp.setLastWarp(data.lastWarp);

        this.level = Formulas.expToLevel(this.experience);
        this.nextExperience = Formulas.nextExp(this.experience);
        this.prevExperience = Formulas.prevExp(this.experience);
        this.hitPoints = new HitPoints(data.hitPoints, Formulas.getMaxHitPoints(this.level));
        this.mana = new Mana(data.mana, Formulas.getMaxMana(this.level));

        if (data.invisibleIds) this.invisiblesIds = data.invisibleIds.split(' ');

        this.userAgent = data.userAgent;

        const { x, y, armour, weapon, pendant, ring, boots } = data;

        this.setPosition(x, y);
        this.setArmour(armour[0], armour[1], armour[2], armour[3]);
        this.setWeapon(weapon[0], weapon[1], weapon[2], weapon[3]);
        this.setPendant(pendant[0], pendant[1], pendant[2], pendant[3]);
        this.setRing(ring[0], ring[1], ring[2], ring[3]);
        this.setBoots(boots[0], boots[1], boots[2], boots[3]);
    }

    destroy(): void {
        clearTimeout(this.disconnectTimeout);

        this.disconnectTimeout = null;

        this.handler.destroy();

        this.handler = null;
        this.inventory = null;
        this.abilities = null;
        this.enchant = null;
        this.bank = null;
        this.quests = null;
        this.trade = null;
        this.doors = null;
        this.warp = null;

        this.connection = null;
    }

    loadRegions(regions: any): void {
        if (!regions) return;

        if (this.mapVersion !== this.map.version) {
            this.mapVersion = this.map.version;
            this.save();
            if (config.debug) log.info(`Updated map version for ${this.username}`);
            return;
        }

        if (regions.gameVersion === config.gver) this.regionsLoaded = regions.regions.split(',');
    }

    loadProfessions(): void {
        if (config.offlineMode) return;

        this.database.loader.getProfessions(this, (info: any) => {
            if (!info) return;
            this.professions.update(info);
            this.sendProfessions();
        });
    }

    loadFriends(): void {
        if (config.offlineMode) return;

        this.database.loader.getFriends(this, (info: any) => {
            if (!info) return;
            this.friends.update(info);
        });
    }

    loadInventory(): void {
        if (config.offlineMode) {
            this.inventory.loadEmpty();
            return;
        }

        this.database.loader.getInventory(
            this,
            (
                ids: Array<number>,
                counts: Array<number>,
                skills: Array<number>,
                skillLevels: Array<number>,
            ) => {
                if (ids === null || counts === null) {
                    this.inventory.loadEmpty();
                    return;
                }

                if (ids.length !== this.inventory.size) this.save();

                this.inventory.load(ids, counts, skills, skillLevels);
                this.inventory.check();
            },
        );
    }

    loadBank(): void {
        if (config.offlineMode) {
            this.bank.loadEmpty();
            return;
        }

        this.database.loader.getBank(this, (ids, counts, skills, skillLevels) => {
            if (ids === null || counts === null) {
                this.bank.loadEmpty();
                return;
            }

            if (ids.length !== this.bank.size) this.save();
            this.bank.load(ids, counts, skills, skillLevels);
            this.bank.check();
        });
    }

    loadQuests(): void {
        if (config.offlineMode) return;

        this.database.loader.getAchievements(this, (ids: any, progress: any) => {
            ids.pop();
            progress.pop();

            if (this.quests.getAchievementSize() !== ids.length) {
                log.info('Mismatch in achievements data.');
                this.save();
            }

            this.quests.updateAchievements(ids, progress);
        });

        this.database.loader.getQuests(this, (ids: any, stages: any) => {
            if (!ids || !stages) {
                this.quests.updateQuests(ids, stages);
                return;
            }

            /* Removes the empty space created by the loader */

            ids.pop();
            stages.pop();

            if (this.quests.getQuestSize() !== ids.length) {
                log.info('Mismatch in quest data.');
                this.save();
            }

            this.quests.updateQuests(ids, stages);
        });

        this.quests.onAchievementsReady(() => {
            this.send(
                new Messages.Quest(
                    Packets.QuestOpcode.AchievementBatch,
                    this.quests.getAchievementData(),
                ),
            );

            /* Update region here because we receive quest info */
            if (this.questsLoaded) this.updateRegion();
            this.achievementsLoaded = true;
        });

        this.quests.onQuestsReady(() => {
            this.send(
                new Messages.Quest(Packets.QuestOpcode.QuestBatch, this.quests.getQuestData()),
            );

            /* Update region here because we receive quest info */
            if (this.achievementsLoaded) this.updateRegion();
            this.questsLoaded = true;
        });
    }

    intro(): void {
        if (this.ban > Date.now()) {
            this.connection.sendUTF8('ban');
            this.connection.close('Player: ' + this.username + ' is banned.');
        }

        if (this.x <= 0 || this.y <= 0) this.sendToSpawn();
        if (this.hitPoints.getHitPoints() < 0) this.hitPoints.setHitPoints(this.getMaxHitPoints());
        if (this.mana.getMana() < 0) this.mana.setMana(this.mana.getMaxMana());
        this.verifyRights();

        const info = {
            instance: this.instance,
            username: Utils.formatUsername(this.username),
            x: this.x,
            y: this.y,
            kind: this.kind,
            rights: this.rights,
            hitPoints: this.hitPoints.getData(),
            mana: this.mana.getData(),
            experience: this.experience,
            nextExperience: this.nextExperience,
            prevExperience: this.prevExperience,
            level: this.level,
            lastLogin: this.lastLogin,
            pvpKills: this.pvpKills,
            pvpDeaths: this.pvpDeaths,
            orientation: this.orientation,
            movementSpeed: this.getMovementSpeed(),
        };

        this.regionPosition = [this.x, this.y];
        this.world.addPlayer(this);
        // Send player data to client
        this.send(new Messages.Welcome(info));
    }

    verifyRights(): void {
        if (config.moderators.includes(this.username.toLowerCase())) this.rights = 1;
        if (config.administrators.includes(this.username.toLowerCase()) || config.offlineMode)
            this.rights = 2;
    }

    addExperience(exp: number): void {
        this.experience += exp;

        const oldLevel = this.level;

        this.level = Formulas.expToLevel(this.experience);
        this.nextExperience = Formulas.nextExp(this.experience);
        this.prevExperience = Formulas.prevExp(this.experience);

        if (oldLevel !== this.level) {
            this.hitPoints.setMaxHitPoints(Formulas.getMaxHitPoints(this.level));
            this.healHitPoints(this.hitPoints.maxPoints);

            this.updateRegion();
            this.popup('Level Up!', `Congratulations, you are now level ${this.level}!`, '#ff6600');
        }

        const data: any = {
            id: this.instance,
            level: this.level,
        };

        /**
         * Sending two sets of data as other users do not need to
         * know the experience of another player.. (yet).
         */

        this.sendToAdjacentRegions(
            this.region,
            new Messages.Experience(Packets.ExperienceOpcode.Combat, data),
            this.instance,
        );

        data.amount = exp;
        data.experience = this.experience;
        data.nextExperience = this.nextExperience;
        data.prevExperience = this.prevExperience;

        this.send(new Messages.Experience(Packets.ExperienceOpcode.Combat, data));
        this.sync();
    }

    heal(amount: number): void {
        /**
         * Passed from the superclass...
         */

        if (!this.hitPoints || !this.mana) return;

        this.hitPoints.heal(amount);
        this.mana.heal(amount);

        this.sync();
    }

    healHitPoints(amount: number): void {
        const type = 'health';
        this.hitPoints.heal(amount);
        this.sync();

        this.sendToAdjacentRegions(
            this.region,
            new Messages.Heal({
                id: this.instance,
                type: type,
                amount: amount,
            }),
        );
    }

    healManaPoints(amount: number): void {
        const type = 'mana';
        this.mana.heal(amount);
        this.sync();

        this.sendToAdjacentRegions(
            this.region,
            new Messages.Heal({
                id: this.instance,
                type: type,
                amount: amount,
            }),
        );
    }

    eat(id: number): void {
        const item = Items.getPlugin(id);
        if (!item) return;
        new item(id).onUse(this);
    }

    equip(string: string, count: number, ability: number, abilityLevel: number): void {
        const data = Items.getData(string);
        if (!data || data === 'null') return;

        log.debug(`Equipping item - ${[string, count, ability, abilityLevel]}`);

        let type;
        if (Items.isArmour(string)) type = Modules.Equipment.Armour;
        else if (Items.isWeapon(string)) type = Modules.Equipment.Weapon;
        else if (Items.isPendant(string)) type = Modules.Equipment.Pendant;
        else if (Items.isRing(string)) type = Modules.Equipment.Ring;
        else if (Items.isBoots(string)) type = Modules.Equipment.Boots;

        const id = Items.stringToId(string);
        const power = Items.getLevelRequirement(string);

        switch (type) {
            case Modules.Equipment.Armour:
                if (this.hasArmour() && this.armour.id !== 114)
                    this.inventory.add(this.armour.getItem());
                this.setArmour(id, count, ability, abilityLevel);
                break;

            case Modules.Equipment.Weapon:
                if (this.hasWeapon()) this.inventory.add(this.weapon.getItem());
                this.setWeapon(id, count, ability, abilityLevel);
                break;

            case Modules.Equipment.Pendant:
                if (this.hasPendant()) this.inventory.add(this.pendant.getItem());
                this.setPendant(id, count, ability, abilityLevel);
                break;

            case Modules.Equipment.Ring:
                if (this.hasRing()) this.inventory.add(this.ring.getItem());
                this.setRing(id, count, ability, abilityLevel);
                break;

            case Modules.Equipment.Boots:
                if (this.hasBoots()) this.inventory.add(this.boots.getItem());
                this.setBoots(id, count, ability, abilityLevel);
                break;
        }

        this.send(
            new Messages.Equipment(Packets.EquipmentOpcode.Equip, {
                type: type,
                name: Items.idToName(id),
                string: string,
                count: count,
                ability: ability,
                abilityLevel: abilityLevel,
                power: power,
            }),
        );
    }

    updateRegion(force?: boolean): void {
        this.world.region.sendRegion(this, this.region, force);
    }

    isInvisible(instance: string): boolean {
        const entity = this.world.getEntityByInstance(instance);
        if (!entity) return false;
        return super.hasInvisibleId(entity.id) || super.hasInvisible(entity);
    }

    formatInvisibles(): string {
        return this.invisiblesIds.join(' ');
    }

    canEquip(string: string): boolean {
        let requirement = Items.getLevelRequirement(string);
        if (requirement > Constants.MAX_LEVEL) requirement = Constants.MAX_LEVEL;

        if (requirement > this.level) {
            this.notify('You must be at least level ' + requirement + ' to equip this.');
            return false;
        }
        return true;
    }

    die(): void {
        this.dead = true;
        if (this.deathCallback) this.deathCallback();
        this.send(new Messages.Death(this.instance));
    }

    teleport(x: number, y: number, isDoor?: boolean, animate?: boolean): void {
        if (this.teleportCallback) this.teleportCallback(x, y, isDoor);

        this.sendToAdjacentRegions(
            this.region,
            new Messages.Teleport({
                id: this.instance,
                x: x,
                y: y,
                withAnimation: animate,
            }),
        );

        this.setPosition(x, y);
        this.world.cleanCombat(this);
    }

    /**
     * We route all object clicks through the player instance
     * in order to organize data more neatly.
     */

    handleObject(id: string): void {
        const info = this.globalObjects.getInfo(id);
        if (!info) return;

        let data: any;

        switch (info.type) {
            case 'sign': {
                data = this.globalObjects.getSignData(id);
                if (!data) return;

                const message = this.globalObjects.talk(data.object, this);

                this.world.push(Packets.PushOpcode.Player, {
                    player: this,
                    message: new Messages.Bubble({
                        id: id,
                        text: message,
                        duration: 5000,
                        isObject: true,
                        info: data.info,
                    }),
                });
                break;
            }

            case 'lumberjacking': {
                const lumberjacking = this.professions.getProfession(
                    Modules.Professions.Lumberjacking,
                );
                // @ts-ignore Fix this
                if (lumberjacking) lumberjacking.handle(id, info.tree);
                break;
            }
        }
    }

    incrementCheatScore(amount: number): void {
        if (this.combat.started) return;
        this.cheatScore += amount;
        if (this.cheatScoreCallback) this.cheatScoreCallback();
    }

    updatePVP(pvp: boolean, permanent?: boolean): void {
        /**
         * No need to update if the state is the same
         */

        if (!this.region) return;
        if (this.pvp === pvp || this.permanentPVP) return;

        if (this.pvp && !pvp) this.notify('You are no longer in a PvP zone!');
        else this.notify('You have entered a PvP zone!');

        this.pvp = pvp;
        this.permanentPVP = permanent;

        this.sendToAdjacentRegions(this.region, new Messages.PVP(this.instance, this.pvp));
    }

    updateOverlay(overlay: any): void {
        if (this.overlayArea === overlay) return;
        this.overlayArea = overlay;

        if (overlay && overlay.id) {
            this.lightsLoaded = [];
            this.send(
                new Messages.Overlay(Packets.OverlayOpcode.Set, {
                    image: overlay.fog ? overlay.fog : 'empty',
                    colour: 'rgba(0,0,0,' + overlay.darkness + ')',
                }),
            );
        } else this.send(new Messages.Overlay(Packets.OverlayOpcode.Remove));
    }

    updateCamera(camera: any): void {
        if (this.cameraArea === camera) return;
        this.cameraArea = camera;

        if (camera) {
            switch (camera.type) {
                case 'lockX':
                    this.send(new Messages.Camera(Packets.CameraOpcode.LockX));
                    break;

                case 'lockY':
                    this.send(new Messages.Camera(Packets.CameraOpcode.LockY));
                    break;

                case 'player':
                    this.send(new Messages.Camera(Packets.CameraOpcode.Player));
                    break;
            }
        } else this.send(new Messages.Camera(Packets.CameraOpcode.FreeFlow));
    }

    updateMusic(song: string): void {
        this.currentSong = song;
        this.send(new Messages.Audio(song));
    }

    revertPoints(): void {
        this.hitPoints.setHitPoints(this.hitPoints.getMaxHitPoints());
        this.mana.setMana(this.mana.getMaxMana());
        this.sync();
    }

    applyDamage(damage: number): void {
        this.hitPoints.decrement(damage);
    }

    toggleProfile(state: boolean): void {
        this.profileDialogOpen = state;
        if (this.profileToggleCallback) this.profileToggleCallback(state);
    }

    toggleInventory(state: boolean): void {
        this.inventoryOpen = state;
        if (this.inventoryToggleCallback) this.inventoryToggleCallback(state);
    }

    toggleWarp(state: boolean): void {
        this.warpOpen = state;
        if (this.warpToggleCallback) this.warpToggleCallback(state);
    }

    getMana(): number {
        return this.mana.getMana();
    }

    getMaxMana(): number {
        return this.mana.getMaxMana();
    }

    getHitPoints(): number {
        return this.hitPoints.getHitPoints();
    }

    getMaxHitPoints(): number {
        return this.hitPoints.getMaxHitPoints();
    }

    getTutorial() {
        return this.quests.getQuest(Modules.Quests.Introduction);
    }

    getWeaponLevel(): number {
        return this.weapon.getLevel();
    }

    getArmourLevel(): number {
        return this.armour.getDefense();
    }

    getLumberjackingLevel(): number {
        return this.professions.getProfession(Modules.Professions.Lumberjacking).getLevel();
    }

    getWeaponLumberjackingLevel(): number {
        if (!this.hasLumberjackingWeapon()) return -1;
        return this.weapon.lumberjacking;
    }

    getWeaponMiningLevel(): number {
        if (!this.hasMiningWeapon()) return -1;
        return this.weapon.mining;
    }

    // We get dynamic trees surrounding the player
    getSurroundingTrees() {
        const tiles = {
            indexes: [],
            data: [],
            collisions: [],
            objectData: {},
        };

        this.map.treeIndexes.forEach((index) => {
            const position = this.map.indexToGridPosition(index + 1);
            const treeRegion = this.regions.regionIdFromPosition(position.x, position.y);

            if (!this.regions.isSurrounding(this.region, treeRegion)) return;

            const objectId = this.map.getPositionObject(position.x, position.y);
            const cursor = this.map.getCursor(index, objectId);

            tiles.indexes.push(index);
            tiles.data.push(this.map.data[index]);
            tiles.collisions.push(this.map.collisions.includes(index));

            if (objectId)
                tiles.objectData[index] = {
                    isObject: !!objectId,
                    cursor: cursor,
                };
        });

        return tiles;
    }

    getMovementSpeed(): number {
        const itemMovementSpeed = Items.getMovementSpeed(this.armour.name);
        const movementSpeed = itemMovementSpeed || this.defaultMovementSpeed;

        /*
         * Here we can handle equipment/potions/abilities that alter
         * the player's movement speed. We then just broadcast it.
         */

        this.movementSpeed = movementSpeed;
        return this.movementSpeed;
    }

    /**
     * Setters
     */

    breakWeapon(): void {
        this.notify('Your weapon has been broken.');
        this.setWeapon(-1, 0, 0, 0);
        this.sendEquipment();
    }

    setArmour(id: number, count: number, ability: number, abilityLevel: number): void {
        if (!id) return;
        this.armour = new Armour(Items.idToString(id), id, count, ability, abilityLevel);
    }

    setWeapon(id: number, count: number, ability: number, abilityLevel: number): void {
        if (!id) return;
        this.weapon = new Weapon(Items.idToString(id), id, count, ability, abilityLevel);
        if (this.weapon.ranged) this.attackRange = 7;
    }

    setPendant(id: number, count: number, ability: number, abilityLevel: number): void {
        if (!id) return;
        this.pendant = new Pendant(Items.idToString(id), id, count, ability, abilityLevel);
    }

    setRing(id: number, count: number, ability: number, abilityLevel: number): void {
        if (!id) return;
        this.ring = new Ring(Items.idToString(id), id, count, ability, abilityLevel);
    }

    setBoots(id: number, count: number, ability: number, abilityLevel: number): void {
        if (!id) return;
        this.boots = new Boots(Items.idToString(id), id, count, ability, abilityLevel);
    }

    guessPosition(x: number, y: number): void {
        this.potentialPosition = {
            x: x,
            y: y,
        };
    }

    setPosition(x: number, y: number): void {
        if (this.dead) return;

        if (this.map.isOutOfBounds(x, y)) {
            x = 50;
            y = 89;
        }

        super.setPosition(x, y);

        this.sendToAdjacentRegions(
            this.region,
            new Messages.Movement(Packets.MovementOpcode.Move, {
                id: this.instance,
                x: x,
                y: y,
                forced: false,
                teleport: false,
            }),
            this.instance,
        );
    }

    setOrientation(orientation: number): void {
        this.orientation = orientation;

        if (this.orientationCallback)
            // Will be necessary in the future.
            this.orientationCallback(orientation);
    }

    setFuturePosition(x: number, y: number): void {
        /**
         * Most likely will be used for anti-cheating methods
         * of calculating the actual time and duration for the
         * displacement.
         */

        this.futurePosition = {
            x: x,
            y: y,
        };
    }

    loadRegion(regionId: string): void {
        this.regionsLoaded.push(regionId);
    }

    hasLoadedRegion(region: string): boolean {
        return this.regionsLoaded.includes(region);
    }

    hasLoadedLight(light): boolean {
        return this.lightsLoaded.includes(light);
    }

    timeout(): void {
        if (!this.connection) return;
        this.connection.sendUTF8('timeout');
        this.connection.close('Player timed out.');
    }

    refreshTimeout(): void {
        clearTimeout(this.disconnectTimeout);

        this.disconnectTimeout = setTimeout(() => {
            this.timeout();
        }, this.timeoutDuration);
    }

    /**
     * Getters
     */

    hasArmour(): boolean {
        return this.armour && this.armour.name !== 'null' && this.armour.id !== -1;
    }

    hasWeapon(): boolean {
        return this.weapon && this.weapon.name !== 'null' && this.weapon.id !== -1;
    }

    hasLumberjackingWeapon(): boolean {
        return this.weapon && this.weapon.lumberjacking > 0;
    }

    hasMiningWeapon(): boolean {
        return this.weapon && this.weapon.mining > 0;
    }

    hasBreakableWeapon(): boolean {
        return this.weapon && this.weapon.breakable;
    }

    hasPendant(): boolean {
        return this.pendant && this.pendant.name !== 'null' && this.pendant.id !== -1;
    }

    hasRing(): boolean {
        return this.ring && this.ring.name !== 'null' && this.ring.id !== -1;
    }

    hasBoots(): boolean {
        return this.boots && this.boots.name !== 'null' && this.boots.id !== -1;
    }

    hasMaxHitPoints(): boolean {
        return this.getHitPoints() >= this.hitPoints.getMaxHitPoints();
    }

    hasMaxMana(): boolean {
        return this.mana.getMana() >= this.mana.getMaxMana();
    }

    hasSpecialAttack(): boolean {
        return (
            this.weapon &&
            (this.weapon.hasCritical() || this.weapon.hasExplosive() || this.weapon.hasStun())
        );
    }

    canBeStunned(): boolean {
        return true;
    }

    getState(): PlayerState {
        return {
            type: this.type,
            id: this.instance,
            name: Utils.formatUsername(this.username),
            x: this.x,
            y: this.y,
            rights: this.rights,
            level: this.level,
            pvp: this.pvp,
            pvpKills: this.pvpKills,
            pvpDeaths: this.pvpDeaths,
            attackRange: this.attackRange,
            orientation: this.orientation,
            hitPoints: this.hitPoints.getData(),
            movementSpeed: this.getMovementSpeed(),
            mana: this.mana.getData(),
            armour: this.armour.getData(),
            weapon: this.weapon.getData(),
            pendant: this.pendant.getData(),
            ring: this.ring.getData(),
            boots: this.boots.getData(),
            string: '', // @todo Pass a better `string`?
        };
    }

    getRemoteAddress(): string {
        return this.connection.socket.conn.remoteAddress;
    }

    getSpawn(): { x: number; y: number } {
        /**
         * Here we will implement functions from quests and
         * other special events and determine a spawn point.
         */

        // @ts-ignore Fix this
        if (!this.finishedTutorial()) return this.getTutorial().getSpawn();
        return { x: 325, y: 87 };
    }

    getHit(target?: Character): Hit {
        const defaultDamage = Formulas.getDamage(this, target);
        const isSpecial = Utils.randomInt(0, 100) < 30 + this.weapon.abilityLevel * 3;

        if (!isSpecial || !this.hasSpecialAttack())
            return new Hit(Modules.Hits.Damage, defaultDamage);

        switch (this.weapon.ability) {
            case Modules.Enchantment.Critical: {
                /**
                 * Still experimental, not sure how likely it is that you're
                 * gonna do a critical strike. I just do not want it getting
                 * out of hand, it's easier to buff than to nerf..
                 */

                const multiplier = 1 + this.weapon.abilityLevel;
                const damage = defaultDamage * multiplier;
                return new Hit(Modules.Hits.Critical, damage);
            }

            case Modules.Enchantment.Stun:
                return new Hit(Modules.Hits.Stun, defaultDamage);

            case Modules.Enchantment.Explosive:
                return new Hit(Modules.Hits.Explosive, defaultDamage);
        }
    }

    isMuted(): boolean {
        return this.mute - Date.now() > 0;
    }

    isRanged(): boolean {
        return this.weapon && this.weapon.isRanged();
    }

    isDead(): boolean {
        return this.getHitPoints() < 1 || this.dead;
    }

    /**
     * Miscellaneous
     */

    send(message: any): void {
        this.world.push(Packets.PushOpcode.Player, {
            player: this,
            message: message,
        });
    }

    sendToRegion(message: any): void {
        this.world.push(Packets.PushOpcode.Region, {
            regionId: this.region,
            message: message,
        });
    }

    sendToAdjacentRegions(regionId: string, message: any, ignoreId?: string): void {
        this.world.push(Packets.PushOpcode.Regions, {
            regionId: regionId,
            message: message,
            ignoreId: ignoreId,
        });
    }

    sendEquipment(): void {
        this.send(
            new Messages.Equipment(Packets.EquipmentOpcode.Batch, {
                armour: this.armour.getData(),
                weapon: this.weapon.getData(),
                pendant: this.pendant.getData(),
                ring: this.ring.getData(),
                boots: this.boots.getData(),
            }),
        );
    }

    sendProfessions(): void {
        if (!this.professions) return;
        this.send(
            new Messages.Profession(Packets.ProfessionOpcode.Batch, {
                data: this.professions.getInfo(),
            }),
        );
    }

    sendToSpawn(): void {
        const position = this.getSpawn();
        this.x = position.x;
        this.y = position.y;
    }

    sendMessage(playerName: string, message: string): void {
        if (config.hubEnabled) {
            this.world.api.sendPrivateMessage(this, playerName, message);
            return;
        }

        if (!this.world.isOnline(playerName)) {
            this.notify(`@aquamarine@${playerName}@crimson@ is not online.`, 'crimson');
            return;
        }

        const otherPlayer = this.world.getPlayerByName(playerName);
        const oFormattedName = Utils.formatUsername(playerName); // Formated username of the other player.
        const formattedName = Utils.formatUsername(this.username); // Formatted username of current instance.

        otherPlayer.notify(`[From ${oFormattedName}]: ${message}`, 'aquamarine');
        this.notify(`[To ${formattedName}]: ${message}`, 'aquamarine');
    }

    sync(): void {
        /**
         * Function to be used for syncing up health,
         * mana, exp, and other variables
         */

        if (!this.hitPoints || !this.mana) return;

        this.sendToAdjacentRegions(
            this.region,
            new Messages.Sync({
                id: this.instance,
                attackRange: this.attackRange,
                hitPoints: this.getHitPoints(),
                maxHitPoints: this.getMaxHitPoints(),
                mana: this.mana.getMana(),
                maxMana: this.mana.getMaxMana(),
                level: this.level,
                armour: this.armour.getString(),
                weapon: this.weapon.getData(),
                poison: !!this.poison,
                movementSpeed: this.getMovementSpeed(),
            }),
        );

        this.save();
    }

    popup(title: string, message: string, colour: string): void {
        if (!title) return;

        title = Utils.parseMessage(title);
        message = Utils.parseMessage(message);

        this.send(
            new Messages.Notification(Packets.NotificationOpcode.Popup, {
                title: title,
                message: message,
                colour: colour,
            }),
        );
    }

    notify(message: string, colour?: string): void {
        if (!message) return;
        // Prevent notify spams
        if (Date.now() - this.lastNotify < 250) return;

        message = Utils.parseMessage(message);
        this.send(
            new Messages.Notification(Packets.NotificationOpcode.Text, {
                message: message,
                colour: colour,
            }),
        );
        this.lastNotify = Date.now();
    }

    /**
     * Sends a chat packet that can be used to
     * show special messages to the player.
     */
    chat(
        source: string,
        text: string,
        colour?: string,
        isGlobal?: boolean,
        withBubble?: boolean,
    ): void {
        if (!source || !text) return;

        this.send(
            new Messages.Chat({
                name: source,
                text: text,
                colour: colour,
                isGlobal: isGlobal,
                withBubble: withBubble,
            }),
        );
    }

    stopMovement(force?: boolean): void {
        /**
         * Forcefully stopping the player will simply halt
         * them in between tiles. Should only be used if they are
         * being transported elsewhere.
         */

        this.send(
            new Messages.Movement(Packets.MovementOpcode.Stop, {
                instance: this.instance,
                force: force,
            }),
        );
    }

    finishedTutorial(): boolean {
        if (!this.quests || !config.tutorialEnabled) return true;
        return this.quests.getQuest(0).isFinished();
    }

    finishedAchievement(id: number): boolean {
        if (!this.quests) return false;

        const achievement = this.quests.getAchievement(id);
        if (!achievement) return true;
        return achievement.isFinished();
    }

    finishAchievement(id: number): void {
        if (!this.quests) return;

        const achievement = this.quests.getAchievement(id);
        if (!achievement || achievement.isFinished()) return;
        achievement.finish();
    }

    checkRegions(): void {
        if (!this.regionPosition) return;

        const diffX = Math.abs(this.regionPosition[0] - this.x);
        const diffY = Math.abs(this.regionPosition[1] - this.y);

        if (diffX >= 10 || diffY >= 10) {
            this.regionPosition = [this.x, this.y];
            if (this.regionCallback) this.regionCallback();
        }
    }

    movePlayer(): void {
        /**
         * Server-sided callbacks towards movement should
         * not be able to be overwritten. In the case that
         * this is used (for Quests most likely) the server must
         * check that no hacker removed the constraint in the client-side.
         * If they are not within the bounds, apply the according punishment.
         */

        this.send(new Messages.Movement(Packets.MovementOpcode.Started));
    }

    walkRandomly(): void {
        setInterval(() => {
            this.setPosition(this.x + Utils.randomInt(-5, 5), this.y + Utils.randomInt(-5, 5));
        }, 2000);
    }

    killCharacter(character: Character): void {
        if (this.killCallback) this.killCallback(character);
    }

    save(): void {
        if (config.offlineMode || this.isGuest) return;
        if ((!this.questsLoaded || !this.achievementsLoaded) && !this.new) return;

        this.database.creator.save(this);
    }

    inTutorial(): boolean {
        return this.world.map.inTutorialArea(this);
    }

    hasAggressionTimer(): boolean {
        return Date.now() - this.lastRegionChange < 20 * 60 * 1000; // 20 Minutes
    }

    onOrientation(callback: (orientation: number) => void): void {
        this.orientationCallback = callback;
    }

    onRegion(callback: () => void): void {
        this.regionCallback = callback;
    }

    onAttack(callback: () => void): void {
        this.attackCallback = callback;
    }

    onHit(callback: (attacker: Character, damage: number) => void): void {
        this.hitCallback = callback;
    }

    onKill(callback: (character: Character) => void): void {
        this.killCallback = callback;
    }

    onDeath = (callback: () => void): void => {
        this.deathCallback = callback;
    };

    onTalkToNPC(callback: (npc: NPC) => void): void {
        this.npcTalkCallback = callback;
    }

    onDoor(callback: (x: number, y: number) => void): void {
        this.doorCallback = callback;
    }

    onTeleport(callback: (x: number, y: number, isDoor?: boolean) => void): void {
        this.teleportCallback = callback;
    }

    onProfile(callback: (state: boolean) => void): void {
        this.profileToggleCallback = callback;
    }

    onInventory(callback: (state: boolean) => void): void {
        this.inventoryToggleCallback = callback;
    }

    onWarp(callback: (state: boolean) => void): void {
        this.warpToggleCallback = callback;
    }

    onCheatScore(callback: () => void): void {
        this.cheatScoreCallback = callback;
    }

    onReady(callback: () => void): void {
        this.readyCallback = callback;
    }
}

export default Player;
