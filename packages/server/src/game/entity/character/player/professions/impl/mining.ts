import Profession from './profession';
import Utils from '../../../../../../util/utils';
import Rocks from '../../../../../../../data/professions/rocks';
import Player from '../../player';

class Mining extends Profession {
    tick: number;

    miningInterval: NodeJS.Timeout | null;
    started: boolean;

    rockId: any;

    constructor(id: number, player: Player) {
        super(id, player, 'Mining');

        this.tick = 1000;

        this.miningInterval = null;
        this.started = false;
    }

    start(): void {
        if (this.started) return;

        this.miningInterval = setInterval(() => {
            // TODO: Implement this
        }, this.tick);

        this.started = true;
    }

    stop(): void {
        if (!this.started) return;

        this.rockId = null;
        this.targetId = null;

        clearInterval(this.miningInterval);
        this.miningInterval = null;

        this.started = false;
    }

    // TODO
    handle(id: any, rockId: any): void {
        if (!this.player.hasMiningWeapon()) {
            this.player.notify('You do not have a pickaxe to mine this rock with.');
            return;
        }

        this.rockId = rockId;
        this.targetId = id;

        if (this.level < Rocks.Levels[this.rockId]) {
            this.player.notify(
                `You must be at least level ${Rocks.Levels[this.rockId]} to mine this rock.`,
            );
            return;
        }

        this.start();
    }

    getRockDestroyChance(): boolean {
        return Utils.randomInt(0, Rocks.Chances[this.rockId]) === 2;
    }
}

export default Mining;
