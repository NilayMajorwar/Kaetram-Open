import Container from '../container';
import Messages from '../../../../../../network/messages';
import Packets from '../../../../../../network/packets';
import Player from '../../player';
import Slot from '../slot';

export type BankData = {
    id: number;
    count: number;
    ability: number;
    abilityLevel: number;
};

class Bank extends Container {
    public open: boolean;

    constructor(owner: Player, size: number) {
        super('Bank', owner, size);
        this.open = false;
    }

    load(
        ids: Array<number>,
        counts: Array<number>,
        abilities: Array<number>,
        abilityLevels: Array<number>,
    ): void {
        super.load(ids, counts, abilities, abilityLevels);
        this.owner.send(new Messages.Bank(Packets.BankOpcode.Batch, [this.size, this.slots]));
    }

    add(id: number, count: number, ability: number, abilityLevel: number): Slot {
        if (!this.canHold(id, count)) {
            this.owner.send(
                new Messages.Notification(Packets.NotificationOpcode.Text, {
                    message: 'You do not have enough space in your bank.',
                }),
            );
            return null;
        }

        const slot = super.add(id, count, ability, abilityLevel);
        this.owner.send(new Messages.Bank(Packets.BankOpcode.Add, slot));
        this.owner.save();
        return slot;
    }

    remove(id: number, count: number, index: number): boolean {
        if (!super.remove(index, id, count)) return false;

        this.owner.send(
            new Messages.Bank(Packets.BankOpcode.Remove, {
                index: index,
                count: count,
            }),
        );
        this.owner.save();
        return true;
    }

    /**
     * We return the slot data without the extra information.
     */

    getInfo(index: number): BankData {
        const slot = this.slots[index];
        return {
            id: slot.id,
            count: slot.count,
            ability: slot.ability,
            abilityLevel: slot.abilityLevel,
        };
    }
}

export default Bank;
