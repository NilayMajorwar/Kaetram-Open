import spriteData from '../../data/sprites.json';
import Animation from '../entity/animation';
import Sprite, { SpriteData } from '../entity/sprite';
import log from '../lib/log';
import Renderer from '../renderer/renderer';

export default class SpritesController {
    renderer: Renderer;
    sprites: { [id: string]: Sprite };
    sparksAnimation: Animation;

    constructor(renderer: Renderer) {
        this.renderer = renderer;
        this.sprites = {};
        this.sparksAnimation = null;
        this.load(spriteData);
        this.loadAnimations();
    }

    load(spriteData: SpriteData[]): void {
        spriteData.forEach((sprite) => (this.sprites[sprite.id] = new Sprite(sprite)));
        if (this.renderer.game.isDebug()) log.info('Finished loading sprite data...');
    }

    loadAnimations(): void {
        this.sparksAnimation = new Animation('idle_down', 6, 0, 16, 16);
        this.sparksAnimation.setSpeed(120);
    }

    updateSprites(): void {
        Object.values(this.sprites).forEach((sprite) => sprite.update());
        if (this.renderer.game.isDebug()) log.info('Sprites updated upon scaling.');
    }
}
