import _ from 'lodash';
import Messages from '../network/messages';
import Packets from '../network/packets';
import World from '../game/world';
import Player from '../game/entity/character/player/player';
import log from '../util/log';
import Achievement from '../game/entity/character/player/achievement';

class Commands {
    player: Player;
    world: World;

    constructor(player: Player) {
        this.player = player;
        this.world = player.world;
    }

    parse(rawText: string) {
        const blocks = rawText.slice(1).split(' ');
        if (blocks.length === 0) return;
        const command = blocks.shift();

        this.handlePlayerCommands(command, blocks);
        if (this.player.rights > 0) this.handleModeratorCommands(command, blocks);
        if (this.player.rights > 1) this.handleAdminCommands(command, blocks);
    }

    handlePlayerCommands(command: string, blocks: Array<string>) {
        switch (command) {
            case 'players': {
                const population = this.world.getPopulation();
                const singular = population === 1;

                if (this.player.rights > 1)
                    _.each(this.world.players, (player) => {
                        this.player.notify(player.username);
                    });

                this.player.notify(
                    `There ${singular ? 'is' : 'are'} currently ${population} ${
                        singular ? 'person' : 'people'
                    } online.`,
                );

                return;
            }

            case 'tutstage':
                log.info(this.player.getTutorial().stage.toString());
                return;

            case 'coords':
                this.player.send(
                    new Messages.Notification(Packets.NotificationOpcode.Text, {
                        message: 'x: ' + this.player.x + ' y: ' + this.player.y,
                    }),
                );
                return;

            case 'progress': {
                const tutorialQuest = this.player.getTutorial();

                this.player.send(
                    new Messages.Quest(Packets.QuestOpcode.Progress, {
                        id: tutorialQuest.id,
                        stage: tutorialQuest.stage,
                    }),
                );
                return;
            }

            case 'global':
                this.world.globalMessage(
                    this.player.username,
                    blocks.join(' '),
                    'rgba(191, 191, 63, 1.0)',
                    true,
                    false,
                );
                return;

            case 'region':
                log.info(this.player.region);
                return;

            case 'getintroduction':
                log.info(this.player.quests.getQuest(0).getStage().toString());
                return;

            case 'resetintro': {
                const introduction = this.player.quests.getQuest(0);

                introduction.setStage(0);
                introduction.clearPointers();
                introduction.update();
                introduction.updatePointers();

                this.player.updateRegion();
                this.player.save();

                return;
            }

            case 'pm':
            case 'msg': {
                const otherPlayer = blocks.shift();
                const message = blocks.join(' ');

                this.player.sendMessage(otherPlayer, message);
                return;
            }

            case 'ping':
                this.player.pingTime = Date.now();
                this.player.send(new Messages.Network(Packets.NetworkOpcode.Ping));
                break;
        }
    }

    handleModeratorCommands(command: string, blocks: Array<any>) {
        switch (command) {
            case 'mute':
            case 'ban': {
                let duration = blocks.shift();
                const targetName = blocks.join(' ');
                const user = this.world.getPlayerByName(targetName);

                if (!user) return;

                if (!duration) duration = 24;
                const timeFrame = Date.now() + duration * 60 * 60;

                if (command === 'mute') user.mute = timeFrame;
                else if (command === 'ban') {
                    user.ban = timeFrame;
                    user.save();

                    user.connection.sendUTF8('ban');
                    user.connection.close('banned');
                }

                user.save();
                return;
            }

            case 'unmute': {
                const uTargetName = blocks.join(' ');
                if (!uTargetName) return;

                const uUser = this.world.getPlayerByName(uTargetName);
                uUser.mute = Date.now() - 3600;
                uUser.save();
                return;
            }
        }
    }

    handleAdminCommands(command: string, blocks: Array<string>) {
        let username: string, player: Player;

        switch (command) {
            case 'spawn': {
                const spawnId = parseInt(blocks.shift());
                const count = parseInt(blocks.shift());
                const ability = parseInt(blocks.shift());
                const abilityLevel = parseInt(blocks.shift());

                if (!spawnId || !count) return;

                this.player.inventory.add({
                    id: spawnId,
                    count: count,
                    ability: ability ? ability : -1,
                    abilityLevel: abilityLevel ? abilityLevel : -1,
                });

                return;
            }
            case 'maxhealth':
                this.player.notify('Max health is ' + this.player.hitPoints.getMaxHitPoints());
                return;

            case 'ipban':
                return;

            case 'drop': {
                const id = parseInt(blocks.shift());
                let dCount = parseInt(blocks.shift());

                if (!id) return;
                if (!dCount) dCount = 1;

                this.world.dropItem(id, dCount, this.player.x, this.player.y);
                return;
            }

            case 'ghost':
                this.player.equip('ghost', 1, -1, -1);
                return;

            case 'notify':
                this.player.notify('Hello!!!');
                return;

            case 'teleport': {
                const x = parseInt(blocks.shift());
                const y = parseInt(blocks.shift());
                const withAnimation = parseInt(blocks.shift());

                if (x && y) this.player.teleport(x, y, false, !!withAnimation);
                return;
            }

            case 'teletome':
                username = blocks.join(' ');
                player = this.world.getPlayerByName(username);
                if (player) player.teleport(this.player.x, this.player.y);
                return;

            case 'teleto':
                username = blocks.join(' ');
                player = this.world.getPlayerByName(username);
                if (player) this.player.teleport(player.x, player.y);
                return;

            case 'nohit':
                log.info('invincinil');
                this.player.invincible = !this.player.invincible;
                return;

            case 'mob': {
                const npcId = parseInt(blocks.shift());
                this.world.spawnMob(npcId, this.player.x, this.player.y);
                return;
            }

            case 'pointer':
                if (blocks.length > 1) {
                    const posX = parseInt(blocks.shift());
                    const posY = parseInt(blocks.shift());

                    if (!posX || !posY) return;

                    this.player.send(
                        new Messages.Pointer(Packets.PointerOpcode.Location, {
                            id: this.player.instance,
                            x: posX,
                            y: posY,
                        }),
                    );
                } else {
                    const instance = blocks.shift();
                    if (!instance) return;
                    this.player.send(
                        new Messages.Pointer(Packets.PointerOpcode.NPC, {
                            id: instance,
                        }),
                    );
                }

                return;

            case 'teleall':
                _.each(this.world.players, (player) => {
                    player.teleport(this.player.x, this.player.y);
                });
                return;

            case 'attackaoe': {
                let radius = parseInt(blocks.shift());
                if (!radius) radius = 1;
                this.player.combat.dealAoE(radius);
                return;
            }

            case 'addexp': {
                const exp = parseInt(blocks.shift());
                if (!exp) return;
                this.player.addExperience(exp);
                return;
            }

            case 'region': {
                const tileX = parseInt(blocks.shift());
                const tileY = parseInt(blocks.shift());
                if (!tileX || !tileY) return;

                const tileInfo = parseInt(blocks.shift());
                const tileIndex = this.world.region.gridPositionToIndex(tileX - 1, tileY);

                log.info('Sending Tile: ' + tileIndex);

                this.world.push(Packets.PushOpcode.Player, {
                    player: this.player,
                    message: new Messages.Region(Packets.RegionOpcode.Modify, {
                        index: tileIndex,
                        data: tileInfo,
                    }),
                });
                return;
            }

            case 'instance':
                this.world.region.createInstance(this.player, this.player.region);
                return;

            case 'checkregion':
                this.player.notify('Current Region: ' + this.player.region);
                return;

            case 'deinstance':
                this.world.region.deleteInstance(this.player);
                return;

            case 'debug':
                this.player.send(
                    new Messages.Command({
                        command: 'debug',
                    }),
                );
                return;

            case 'addexperience':
                this.player.addExperience(parseInt(blocks.shift()));
                return;

            case 'attackrange':
                log.info(this.player.attackRange.toString());
                return;

            case 'resetregions':
                log.info('Resetting regions...');

                this.player.regionsLoaded = [];
                this.player.updateRegion();

                return;

            case 'finishQuest':
                this.player.quests.getQuest(1).finish();

                break;

            case 'finishAchievement':
                this.player.quests.getAchievement(0).finish();

                break;

            case 'finishAllAchievements':
                this.player.quests.forEachAchievement((achievement: Achievement) => {
                    this.player.finishAchievement(achievement.id);
                });

                break;

            case 'resetAchievement': {
                const achievementId = parseInt(blocks.shift());
                if (!achievementId) {
                    this.player.notify('Invalid command format. /resetAchievement <achievementId>');
                    return;
                }

                this.player.quests.getAchievement(achievementId).setProgress(0);
                this.player.updateRegion();
                break;
            }

            case 'resetAchievements':
                this.player.quests.forEachAchievement((achievement: Achievement) => {
                    achievement.setProgress(0);
                });

                this.player.updateRegion();
                break;

            case 'clear':
                this.player.inventory.forEachSlot((slot) => {
                    if (slot.id !== -1) this.player.inventory.remove(slot.id, slot.count);
                });
                break;

            case 'timeout':
                this.player.timeout();
                break;

            case 'togglepvp':
                this.world.forEachPlayer((player: Player) => {
                    player.updatePVP(true, true);
                });
                break;

            case 'die':
                this.world.handleDeath(this.player);
                break;

            case 'ms': {
                let movementSpeed = parseInt(blocks.shift());
                if (!movementSpeed) {
                    this.player.notify('No movement speed specified.');
                    return;
                }

                if (movementSpeed < 75) movementSpeed = 75;
                this.player.defaultMovementSpeed = movementSpeed;
                this.player.sync();
                break;
            }

            case 'toggleheal':
                this.player.send(
                    new Messages.Command({
                        command: 'toggleheal',
                    }),
                );
                break;

            case 'popup':
                this.player.send(
                    new Messages.Notification(Packets.NotificationOpcode.Popup, {
                        title: 'New Quest Found!',
                        message: 'New quest has been discovered!',
                        colour: '#00000',
                    }),
                );
                break;
        }
    }
}

export default Commands;
