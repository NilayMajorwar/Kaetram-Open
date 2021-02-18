import Messages from '../../../../../network/messages';
import Packets from '../../../../../network/packets';
import Utils from '../../../../../util/utils';
import Player from '../player';
import NPC from '../../../npc/npc';
import Mob from '../../mob/mob';

export type QuestInfo = {
    id: number;
    name: string;
    description: string;
    stage: number;
    finished: boolean;
};

class Quest {
    public player: Player;
    public data: any;

    public id: number;
    public name: string;
    public description: string;

    public stage: number;

    npcTalkCallback: (npc: NPC) => void;

    constructor(player: Player, data: any) {
        this.player = player;
        this.data = data;

        this.id = data.id;
        this.name = data.name;
        this.description = data.description;

        this.stage = 0;
    }

    load(stage: number): void {
        if (!stage) this.update();
        else this.stage = stage;
    }

    finish(): void {
        const item = this.getItemReward();

        if (item) {
            if (this.hasInventorySpace(item.id, item.count))
                this.player.inventory.add({
                    id: item.id,
                    count: item.count,
                    ability: -1,
                    abilityLevel: -1,
                });
            else {
                this.player.notify('You do not have enough space in your inventory.');
                this.player.notify('Please make room prior to finishing the quest.');

                return;
            }
        }

        this.setStage(9999);

        this.player.send(
            new Messages.Quest(Packets.QuestOpcode.Finish, {
                id: this.id,
                isQuest: true,
            }),
        );

        this.update();
    }

    setStage(stage: number): void {
        this.stage = stage;
        this.update();
    }

    triggerTalk(npc: NPC): void {
        if (this.npcTalkCallback) this.npcTalkCallback(npc);
    }

    update(): void {
        this.player.save();
    }

    getConversation(id: number) {
        const conversation = this.data.conversations[id];
        if (!conversation || !conversation[this.stage]) return [''];
        return conversation[this.stage];
    }

    updatePointers() {
        if (!this.data.pointers) return;
        const pointer = this.data.pointers[this.stage];
        if (!pointer) return;
        const opcode = pointer[0];

        if (opcode === 4)
            this.player.send(
                new Messages.Pointer(opcode, {
                    id: Utils.generateRandomId(),
                    button: pointer[1],
                }),
            );
        else
            this.player.send(
                new Messages.Pointer(opcode, {
                    id: Utils.generateRandomId(),
                    x: pointer[1],
                    y: pointer[2],
                }),
            );
    }

    forceTalk(npc: NPC, message: string): void {
        if (!npc) return;

        this.player.talkIndex = 0;
        this.player.send(
            new Messages.NPC(Packets.NPCOpcode.Talk, {
                id: npc.instance,
                text: message,
            }),
        );
    }

    /**
     * Resets the player's talk index for the next dialogue to take place.
     */
    resetTalkIndex(): void {
        this.player.talkIndex = 0;
    }

    clearPointers(): void {
        this.player.send(new Messages.Pointer(Packets.PointerOpcode.Remove, {}));
    }

    onNPCTalk(callback: (npc: NPC) => void): void {
        this.npcTalkCallback = callback;
    }

    hasMob(mob: Mob): boolean {
        if (!this.data.mobs) return;
        return this.data.mobs.includes(mob.id);
    }

    hasNPC(id: number): boolean {
        return this.data.npcs.includes(id);
    }

    hasItemReward(): boolean {
        return !!this.data.itemReward;
    }

    hasInventorySpace(id: number, count: number): boolean {
        return this.player.inventory.canHold(id, count);
    }

    hasDoorUnlocked(door: any): boolean {
        return this.stage > 9998;
    }

    isFinished(): boolean {
        return this.stage > 9998;
    }

    getId(): number {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    getTask() {
        return this.data.task[this.stage];
    }

    getItem() {
        return this.data.itemReq ? this.data.itemReq[this.stage] : null;
    }

    getStage(): number {
        return this.stage;
    }

    getItemReward() {
        return this.hasItemReward() ? this.data.itemReward : null;
    }

    getDescription(): string {
        return this.description;
    }

    getInfo(): QuestInfo {
        return {
            id: this.getId(),
            name: this.getName(),
            description: this.getDescription(),
            stage: this.getStage(),
            finished: this.isFinished(),
        };
    }
}

export default Quest;
