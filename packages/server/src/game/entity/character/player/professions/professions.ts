import _ from 'lodash';
import Modules from '../../../../../util/modules';
import Player from '../player';
import World from '../../../../world';
import Profession from './impl/profession';
import professions from './impl';
import log from '../../../../../util/log';

class Professions {
    player: Player;
    world: World;

    professions: { [key: number]: Profession };

    constructor(player: Player) {
        this.player = player;
        this.world = player.world;

        this.professions = {};

        this.load();
    }

    load(): void {
        const pList = Object.keys(Modules.Professions); // professions enum list

        /**
         * We are accessing all the professions in the Modules.Professions
         * enum. We use the key to generate the profession class instance.
         */

        _.each(pList, (profession) => {
            try {
                const ProfessionClass = professions[profession.toLowerCase()];
                const id = Modules.Professions[profession];

                this.professions[id] = new ProfessionClass(id, this.player);
            } catch (error) {
                log.debug(`Could not load ${profession} profession.`);
                log.error(error);
            }
        });
    }

    update(info: any): void {
        _.each(info, (data, id) => {
            if (!(id in this.professions)) return;
            this.professions[id].load(data);
        });
    }

    getProfession(id: number): Profession {
        if (!(id in this.professions)) return null;
        return this.professions[id];
    }

    stopAll(): void {
        this.forEachProfession((profession: Profession) => {
            profession.stop();
        });
    }

    forEachProfession(callback: (profession: Profession) => void): void {
        _.each(this.professions, (profession) => {
            callback(profession);
        });
    }

    /**
     * This is the data we send to the client in order
     * to load the professions profile tab.
     */

    getInfo() {
        return Object.values(this.professions).map((profession) => ({
            id: profession.id,
            name: profession.name,
            level: profession.level,
            percentage: profession.getPercentage(),
        }));
    }

    getArray() {
        const data = {};

        _.each(this.professions, (profession) => {
            data[profession.id] = profession.getData();
        });

        return {
            username: this.player.username,
            data: data,
        };
    }
}

export default Professions;
