﻿import { uid, removeArrayItem } from '../Util';
import { HTMLAudio } from './HTMLAudio';
import { WebAudio } from './WebAudio';

export class SoundManager {

    private _ext: ".mp3" | ".mp4" | ".wav" | ".ogg" = ".mp3";
    private _enabled: boolean;
    private _pausedAudios: { [id: number]: WebAudio | HTMLAudio };
    private _audioCache: { [index: string]: Array<WebAudio | HTMLAudio> } = {};
    private _supportedType = {
        mp3: false,
        mp4: false,
        wav: false,
        ogg: false
    };

    get enabled() {
        return this._enabled;
    }

    set enabled(value: boolean) {
        if (value == this._enabled) {
            return;
        }
        this._setEnabled(value);
    }

    get supportedType(): { mp3: boolean; mp4: boolean; wav: boolean; ogg: boolean; } {
        return { ...this._supportedType };
    }

    get ext() {
        return this._ext;
    }

    set ext(ext) {
        this._ext = ext;
    }

    constructor() {
        this._detectSupportedType();
    }

    getAudio(name: string): WebAudio | HTMLAudio;
    getAudio(name: string, returnAll: boolean): Array<WebAudio | HTMLAudio>;
    getAudio(name: string, returnAll?: boolean): any {
        var list = this._audioCache[name];

        if (!list || !list.length) {
            return returnAll ? [] : null;
        }

        var i: number = 0;
        var all: Array<WebAudio | HTMLAudio> = [];
        var audio: WebAudio | HTMLAudio;

        for (; audio = list[i]; i++) {
            if (!audio.playing) {
                if (!returnAll) {
                    return audio;
                }
                all.push(audio);
            }
        }

        return returnAll ? all : all[0];
    }

    load(baseUri: string, name: string, onComplete: (loaded: boolean) => any, channels = 1, version?: string) {
        var src = baseUri + name + this._ext + (version == null ? '' : `?v=${version}`);
        var audio = WebAudio.isSupported ? new WebAudio(src) : new HTMLAudio(src);

        audio.on('load', () => {
            if (onComplete) {
                onComplete(true);
            }

            var cloned;
            while (--channels > 0) {
                cloned = audio.clone();
                this._audioCache[name].push(cloned);
            }
        });
        audio.on('error', (e: ErrorEvent) => {
            console.warn("canvas2d.Sound.load() Error: " + src + " could not be loaded.");
            removeArrayItem(this._audioCache[name], audio);
            if (onComplete) {
                onComplete(false);
            }
        });

        if (!this._audioCache[name]) {
            this._audioCache[name] = [];
        }
        this._audioCache[name].push(audio);

        audio.load();
    }

    /**
     * Load multiple sound resources
     */
    loadList(baseUri: string, resources: { name: string; channels?: number; }[], onAllCompleted?: (success: string[], errors: string[]) => any, onProgress?: (percent: number) => any, version?: string) {
        let totalCount = resources.length;
        let endedCount = 0;
        let errors: string[] = [];
        let success: string[] = [];

        let onCompleted = (name: string, loaded: boolean) => {
            ++endedCount;

            if (loaded) {
                success.push(name);
            }
            else {
                errors.push(name);
            }

            if (onProgress) {
                onProgress(endedCount / totalCount);
            }
            if (endedCount === totalCount && onAllCompleted) {
                onAllCompleted(success, errors);
            }
        }

        resources.forEach(res => {
            this.load(baseUri, res.name, (loaded) => {
                onCompleted(res.name, loaded);
            }, res.channels, version);
        });
    }

    /**
     * Get all audioes by name
     */
    getAllAudioes(name: string): Array<WebAudio | HTMLAudio> {
        return this._audioCache[name] && this._audioCache[name].slice();
    }

    /**
     * Play sound by name
     */
    play(name: string, loop: boolean = false): WebAudio | HTMLAudio {
        var audio = this._enabled && this.getAudio(name);

        if (audio) {
            audio.loop = loop;
            audio.play();
        }
        return audio;
    }

    /**
     * Pause sound by name
     */
    pause(name: string): void {
        let list = this.getAllAudioes(name);

        if (list) {
            for (let i = 0, audio: WebAudio | HTMLAudio; audio = list[i]; i++) {
                audio.pause();
            }
        }
    }

    /**
     * Stop sound by name
     */
    stop(name: string): void {
        let list = this._audioCache[name];

        if (list) {
            for (let i = 0, audio: WebAudio | HTMLAudio; audio = list[i]; i++) {
                audio.stop();
            }
        }
    }

    /**
     * Resume audio by name
     */
    resume(name: string): void {
        let list = this._audioCache[name];
        if (list) {
            for (let i = 0, audio: WebAudio | HTMLAudio; audio = list[i]; i++) {
                if (!audio.playing && audio.currentTime > 0) {
                    audio.resume();
                }
            }
        }
    }

    private _setEnabled(value: boolean) {
        if (value) {
            WebAudio.enabled = true;
            HTMLAudio.enabled = true;

            if (this._pausedAudios) {
                for (let id in this._pausedAudios) {
                    this._pausedAudios[id].resume();
                }
                this._pausedAudios = null;
            }
        }
        else {
            WebAudio.enabled = false;
            HTMLAudio.enabled = false;

            this._pausedAudios = {};
            for (let name in this._audioCache) {
                let list = this._audioCache[name];
                for (let i = 0, audio: HTMLAudio | WebAudio; audio = list[i]; i++) {
                    if (audio.playing) {
                        audio.pause();
                        this._pausedAudios[uid(audio)] = audio;
                    }
                }
            }
        }

        this._enabled = value;
    }

    private _detectSupportedType() {
        var aud = new Audio();
        var reg = /maybe|probably/i;
        var mts = {
            mp3: 'audio/mpeg',
            mp4: 'audio/mp4; codecs="mp4a.40.5"',
            wav: 'audio/x-wav',
            ogg: 'audio/ogg; codecs="vorbis"'
        };

        for (var name in mts) {
            this._supportedType[name] = reg.test(aud.canPlayType(mts[name]));
        }

        aud = null;
    }
}

export const Sound = new SoundManager();
