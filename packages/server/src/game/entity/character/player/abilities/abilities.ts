import Player from '../player';
import Ability from './impl/ability';

export type AbilitiesData = {
    username: string;
    abilities: string;
    abilityLevels: string;
    shortcuts: string;
};

class Abilities {
    player: Player;
    abilities: { [key: string]: Ability };
    shortcuts: Array<string>;
    shortcutSize: number;

    constructor(player: Player) {
        this.player = player;
        this.abilities = {};
        this.shortcuts = [];
        this.shortcutSize = 5;
    }

    addAbility(ability: Ability): void {
        this.abilities[ability.name] = ability;
    }

    addShortcut(ability: Ability): void {
        if (this.shortcutSize >= 5) return;
        this.shortcuts.push(ability.name);
    }

    removeAbility(ability: Ability): void {
        if (this.isShortcut(ability)) this.removeShortcut(this.shortcuts.indexOf(ability.name));
        delete this.abilities[ability.name];
    }

    removeShortcut(index: number): void {
        if (index > -1) this.shortcuts.splice(index, 1);
    }

    hasAbility(ability: Ability): boolean {
        const uAbility = Object.values(this.abilities).find((ab) => ab.name === ability.name);
        return !!uAbility;
    }

    isShortcut(ability: Ability): boolean {
        return this.shortcuts.includes(ability.name);
    }

    getArray(): AbilitiesData {
        let abilities = '';
        let abilityLevels = '';
        const shortcuts = this.shortcuts.toString();

        Object.values(this.abilities).forEach((ability) => {
            abilities += ability.name;
            abilityLevels += ability.level;
        });

        return {
            username: this.player.username,
            abilities: abilities,
            abilityLevels: abilityLevels,
            shortcuts: shortcuts,
        };
    }
}

export default Abilities;
