import Combat from '../../src/game/entity/character/combat/combat';
import Character from '../../src/game/entity/character/character';
import Player from '../../src/game/entity/character/player/player';
import Hit from '../../src/game/entity/character/combat/hit';
import Modules from '../../src/util/modules';
import log from '../../src/util/log';

class Cactus extends Combat {
    constructor(character: Character) {
        character.spawnDistance = 10;
        character.alwaysAggressive = true;

        super(character);

        this.character = character;

        this.character.onDamaged((damage: number, attacker?: Character) => {
            if (
                !attacker ||
                !(attacker instanceof Player) ||
                !attacker.armour ||
                attacker.isRanged()
            )
                return;

            this.damageAttacker(damage, attacker);
            log.debug(`Entity ${this.character.id} damaged ${damage} by ${attacker.instance}.`);
        });

        this.character.onDeath(() => {
            this.forEachAttacker((attacker: Character) => {
                if (!(attacker instanceof Player)) return;
                this.damageAttacker(this.character.maxHitPoints, attacker);
            });

            log.debug('Oh noes, le cactus did a die. :(');
        });
    }

    damageAttacker(damage: number, attacker: Player): void {
        if (!attacker || !attacker.armour || attacker.isRanged()) return;

        /**
         * This is the formula for dealing damage when a player
         * attacks the cactus. Eventually the damage will cancel out
         * as the armour gets better.
         **/

        const defense = attacker.armour.getDefense();
        const calculatedDamage = Math.floor(damage / 2 - defense * 5);
        if (calculatedDamage < 1) return;

        const hitInfo = new Hit(Modules.Hits.Damage, calculatedDamage).getData();
        this.hit(this.character, attacker, hitInfo, true);
    }
}

export default Cactus;
