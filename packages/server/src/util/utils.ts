/**
 * This package is used for creating functions used all throughout the
 * game server.
 */

import _ from 'lodash';
import crypto from 'crypto';

import Packets from '../network/packets';
import log from '../util/log';

export default {
    /**
     * Returns a random floating-point number from 0 to `range`
     */
    random(range: number): number {
        return Math.floor(Math.random() * range);
    },

    /**
     * Returns a random floating-point number between `min` and `max`
     */
    randomRange(min: number, max: number): number {
        return min + Math.random() * (max - min);
    },

    /**
     * Returns a random integer between `min` and `max`, both inclusive
     */
    randomInt(min: number, max: number): number {
        return min + Math.floor(Math.random() * (max - min + 1));
    },

    /**
     * Returns the semi-Manhattan distance between two points. Computes individual
     * Manhattan distances along x and y, then returns the larger of the two.
     */
    getDistance(startX: number, startY: number, toX: number, toY: number): number {
        const x = Math.abs(startX - toX);
        const y = Math.abs(startY - toY);
        return x > y ? x : y;
    },

    /**
     * Returns an offset within semi-Manhattan distance `radius` of the origin
     */
    positionOffset(radius: number): { x: number; y: number } {
        return {
            x: this.randomInt(0, radius),
            y: this.randomInt(0, radius),
        };
    },

    /**
     * We are just using some incremental seeds to prevent ids/instances
     * from ending up with the same numbers/variables.
     *
     * @todo Can we use UUIDs or something similar here?
     */

    idSeed: 0,
    clientSeed: 0,
    instanceSeed: 0,
    socketSeed: 0,

    /**
     * Generates a unique ID string
     */
    generateRandomId(): string {
        return ++this.idSeed + '' + this.randomInt(0, 25000);
    },

    /**
     * Generates a unique client ID string
     */
    generateClientId(): string {
        return ++this.clientSeed + '' + this.randomInt(0, 25000);
    },

    /**
     * Generates a unique instance ID string
     */
    generateInstance(): string {
        return ++this.instanceSeed + '' + this.randomInt(0, 25000);
    },

    /**
     * Checks if packet is valid
     */
    validPacket(packet: number): boolean {
        const keys = Object.keys(Packets);

        // for (let i = 0; i < keys.length; i++)
        //     if (!keys[i].endsWith('Opcode')) filtered.push(keys[i]);
        const filtered = keys.filter((key) => !key.endsWith('Opcode'));

        return packet > -1 && packet < Packets[filtered[filtered.length - 1]] + 1;
    },

    /**
     * Gets current time in milliseconds since epoch
     */
    getCurrentEpoch(): number {
        return Date.now();
    },

    /**
     * Formats the provided username to a human-like name
     */
    formatUsername(username: string): string {
        return username.replace(
            /\w\S*/g,
            (string) => string.charAt(0).toUpperCase() + string.slice(1).toLowerCase(),
        );
    },

    /**
     * This function is responsible for parsing a message and looking for special
     * characters (primarily used for colour codes). This function will be expanded
     * if necessary in the nearby future.
     */
    parseMessage(message: string): string {
        try {
            const messageBlocks = message.split('@');

            if (messageBlocks.length % 2 === 0) {
                log.warning('Improper message block format!');
                log.warning('Ensure format follows @COLOUR@ format.');
                return messageBlocks.join(' ');
            }

            _.each(messageBlocks, (_block, index) => {
                if (index % 2 !== 0)
                    // we hit a colour code.
                    messageBlocks[index] = `<span style="color:${messageBlocks[index]};">`;
            });

            const codeCount = messageBlocks.length / 2 - 1;

            for (let i = 0; i < codeCount; i++) messageBlocks.push('</span>');

            return messageBlocks.join('');
        } catch {
            return '';
        }
    },

    /**
     * This function is primarily used for comparing checksum data
     * of maps in order to determine if an update is necessary.
     * @param data Any form of data, string, numbers, etc.
     */
    getChecksum(data: any): string {
        return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
    },
};
