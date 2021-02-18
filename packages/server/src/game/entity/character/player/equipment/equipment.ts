import Items from '../../../../../util/items';

export type EquipmentData = {
    type: number;
    name: string;
    string: string;
    count: number;
    ability: number;
    abilityLevel: number;
    power: number;
};

export type EquipmentItemData = {
    id: number;
    name: string;
    count: number;
    ability: number;
    abilityLevel: number;
    string: string;
};

class Equipment {
    public name: string;
    public id: number;
    public count: number;
    public ability: number;
    public abilityLevel: number;

    constructor(name: string, id: number, count: number, ability: number, abilityLevel: number) {
        this.id = id;
        this.name = name;
        this.count = count ? count : 0;
        this.ability = !isNaN(ability) ? ability : -1;
        this.abilityLevel = !isNaN(abilityLevel) ? abilityLevel : -1;
    }

    getName(): string {
        return this.name;
    }

    getId(): number {
        return this.id;
    }

    getCount(): number {
        return this.count;
    }

    getAbility(): number {
        return this.ability;
    }

    getAbilityLevel(): number {
        return this.abilityLevel;
    }

    getBaseAmplifier(): number {
        return 1;
    }

    getType(): number {
        return -1;
    }

    getData(): EquipmentData {
        return {
            type: this.getType(),
            name: Items.idToName(this.id),
            string: Items.idToString(this.id),
            count: this.count,
            ability: this.ability,
            abilityLevel: this.abilityLevel,
            power: Items.getLevelRequirement(this.name),
        };
    }

    getString(): string {
        return Items.idToString(this.id);
    }

    getItem(): EquipmentItemData {
        return {
            id: this.id,
            name: this.name,
            count: this.count,
            ability: this.ability,
            abilityLevel: this.abilityLevel,
            string: Items.idToString(this.id),
        };
    }
}

export default Equipment;
