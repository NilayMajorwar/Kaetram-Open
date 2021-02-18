import Introduction from '../game/entity/character/player/quests/impl/introduction';
import BulkySituation from '../game/entity/character/player/quests/impl/bulkysituation';
import Achievement, { AchievementInfo } from '../game/entity/character/player/achievement';
import Player from '../game/entity/character/player/player';
import Quest, { QuestInfo } from '../game/entity/character/player/quests/quest';
import NPC from '../game/entity/npc/npc';
import Mob from '../game/entity/character/mob/mob';

import QuestData from '../../data/quests.json';
import AchievementData from '../../data/achievements.json';

class Quests {
    public player: Player;

    public quests: { [key: string]: Quest };
    public achievements: { [key: string]: Achievement };

    questsReadyCallback: () => void;
    achievementsReadyCallback: () => void;

    constructor(player: Player) {
        this.player = player;

        this.quests = {};
        this.achievements = {};

        this.load();
    }

    load(): void {
        let questCount = 0;

        Object.values(QuestData).forEach((quest) => {
            if (questCount === 0) this.quests[quest.id] = new Introduction(this.player, quest);
            else if (questCount === 1)
                this.quests[quest.id] = new BulkySituation(this.player, quest);
            questCount++;
        });

        Object.values(AchievementData).forEach((a) => {
            this.achievements[a.id] = new Achievement(a.id, this.player);
        });
    }

    updateQuests(ids: string[], stages: number[]): void {
        if (!ids || !stages) {
            Object.values(this.quests).forEach((q) => q.load(0));
            return;
        }

        for (let id = 0; id < ids.length; id++)
            if (!isNaN(parseInt(ids[id])) && this.quests[id]) this.quests[id].load(stages[id]);
        if (this.questsReadyCallback) this.questsReadyCallback();
    }

    updateAchievements(ids: string[], progress: number[]): void {
        for (let id = 0; id < ids.length; id++)
            if (!isNaN(parseInt(ids[id])) && this.achievements[id])
                this.achievements[id].setProgress(progress[id], true);
        if (this.achievementsReadyCallback) this.achievementsReadyCallback();
    }

    getQuest(id: number): Quest | null {
        if (id in this.quests) return this.quests[id];
        return null;
    }

    getAchievement(id: number): Achievement | null {
        if (!this.achievements || !this.achievements[id]) return null;
        return this.achievements[id];
    }

    getQuests(): { username: string; ids: string; stages: string } {
        let ids = '';
        let stages = '';

        for (let id = 0; id < this.getQuestSize(); id++) {
            ids += id + ' ';
            stages += this.quests[id].stage + ' ';
        }

        return {
            username: this.player.username,
            ids: ids,
            stages: stages,
        };
    }

    getAchievements(): { username: string; ids: string; progress: string } {
        let ids = '';
        let progress = '';

        for (let id = 0; id < this.getAchievementSize(); id++) {
            ids += id + ' ';
            progress += this.achievements[id].progress + ' ';
        }

        return {
            username: this.player.username,
            ids: ids,
            progress: progress,
        };
    }

    getAchievementData(): { achievements: AchievementInfo[] } {
        const achievements = Object.values(this.achievements).map((a) => a.getInfo());
        return { achievements };
    }

    getQuestData(): { quests: QuestInfo[] } {
        const quests = Object.values(this.quests).map((q) => q.getInfo());
        return { quests };
    }

    forEachQuest(callback: (q: Quest) => void): void {
        Object.values(this.quests).forEach((q) => callback(q));
    }

    forEachAchievement(callback: (a: Achievement) => void): void {
        Object.values(this.achievements).forEach((a) => callback(a));
    }

    getQuestsCompleted(): number {
        return Object.values(this.quests).filter((q) => q.isFinished()).length;
    }

    getAchievementsCompleted(): number {
        return Object.values(this.achievements).filter((a) => a.isFinished()).length;
    }

    getQuestSize(): number {
        return Object.keys(this.quests).length;
    }

    getAchievementSize(): number {
        return Object.keys(this.achievements).length;
    }

    getQuestByNPC(npc: NPC): Quest | null {
        /**
         * Iterate through the quest list in the order it has been
         * added so that NPC's that are required by multiple quests
         * follow the proper order.
         */
        const quest = Object.values(this.quests).find((q) => q.hasNPC(npc.id));
        return quest || null;
    }

    getAchievementByNPC(npc: NPC): Achievement | null {
        const ach = Object.values(this.achievements).find(
            (a) => a.data.npc === npc.id && !a.isFinished(),
        );
        return ach || null;
    }

    getAchievementByMob(mob: Mob): Achievement | null {
        const ach = Object.values(this.achievements).find((a) => a.data.mob === mob.id);
        return ach || null;
    }

    isQuestMob(mob: Mob): boolean {
        if (mob.type !== 'mob') return false;

        for (const id in this.quests) {
            const quest = this.quests[id];
            if (!quest.isFinished() && quest.hasMob(mob)) return true;
        }

        return false;
    }

    isAchievementMob(mob: Mob): boolean {
        if (mob.type !== 'mob') return false;
        const ach = Object.values(this.achievements).find(
            (a) => a.data.mob === mob.id && !a.isFinished(),
        );
        return !!ach;
    }

    isQuestNPC(npc: NPC): boolean {
        if (npc.type !== 'npc') return false;
        const quest = Object.values(this.quests).find((q) => !q.isFinished() && q.hasNPC(npc.id));
        return !!quest;
    }

    isAchievementNPC(npc: NPC): boolean {
        if (npc.type !== 'npc') return false;
        const ach = Object.values(this.achievements).find(
            (a) => a.data.npc === npc.id && !a.isFinished(),
        );
        return !!ach;
    }

    onAchievementsReady(callback: () => void): void {
        this.achievementsReadyCallback = callback;
    }

    onQuestsReady(callback: () => void): void {
        this.questsReadyCallback = callback;
    }
}

export default Quests;
