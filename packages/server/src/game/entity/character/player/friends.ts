import Player from './player';
import log from '../../../../util/log';

class Friends {
    player: Player;
    friends: { [key: string]: string };

    constructor(player: Player) {
        this.player = player;
        this.friends = {};
    }

    update(info: string): void {
        log.info(info);
    }

    add(username: string): void {
        if (username in this.friends) {
            this.player.notify('That player is already in your friends list.');
            return;
        }

        this.friends[username] = 'offline';
    }

    remove(username: string): void {
        delete this.friends[username];
    }

    getArray(): { [key: string]: string } {
        return this.friends;
    }
}

export default Friends;
