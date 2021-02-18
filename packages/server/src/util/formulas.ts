/* global */

import Utils from './utils';
import Constants from './constants';
import Trees from '../../data/professions/trees';
import Character from '../game/entity/character/character';

export default {
    LevelExp: [],

    /**
     * Returns the inverse-probability of getting logs from a tree
     */
    getTreeChance(player: any, treeId: string): number {
        const lumberjackingLevel = player.getLumberjackingLevel();
        const weaponLumberjackingLevel = player.getWeaponLumberjackingLevel();
        const treeLevel = Trees.Levels[treeId];

        let probability = treeLevel * 10 - lumberjackingLevel * weaponLumberjackingLevel;
        if (probability < 2) probability = 2;
        return probability;
    },

    /**
     * Returns a random damage amount inflicted by attacker on target
     */
    getDamage(attacker: Character, target: Character, special?: boolean): number {
        const maxDamage = this.getMaxDamage(attacker, target, special);
        const accuracy = Utils.randomInt(0, attacker.level);
        return Utils.randomInt(accuracy, maxDamage);
    },

    /**
     * Returns the maximum damage that can be inflicted by attacker on the target
     */
    getMaxDamage(attacker: Character, target: Character, special?: boolean): number {
        if (!attacker || !target) return;

        let damageAbsorbed: number;
        let damageDealt = 0;
        let damageAmplifier = 1;
        let absorptionAmplifier = 1;

        const weaponLevel = attacker.getWeaponLevel();
        const armourLevel = attacker.getArmourLevel();
        const pendant = attacker.pendant || null;
        const ring = attacker.ring || null;
        const boots = attacker.boots || null;
        const targetArmour = target.getArmourLevel();
        const targetPendant = target.pendant || null;
        const targetRing = target.ring || null;
        const targetBoots = target.boots || null;

        if (attacker.type === 'player') damageDealt += 10;

        damageDealt +=
            attacker.level +
            (attacker.level * weaponLevel) / 4 +
            (attacker.level + weaponLevel * armourLevel) / 8;

        // Apply ranged and special damage modifiers
        if (attacker.isRanged()) damageDealt /= 1.275;
        if (special) damageDealt *= 1.0575;

        // Apply attacker's special amulets
        if (pendant && pendant.pendantLevel > 0) damageAmplifier *= pendant.getBaseAmplifier();
        if (ring && ring.ringLevel > 0) damageAmplifier *= ring.getBaseAmplifier();
        if (boots && boots.bootsLevel > 0) damageAmplifier *= boots.getBaseAmplifier();

        // Avoid damage amplifiers getting out of hand
        if (damageAmplifier > 1.6) damageAmplifier = 1.6;
        damageDealt *= damageAmplifier;

        damageAbsorbed = target.level + targetArmour / 2;

        // Apply target's special amulets
        if (targetPendant) absorptionAmplifier *= targetPendant.getBaseAmplifier();
        if (targetRing) absorptionAmplifier *= targetRing.getBaseAmplifier();
        if (targetBoots) absorptionAmplifier *= targetBoots.getBaseAmplifier();
        damageAbsorbed *= absorptionAmplifier;

        // Compute final damage inflicted on target
        let damage = damageDealt - damageAbsorbed;
        damage = Math.ceil(damage);
        if (isNaN(damage) || !damage || damage < 0) damage = 0;
        return damage;
    },

    /**
     * Computes the critical hit damage done by attacker on target
     */
    getCritical(attacker: any, target: Character): number {
        if (!attacker || !target) return;

        // Critical hit damage is normal damage multiplied by weapon crit multiplier
        // TODO: Shouldn't `getMaxDamage` be used here?
        const damage = this.getDamage(attacker, target);
        const multiplier = attacker.weapon.abilityLevel / 10;

        return damage * multiplier;
    },

    /**
     * Returns whether weapon will break on attacking target
     */
    getWeaponBreak(attacker: Character, target: Character): boolean {
        if (!attacker || !target) return;
        // 25% chances of weapon breaking
        return Utils.randomRange(1, 100) > 75;
    },

    /**
     * Returns AoE damage done by attacker on target
     */
    getAoEDamage(attacker: Character, target: Character): number {
        // Preliminary setup until this function is expanded and
        // fits in the necessary algorithms
        return this.getDamage(attacker, target);
    },

    /**
     * TODO: What does this function do?
     */
    nextExp(experience: number): number {
        if (experience < 0) return -1;

        for (let i = 1; i < this.LevelExp.length; i++)
            if (experience < this.LevelExp[i]) return this.LevelExp[i];
    },

    /**
     * TODO: What does this function do?
     */
    prevExp(experience: number): number {
        if (experience < 0) return -1;

        for (let i = Constants.MAX_LEVEL; i > 0; i--)
            if (experience > this.LevelExp[i]) return this.LevelExp[i];
        return 0;
    },

    /**
     * TODO: What does this function do?
     */
    expToLevel(experience: number): number {
        if (experience < 0) return -1;

        for (let i = 1; i < this.LevelExp.length; i++) if (experience < this.LevelExp[i]) return i;
        return Constants.MAX_LEVEL;
    },

    /**
     * Returns the max health at specified `level`
     */
    getMaxHitPoints(level: number): number {
        return 100 + level * 30;
    },

    /**
     * Returns the mana capacity at specified `level`
     */
    getMaxMana(level: number): number {
        return 10 + level * 8;
    },
};
