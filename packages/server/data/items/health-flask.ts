import Player from '../../src/game/entity/character/player/player';
import Items from '../../src/util/items';

class HealthFlask {
    id: number;
    healAmount: number;
    manaAmount: number;

    constructor(id: number) {
        this.id = id;
        this.healAmount = 0;
        this.manaAmount = 0;

        const customData = Items.getCustomData(this.id);
        if (customData) {
            this.healAmount = customData.healAmount ? customData.healAmount : 0;
            this.manaAmount = customData.manaAmount ? customData.manaAmount : 0;
        }
    }

    onUse(character: Player): void {
        if (this.healAmount) character.healHitPoints(this.healAmount);
        if (this.manaAmount) character.healManaPoints(this.manaAmount);
    }
}

export default HealthFlask;
