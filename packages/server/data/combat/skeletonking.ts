import _ from 'lodash';
import Combat from '../../src/game/entity/character/combat/combat';
import Character from '../../src/game/entity/character/character';
import Mob from '../../src/game/entity/character/mob/mob';
import Utils from '../../src/util/utils';

class SkeletonKing extends Combat {
    /**
     * First of its kind, the Skeleton King will spawn 4 minions.
     * Two sorcerers on (x + 1, y + 1) & (x - 1, y + 1)
     * And two death knights on (x + 1, y - 1) & (x - 1, y - 1)
     */

    lastSpawn: number;
    minions: Array<Mob>;

    constructor(character: Mob) {
        character.spawnDistance = 10;
        super(character);

        this.lastSpawn = 0;
        this.minions = [];

        character.onDeath(this.reset);
    }

    reset(): void {
        this.lastSpawn = 0;
        // @todo Cleanup?
        const listCopy = this.minions.slice();
        for (let i = 0; i < listCopy.length; i++) this.world.kill(listCopy[i]);
    }

    hit(character: Character, target: Character, hitInfo: any): void {
        if (this.isAttacked()) this.beginMinionAttack();
        if (this.canSpawn()) this.spawnMinions();
        super.hit(character, target, hitInfo);
    }

    spawnMinions(): void {
        const x = this.character.x;
        const y = this.character.y;

        this.lastSpawn = Date.now();
        if (!this.colliding(x + 2, y - 2)) this.minions.push(this.world.spawnMob(17, x + 2, y + 2));
        if (!this.colliding(x - 2, y - 2)) this.minions.push(this.world.spawnMob(17, x - 2, y + 2));
        if (!this.colliding(x + 1, y + 1)) this.minions.push(this.world.spawnMob(11, x + 1, y - 1));
        if (!this.colliding(x - 1, y + 1)) this.minions.push(this.world.spawnMob(11, x - 1, y - 1));

        _.each(this.minions, (minion: Mob) => {
            minion.onDeath(() => {
                if (this.isLast()) this.lastSpawn = Date.now();
                this.minions.splice(this.minions.indexOf(minion), 1);
            });

            if (this.isAttacked()) this.beginMinionAttack();
        });
    }

    beginMinionAttack(): void {
        if (!this.hasMinions()) return;

        _.each(this.minions, (minion: Mob) => {
            const randomTarget = this.getRandomTarget();
            if (!minion.hasTarget() && randomTarget) minion.combat.begin(randomTarget);
        });
    }

    getRandomTarget() {
        if (this.isAttacked()) {
            const keys = Object.keys(this.attackers);
            const randomAttacker = this.attackers[keys[Utils.randomInt(0, keys.length)]];
            if (randomAttacker) return randomAttacker;
        }

        if (this.character.hasTarget()) return this.character.target;
        return null;
    }

    hasMinions(): boolean {
        return this.minions.length > 0;
    }

    isLast(): boolean {
        return this.minions.length === 1;
    }

    canSpawn(): boolean {
        return Date.now() - this.lastSpawn > 25000 && !this.hasMinions() && this.isAttacked();
    }
}

export default SkeletonKing;
