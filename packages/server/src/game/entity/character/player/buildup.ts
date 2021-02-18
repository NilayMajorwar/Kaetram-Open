import Player from './player';
import Messages from '../../../../network/messages';

class BuildUp {
    private player: Player;
    private effects: any;

    constructor(player: Player) {
        this.player = player;
        this.effects = {}; // The buildup effects
    }

    process() {
        // TODO: Implement this?
    }

    send(opcode: number, info: any): void {
        this.player.send(new Messages.BuildUp(opcode, info));
    }
}

export default BuildUp;
