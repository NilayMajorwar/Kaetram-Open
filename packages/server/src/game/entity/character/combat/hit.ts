export type HitData = {
    type: any;
    damage: number;
    isRanged: boolean;
    isAoE: boolean;
    hasTerror: boolean;
    isPoison: boolean;
};

class Hit {
    type: any;
    damage: number;

    ranged: boolean;
    aoe: boolean;
    terror: boolean;
    poison: boolean;

    constructor(type: any, damage: number) {
        this.type = type;
        this.damage = damage;

        this.ranged = false;
        this.aoe = false;
        this.terror = false;
        this.poison = false;
    }

    isRanged(): boolean {
        return this.ranged;
    }

    isAoE(): boolean {
        return this.aoe;
    }

    isPoison(): boolean {
        return this.poison;
    }

    getDamage(): number {
        return this.damage;
    }

    getData(): HitData {
        return {
            type: this.type,
            damage: this.damage,
            isRanged: this.isRanged(),
            isAoE: this.isAoE(),
            hasTerror: this.terror,
            isPoison: this.poison,
        };
    }
}

export default Hit;
