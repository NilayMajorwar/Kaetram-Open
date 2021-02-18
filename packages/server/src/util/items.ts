import log from '../util/log';

export default {
    Data: {},
    Ids: {},
    onCreate: {},
    Plugins: {},

    getData(name: string) {
        if (name in this.Data) return this.Data[name];
        return 'null';
    },

    hasPlugin(id: number) {
        return id in this.Plugins;
    },

    getPlugin(id: number) {
        if (this.hasPlugin(id)) return this.Plugins[id];
        return null;
    },

    idToString(id: number) {
        if (id in this.Ids) return this.Ids[id].key;
        return 'null';
    },

    idToName(id: number) {
        if (id in this.Ids) return this.Ids[id].name;
        return 'null';
    },

    stringToId(name: string) {
        if (name in this.Data) return this.Data[name].id;
        else log.error('Item: ' + name + ' not found in the database.');
        return 'null';
    },

    /**
     * Returns the level required to use the item with given name
     */
    getLevelRequirement(name: string): number {
        if (!name) return 0;

        const item = this.Data[name];
        if (item && item.requirement) return item.requirement;

        let level = 0;
        if (this.isWeapon(name)) level = this.Data[name].attack;
        else if (this.isArmour(name)) level = this.Data[name].defense;
        else if (this.isPendant(name)) level = this.Data[name].pendantLevel;
        else if (this.isRing(name)) level = this.Data[name].ringLevel;
        else if (this.isBoots(name)) level = this.Data[name].bootsLevel;
        return level * 2;
    },

    /**
     * Get weapon's lumberjacking level, ie the applicable tool level used
     * if the weapon is used for lumberjacking.
     */
    getLumberjackingLevel(weaponName: string): number {
        return this.isWeapon(weaponName) ? this.Data[weaponName].lumberjacking : -1;
    },

    /**
     * Get weapon's mining level, ie the applicable tool level used
     * if the weapon is used for mining.
     */
    getMiningLevel(weaponName: string): number {
        return this.isWeapon(weaponName) ? this.Data[weaponName].mining : -1;
    },

    /**
     * Get weapon's battle level, ie the applicable level used
     * if the weapon is used for battle.
     */
    getWeaponLevel(weaponName: string): number {
        return this.isWeapon(weaponName) ? this.Data[weaponName].attack : -1;
    },

    /**
     * Get weapon's armor level, ie the applicable level used
     * if the weapon is used as armor.
     */
    getArmourLevel(armourName: string): number {
        return this.isWeapon(armourName) ? this.Data[armourName].defense : -1;
    },

    getPendantLevel(pendantName: string): number {
        return this.isPendant(pendantName) ? this.Data[pendantName].pendantLevel : -1;
    },

    getRingLevel(ringName: string): number {
        return this.isRing(ringName) ? this.Data[ringName].ringLevel : -1;
    },

    getBootsLevel(bootsName: string): number {
        return this.isBoots(bootsName) ? this.Data[bootsName].bootsLevel : -1;
    },

    isArcherWeapon(itemName: string): boolean {
        return itemName in this.Data ? this.Data[itemName].type === 'weaponarcher' : false;
    },

    isWeapon(itemName: string): boolean {
        if (itemName in this.Data) {
            const itemType = this.Data[itemName].type;
            return itemType === 'weapon' || itemType === 'weaponarcher';
        }
        return false;
    },

    isArmour(itemName: string): boolean {
        if (itemName in this.Data) {
            const itemType = this.Data[itemName].type;
            return itemType === 'armor' || itemType === 'armorarcher';
        }
        return false;
    },

    isPendant(itemName: string): boolean {
        if (itemName in this.Data) return this.Data[itemName].type === 'pendant';
        return false;
    },

    isRing(itemName: string): boolean {
        if (itemName in this.Data) return this.Data[itemName].type === 'ring';
        return false;
    },

    isBoots(itemName: string): boolean {
        if (itemName in this.Data) return this.Data[itemName].type === 'boots';
        return false;
    },

    getType(id: number) {
        if (id in this.Ids) return this.Ids[id].type;
        return null;
    },

    isStackable(id: number) {
        if (id in this.Ids) return this.Ids[id].stackable;
        return false;
    },

    isEdible(id: number) {
        if (id in this.Ids) return this.Ids[id].edible;
        return false;
    },

    getCustomData(id: number) {
        if (id in this.Ids) return this.Ids[id].customData;
        return null;
    },

    maxStackSize(id: number) {
        if (id in this.Ids) return this.Ids[id].maxStackSize;
        return false;
    },

    isShard(id: number): boolean {
        return id === 253 || id === 254 || id === 255 || id === 256 || id === 257;
    },

    isEnchantable(id: number): boolean {
        return this.getType(id) !== 'object' && this.getType(id) !== 'craft';
    },

    getShardTier(id: number): number {
        if (id === 253) return 1;
        else if (id === 254) return 2;
        else if (id === 255) return 3;
        else if (id === 256) return 4;
        else if (id === 257) return 5;
    },

    isEquippable(string: string): boolean {
        return (
            this.isArmour(string) ||
            this.isWeapon(string) ||
            this.isPendant(string) ||
            this.isRing(string) ||
            this.isBoots(string)
        );
    },

    healsHealth(id: number): boolean {
        if (id in this.Ids) return this.Ids[id].healsHealth > 0;
        return false;
    },

    getMovementSpeed(string: string) {
        if (string in this.Data) return this.Data[string].movementSpeed;
        return null;
    },

    healsMana(id: number): boolean {
        if (id in this.Ids) return this.Ids[id].healsMana > 0;
    },

    getHealingFactor(id: number): number {
        if (id in this.Ids) return this.Ids[id].healsHealth;
        return 0;
    },

    getManaFactor(id: number): number {
        if (id in this.Ids) return this.Ids[id].healsMana;
        return 0;
    },
};
