import _ from 'lodash';
import World from '../game/world';
import MongoDB from '../database/mongodb/mongodb';
import Messages from './messages';
import Region from '../region/region';
import Map from '../map/map';
import Player from '../game/entity/character/player/player';
import Utils from '../util/utils';
import Connection from './connection';
import config from '../../config';
import WebSocket from './websocket';

class Network {
    world: World;
    database: MongoDB;
    socket: WebSocket;
    region: Region;
    map: Map;

    packets: any;
    differenceThreshold: number;

    constructor(world: World) {
        this.world = world;
        this.database = world.database;
        this.socket = world.socket;
        this.region = world.region;
        this.map = world.map;
        this.packets = {};
        this.differenceThreshold = 4000;

        this.load();
    }

    load(): void {
        this.world.onPlayerConnection((connection: any) => {
            this.handlePlayerConnection(connection);
        });

        this.world.onPopulationChange(() => {
            this.handlePopulationChange();
        });
    }

    parsePackets(): void {
        /**
         * This parses through the packet pool and sends them
         */

        for (const id in this.packets) {
            if (this.packets[id].length > 0 && this.packets.hasOwnProperty(id)) {
                const conn = this.socket.get(id);
                if (conn) {
                    conn.send(this.packets[id]);
                    this.packets[id] = [];
                    this.packets[id].id = id;
                } else this.socket.remove(id);
            }
        }
    }

    handlePlayerConnection(connection: any): void {
        const clientId = Utils.generateClientId();
        const player = new Player(this.world, this.database, connection, clientId);
        const timeDifference = Date.now() - this.getSocketTime(connection);

        if (!config.debug && timeDifference < this.differenceThreshold) {
            connection.sendUTF8('toofast');
            connection.close('Logging in too fast.');
            return;
        }

        this.socket.ips[connection.socket.conn.remoteAddress] = Date.now();

        this.addToPackets(player);

        this.pushToPlayer(
            player,
            new Messages.Handshake({
                id: clientId,
                development: config.devClient,
            }),
        );
    }

    handlePopulationChange(): void {
        this.pushBroadcast(new Messages.Population(this.world.getPopulation()));
    }

    addToPackets(player: Player): void {
        this.packets[player.instance] = [];
    }

    /*****************************************
     * Broadcasting and Socket Communication *
     *****************************************/

    /**
     * Broadcast a message to everyone in the world.
     */
    pushBroadcast(message: any): void {
        _.each(this.packets, (packet: any) => {
            packet.push(message.serialize());
        });
    }

    /**
     * Broadcast a message to everyone with exceptions.
     */
    pushSelectively(message: any, ignores?: any): void {
        _.each(this.packets, (packet: any) => {
            if (!ignores || !ignores.includes(packet.id)) packet.push(message.serialize());
        });
    }

    /**
     * Push a message to a single player.
     */
    pushToPlayer(player: any, message: any): void {
        if (player && player.instance in this.packets)
            this.packets[player.instance].push(message.serialize());
    }

    /**
     * Specify an array of player instances to send message to
     */
    pushToPlayers(players: any, message: any): void {
        _.each(players, (instance: string) => {
            this.pushToPlayer(this.world.getPlayerByInstance(instance), message);
        });
    }

    /**
     * Send a message to the region the player is currently in.
     */
    pushToRegion(regionId: string, message: any, ignoreId?: string): void {
        const region = this.region.regions[regionId];
        if (!region) return;

        _.each(region.players, (instance: string) => {
            if (instance !== ignoreId)
                this.pushToPlayer(this.world.getEntityByInstance(instance), message);
        });
    }

    /**
     * Sends a message to all the surrounding regions of the player.
     * G  G  G
     * G  P  G
     * G  G  G
     */
    pushToAdjacentRegions(regionId: string, message: any, ignoreId?: any): void {
        this.map.regions.forEachSurroundingRegion(regionId, (id: string) => {
            this.pushToRegion(id, message, ignoreId);
        });
    }

    /**
     * Sends a message to an array of player names
     */
    pushToNameArray(names: any, message: any): void {
        _.each(names, (name: string) => {
            const player = this.world.getPlayerByName(name);
            if (player) this.pushToPlayer(player, message);
        });
    }

    /**
     * Sends a message to the region the player just left from
     */
    pushToOldRegions(player: Player, message: any): void {
        _.each(player.recentRegions, (id: string) => {
            this.pushToRegion(id, message);
        });

        player.recentRegions = [];
    }

    getSocketTime(connection: Connection): number {
        return this.socket.ips[connection.socket.conn.remoteAddress];
    }
}

export default Network;
