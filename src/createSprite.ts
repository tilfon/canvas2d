import { Sprite, ISprite } from './sprite/Sprite';
import { TextLabel, ITextLabel } from './sprite/TextLabel';
import { BMFontLabel, IBMFontLabel } from './sprite/BMFontLabel';
import { Stage, ScaleMode, Orientation } from './Stage';
import { Texture } from './Texture';
import { Action, ActionQueue, ActionRepeatMode } from './action/Action';

export interface Ref<T> {
    ref?(instance: T): any;
}
export type ActionProps = { actions?: { queue: ActionQueue; repeatMode?: ActionRepeatMode; }[] };

export type SpriteProps = ISprite & Ref<Sprite<{}>> & ActionProps;
export type TextProps = ITextLabel & Ref<TextLabel> & ActionProps;
export type BMFontProps = IBMFontLabel & Ref<BMFontLabel> & ActionProps;
export type SpriteClass<T, U> = new (attrs?: T & ISprite) => U;
export type StageProps = {
    width: number;
    height: number;
    canvas: HTMLCanvasElement;
    scaleMode: ScaleMode;
    autoAdjustCanvasSize?: boolean;
    orientation?: Orientation;
    touchEnabled?: boolean;
    mouseEnabled?: boolean;
    useExternalTimer?: boolean;
} & Ref<Stage>;

export function createSprite<T, U>(type: "sprite", props: SpriteProps, ...children: any[]): Sprite<{}>;
export function createSprite<T, U>(type: "text", props: TextProps, ...children: any[]): TextLabel;
export function createSprite<T, U>(type: "bmfont", props: BMFontProps, ...children: any[]): BMFontLabel;
export function createSprite<T, U>(type: "stage", props: StageProps, ...children: any[]): Stage;
export function createSprite<T, U>(type: SpriteClass<T, U>, props: T & SpriteProps, ...children: any[]): U;
export function createSprite<T, U>(type: any, props: any, ...children: any[]): any {
    props = props || {};

    let sprite: any;
    let { ref, actions, ...options } = props;

    if (typeof type === 'function') {
        sprite = new type(options) as Sprite<{}>;
        addChildren(sprite, children);
    }
    else {
        switch (type) {
            case "sprite":
                sprite = new Sprite(options);
                addChildren(sprite, children);
                break;
            case "text":
                sprite = createLabel<TextLabel>(type, TextLabel, options, children);
                break;
            case "bmfont":
                sprite = createLabel<BMFontLabel>(type, BMFontLabel, options, children);
                break;
            case 'stage':
                sprite = createStage(options, children);
                break;
        }
    }

    if (sprite == null) {
        console.error(`canvas2d.createSprite(): Unknown sprite type`, type);
    }
    else if (actions && actions.length) {
        for (let i = 0, detail: ActionProps['actions'][0]; detail = actions[i]; i++) {
            let instance = new Action(sprite).queue(detail.queue);
            if (detail.repeatMode != null) {
                instance.setRepeatMode(detail.repeatMode);
            }
            instance.start();
        }
    }

    if (ref) {
        ref.call(undefined, sprite);
    }

    return sprite;
}

function createLabel<T>(tag: string, ctor: any, props: any, children: any[]): T {
    let label = new ctor(props);
    if (children.length) {
        label.text = children.join('');
    }
    return label;
}

function createStage(props: StageProps, children: Sprite<{}>[]) {
    let { canvas, width, height, scaleMode, autoAdjustCanvasSize, useExternalTimer, touchEnabled, mouseEnabled, orientation } = props;
    let stage = new Stage(canvas, width, height, scaleMode, autoAdjustCanvasSize, orientation);

    stage.touchEnabled = touchEnabled;
    stage.mouseEnabled = mouseEnabled;
    stage.start(useExternalTimer);

    if (children.length) {
        for (let i = 0, l = children.length; i < l; i++) {
            let child = children[i];
            if (child) {
                stage.addChild(child);
            }
        }
    }

    return stage;
}

function addChildren(sprite: Sprite<{}>, children: any[]) {
    if (!children.length) {
        return;
    }
    for (let i = 0, l = children.length; i < l; i++) {
        let child = children[i];
        if (!child) {
            continue;
        }
        if (Array.isArray(child)) {
            addChildren(sprite, child);
        }
        else {
            sprite.addChild(child);
        }
    }
}
