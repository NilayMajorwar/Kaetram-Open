import Entity, { EntityState } from '../entity';
import Modules from '../../../util/modules';
import Mobs from '../../../util/mobs';
import Combat from './combat/combat';
import log from '../../../util/log';
import Hit, { HitData } from './combat/hit';

export interface CharacterState extends EntityState {
    movementSpeed: number;
}

class Character extends Entity {
    public level: number;
    public movementSpeed: number;
    public attackRange: number;
    public attackRate: number;
    public healingRate: number;

    public spawnDistance: number;

    public previousX: number;
    public previousY: number;

    public hitPoints: any;
    public maxHitPoints: number;

    public poison: string;
    public aggressive: boolean;
    public aggroRange: number;

    public target: any; // TODO
    public potentialTarget: any; // TODO

    stunTimeout: NodeJS.Timeout | null;

    public projectile: any;
    public projectileName: string;

    healingInterval: NodeJS.Timeout | null;
    updated: boolean;

    public weaponLevel: number;
    public armourLevel: number;
    public stunned: boolean;

    stunCallback: (stun: boolean) => void;
    hitCallback: (attacker: Character, damage?: number) => void;
    damagedCallback: (damage: number, attacker?: Character) => void;
    movementCallback: (x: number, y: number) => void;
    targetCallback: (target: any) => void;
    hitPointsCallback: () => void;
    poisonCallback: (poison: string) => void;
    removeTargetCallback: () => void;
    healthChangeCallback: () => void;
    damageCallback: (target: Character, hitInfo: HitData) => void;
    subAoECallback: (radius: number, hasTerror: boolean) => void;
    deathCallback: () => void;
    returnCallback: () => void;

    moving: boolean;
    lastMovement: number;

    pvp: boolean;

    spawnLocation: any;

    frozen: boolean;

    alwaysAggressive: boolean;

    public invincible: boolean;
    public lastAttacker: Character;

    public pendant: any;
    public ring: any;
    public boots: any;

    constructor(id: number, type: string, instance: string, x: number, y: number) {
        super(id, type, instance, x, y);

        this.level = -1;

        this.movementSpeed = 250;
        this.attackRange = 1;
        this.attackRate = 1000;
        this.healingRate = 10000;

        this.spawnDistance = 7;

        this.previousX = -1;
        this.previousY = -1;

        this.hitPoints = -1;
        this.maxHitPoints = -1;

        /* States */
        this.dead = false;
        this.poison = null;
        this.aggressive = false;
        this.aggroRange = 2;

        this.target = null;
        this.potentialTarget = null;

        this.stunTimeout = null;

        this.projectile = Modules.Projectiles.Arrow;
        this.projectileName = 'projectile-pinearrow';

        this.healingInterval = null;

        this.loadCombat();
        this.startHealing();
    }

    loadCombat(): void {
        this.combat = Mobs.hasCombatPlugin(this.id)
            ? new (Mobs.isNewCombatPlugin(this.id))(this)
            : new Combat(this);
    }

    setMinibossData(): void {
        /* We only update the mob data once to prevent any issues. */

        if (this.updated) return;

        this.level += Math.floor(this.level / 2);
        this.maxHitPoints += Math.floor(this.maxHitPoints / 2);
        this.hitPoints = this.maxHitPoints;
        this.weaponLevel += 4;
        this.armourLevel += 3;

        this.updated = true;
    }

    startHealing(): void {
        this.healingInterval = setInterval(() => {
            if (this.dead) return;
            if (this.combat.started) return;
            if (this.poison) return;
            this.heal(1);
        }, this.healingRate);
    }

    stopHealing(): void {
        clearInterval(this.healingInterval);
        this.healingInterval = null;
    }

    setStun(stun: boolean): void {
        this.stunned = stun;
        if (this.stunCallback) this.stunCallback(stun);
    }

    hit(attacker: Character, damage?: number): void {
        if (this.hitCallback) this.hitCallback(attacker, damage);
    }

    heal(amount: number): void {
        this.setHitPoints(this.hitPoints + amount);
        if (this.hitPoints >= this.maxHitPoints) this.hitPoints = this.maxHitPoints;
    }

    isRanged(): boolean {
        return this.attackRange > 1;
    }

    applyDamage(damage: number, attacker?: Character): void {
        this.hitPoints -= damage;
        if (this.damagedCallback) this.damagedCallback(damage, attacker);
    }

    isDead(): boolean {
        return this.hitPoints < 1 || this.dead;
    }

    getCombat(): Combat {
        return this.combat;
    }

    getHitPoints(): number {
        return this.hitPoints;
    }

    getMaxHitPoints(): number {
        return this.maxHitPoints;
    }

    setPosition(x: number, y: number): void {
        this.previousX = this.x;
        this.previousY = this.y;
        super.setPosition(x, y);

        if (this.movementCallback) this.movementCallback(x, y);
    }

    setTarget(target: any): void {
        this.target = target;
        if (this.targetCallback) this.targetCallback(target);
    }

    setPotentialTarget(potentialTarget: any): void {
        this.potentialTarget = potentialTarget;
    }

    setHitPoints(hitPoints: number): void {
        this.hitPoints = hitPoints;
        if (this.hitPointsCallback) this.hitPointsCallback();
    }

    setPoison(poison: string): void {
        this.poison = poison;
        if (this.poisonCallback) this.poisonCallback(poison);
    }

    getProjectile() {
        return this.projectile;
    }

    getProjectileName(): string {
        return this.projectileName;
    }

    getDrop() {
        return null;
    }

    getWeaponLevel(): number {
        return this.weaponLevel;
    }

    getArmourLevel(): number {
        return this.armourLevel;
    }

    getState(): CharacterState {
        const state = super.getState() as CharacterState;
        state.movementSpeed = this.movementSpeed;
        return state;
    }

    hasMaxHitPoints(): boolean {
        return this.hitPoints >= this.maxHitPoints;
    }

    /* Uninitialized Functions */

    hasBreakableWeapon(): boolean {
        return false;
    }

    breakWeapon(): void {}

    return(): void {}

    destroy(): void {}

    die(): void {}

    getHit(target?: Character): Hit {
        // @ts-ignore Unimplemented
        return `uninitialized ${target.instance}`;
    }

    finishAchievement(id: number): void {
        // @ts-ignore Unimplemented
        return `uninitialized achievementId: ${id}`;
    }

    addExperience(exp: number): void {
        log.debug(`Unimplemented \`addExperience\` ${exp}`);
    }

    canAggro(character: Character): boolean {
        log.debug(`Can ${this.instance} aggro ${character.instance}`);
        return false;
    }

    killCharacter(character: Character): void {
        log.debug(`Uninitialized \`killCharacter\` for ${character.instance}.`);
    }

    /*********************/

    removeTarget(): void {
        if (this.removeTargetCallback) this.removeTargetCallback();
        this.clearTarget();
    }

    hasTarget(): boolean {
        return !(this.target === null);
    }

    hasPotentialTarget(potentialTarget: any): boolean {
        return this.potentialTarget === potentialTarget;
    }

    clearTarget(): void {
        this.target = null;
    }

    onTarget(callback: (target: any) => void): void {
        this.targetCallback = callback;
    }

    onRemoveTarget(callback: () => void): void {
        this.removeTargetCallback = callback;
    }

    onMovement(callback: (x: number, y: number) => void): void {
        this.movementCallback = callback;
    }

    onHit(callback: (attacker: Entity, damage?: number) => void): void {
        this.hitCallback = callback;
    }

    onHealthChange(callback: () => void): void {
        this.healthChangeCallback = callback;
    }

    onDamage(callback: (target: Character, hitInfo: HitData) => void): void {
        this.damageCallback = callback;
    }

    onDamaged(callback: (damage: number, attacker?: Character) => void): void {
        this.damagedCallback = callback;
    }

    onStunned(callback: (stun: boolean) => void): void {
        this.stunCallback = callback;
    }

    onSubAoE(callback: (radius: number, hasTerror: boolean) => void): void {
        this.subAoECallback = callback;
    }

    onPoison(callback: (poison: string) => void): void {
        this.poisonCallback = callback;
    }

    onDeath(callback: () => void): void {
        this.deathCallback = callback;
    }
}

export default Character;
