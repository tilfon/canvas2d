var canvas2d;
(function (canvas2d) {
    var cache = {};
    var loaded = {};
    var loading = {};
    function getName(source, rect) {
        var isStr = typeof source === 'string';
        if (!isStr || !source.src) {
            return null;
        }
        var src = isStr ? source : source.src;
        var str = rect ? [rect.x, rect.y, rect.width, rect.height].join(',') : '';
        return src + str;
    }
    function createCanvas(image, rect) {
        var canvas = document.createElement("canvas");
        var context = canvas.getContext('2d');
        canvas.width = rect.width;
        canvas.height = rect.height;
        context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
        return canvas;
    }
    var Texture = (function () {
        function Texture(source, rect) {
            this.ready = false;
            this.width = 0;
            this.height = 0;
            if (!source) {
                return;
            }
            if (typeof source === 'string') {
                this._createByPath(source, rect);
            }
            else if ((source instanceof HTMLImageElement) || (source instanceof HTMLCanvasElement)) {
                this._createByImage(source, rect);
            }
            else {
                throw new Error("Invalid texture source");
            }
            var name = getName(source, rect);
            if (name) {
                cache[name] = this;
            }
        }
        Texture.create = function (source, rect) {
            if (typeof source === 'string' && cache[source] && !rect) {
                return cache[source];
            }
            return new Texture(source, rect);
        };
        Texture.prototype._createByPath = function (path, rect) {
            var _this = this;
            var img = new Image();
            img.onload = function () {
                _this._createByImage(img, rect);
                img = null;
                if (!loaded[path]) {
                    console.log("Loaded: " + path);
                }
                loaded[path] = true;
            };
            img.onerror = function () {
                img = null;
                console.warn('Texture creating fail by "' + path + '"');
            };
            if (!loading[path]) {
                console.log("Start to load: " + path);
            }
            img.src = path;
            loading[path] = true;
        };
        Texture.prototype._createByImage = function (image, rect) {
            if (!rect) {
                rect = {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height
                };
            }
            var source = createCanvas(image, rect);
            this.width = source.width;
            this.height = source.height;
            this.source = source;
            this.ready = true;
        };
        return Texture;
    })();
    canvas2d.Texture = Texture;
})(canvas2d || (canvas2d = {}));
/// <reference path="action.ts" />
/// <reference path="texture.ts" />
var canvas2d;
(function (canvas2d) {
    var RAD_PER_DEG = Math.PI / 180;
    var Sprite = (function () {
        function Sprite(attrs) {
            this._width = 0;
            this._height = 0;
            this._originX = 0.5;
            this._originY = 0.5;
            this._rotation = 0;
            this._rotationRad = 0;
            this._originPixelX = 0;
            this._originPixelY = 0;
            this.x = 0;
            this.y = 0;
            this.scaleX = 1;
            this.scaleY = 1;
            this.sourceX = 0;
            this.sourceY = 0;
            this.opacity = 1;
            this.lighterMode = false;
            this.autoResize = true;
            this.flippedX = false;
            this.flippedY = false;
            this.visible = true;
            this.touchEnabled = true;
            this.mouseEnabled = true;
            this.keyboardEnabled = true;
            var name;
            for (name in attrs) {
                this[name] = attrs[name];
            }
            if (this.init) {
                this.init();
            }
        }
        Object.defineProperty(Sprite.prototype, "width", {
            get: function () {
                return this._width;
            },
            set: function (value) {
                this._width = value;
                this._originPixelX = this._width * this._originX;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite.prototype, "height", {
            get: function () {
                return this._height;
            },
            set: function (value) {
                this._height = value;
                this._originPixelY = this._height * this._originY;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite.prototype, "originX", {
            get: function () {
                return this._originX;
            },
            set: function (value) {
                this._originX = value;
                this._originPixelX = this._originX * this._width;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite.prototype, "originY", {
            get: function () {
                return this._originY;
            },
            set: function (value) {
                this._originY = value;
                this._originPixelY = this._originY * this._height;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite.prototype, "rotation", {
            get: function () {
                return this._rotation;
            },
            set: function (value) {
                this._rotation = value;
                this._rotationRad = this._rotation * RAD_PER_DEG;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sprite.prototype, "texture", {
            get: function () {
                return this._texture;
            },
            set: function (value) {
                this._texture = value;
                if (this.autoResize) {
                    if (value) {
                        this.width = value.width;
                        this.height = value.height;
                    }
                    else {
                        this.width = 0;
                        this.height = 0;
                    }
                }
            },
            enumerable: true,
            configurable: true
        });
        Sprite.prototype._update = function (deltaTime) {
            if (this.update) {
                this.update(deltaTime);
            }
            if (this.children && this.children.length) {
                this.children.slice().forEach(function (child) {
                    child._update(deltaTime);
                });
            }
        };
        Sprite.prototype._visit = function (context) {
            if (!this.visible || this.opacity === 0) {
                return;
            }
            var sx = this.scaleX;
            var sy = this.scaleY;
            context.save();
            if (this.lighterMode) {
                context.globalCompositeOperation = "lighter";
            }
            if (this.x !== 0 || this.y !== 0) {
                context.translate(this.x, this.y);
            }
            if (this.opacity !== 1) {
                context.globalAlpha = this.opacity;
            }
            if (this.flippedX) {
                sx = -sx;
            }
            if (this.flippedY) {
                sy = -sy;
            }
            var rotationRad = this._rotationRad % 360;
            if (rotationRad !== 0) {
                context.rotate(rotationRad);
            }
            if (this._width !== 0 && this._height !== 0) {
                this.draw(context);
            }
            this._visitAllChild(context);
            context.restore();
        };
        Sprite.prototype._visitAllChild = function (context) {
            if (!this.children || !this.children.length) {
                return;
            }
            if (this._originPixelX !== 0 || this._originPixelY !== 0) {
                context.translate(-this._originPixelX, -this._originPixelY);
            }
            this.children.forEach(function (child) {
                child._visit(context);
            });
        };
        Sprite.prototype._drawBgColor = function (context) {
            if (typeof this.bgColor === 'string') {
                context.fillStyle = this.bgColor;
                context.beginPath();
                context.rect(-this._originPixelX, -this._originPixelY, this._width, this._height);
                context.closePath();
                context.fill();
            }
        };
        Sprite.prototype.draw = function (context) {
            this._drawBgColor(context);
            var texture = this.texture;
            if (texture && texture.ready && texture.width !== 0 && texture.height !== 0) {
                var sx = this.sourceX;
                var sy = this.sourceY;
                var sw = this.sourceWidth == null ? texture.width : this.sourceWidth;
                var sh = this.sourceHeight == null ? texture.height : this.sourceHeight;
                context.drawImage(texture.source, sx, sy, sw, sh, -this._originX, -this._originY, this.width, this.height);
            }
        };
        Sprite.prototype.init = function () {
        };
        Sprite.prototype.update = function (deltaTime) {
        };
        Sprite.prototype.addChild = function (target, position) {
            if (target.parent) {
                throw new Error("Sprite has been added");
            }
            if (!this.children) {
                this.children = [];
            }
            var children = this.children;
            if (children.indexOf(target) === -1) {
                if (position > -1 && position < children.length) {
                    children.splice(position, 0, target);
                }
                else {
                    children.push(target);
                }
                target.parent = this;
            }
        };
        Sprite.prototype.removeChild = function (target) {
            if (!this.children || !this.children.length) {
                return;
            }
            var index = this.children.indexOf(target);
            if (index > -1) {
                this.children.splice(index, 1);
                target.parent = null;
            }
        };
        Sprite.prototype.removeAllChild = function (recusive) {
            if (!this.children || !this.children.length) {
                return;
            }
            while (this.children.length) {
                var sprite = this.children[0];
                if (recusive) {
                    sprite.removeAllChild(true);
                    canvas2d.Action.stop(sprite);
                }
                this.removeChild(sprite);
            }
            this.children = null;
        };
        return Sprite;
    })();
    canvas2d.Sprite = Sprite;
})(canvas2d || (canvas2d = {}));
var canvas2d;
(function (canvas2d) {
    canvas2d.tween = {
        easeInQuad: function (pos) {
            return Math.pow(pos, 2);
        },
        easeOutQuad: function (pos) {
            return -(Math.pow((pos - 1), 2) - 1);
        },
        easeInOutQuad: function (pos) {
            if ((pos /= 0.5) < 1) {
                return 0.5 * Math.pow(pos, 2);
            }
            return -0.5 * ((pos -= 2) * pos - 2);
        },
        easeInCubic: function (pos) {
            return Math.pow(pos, 3);
        },
        easeOutCubic: function (pos) {
            return (Math.pow((pos - 1), 3) + 1);
        },
        easeInOutCubic: function (pos) {
            if ((pos /= 0.5) < 1) {
                return 0.5 * Math.pow(pos, 3);
            }
            return 0.5 * (Math.pow((pos - 2), 3) + 2);
        },
        easeInQuart: function (pos) {
            return Math.pow(pos, 4);
        },
        easeOutQuart: function (pos) {
            return -(Math.pow((pos - 1), 4) - 1);
        },
        easeInOutQuart: function (pos) {
            if ((pos /= 0.5) < 1)
                return 0.5 * Math.pow(pos, 4);
            return -0.5 * ((pos -= 2) * Math.pow(pos, 3) - 2);
        },
        easeInQuint: function (pos) {
            return Math.pow(pos, 5);
        },
        easeOutQuint: function (pos) {
            return (Math.pow((pos - 1), 5) + 1);
        },
        easeInOutQuint: function (pos) {
            if ((pos /= 0.5) < 1) {
                return 0.5 * Math.pow(pos, 5);
            }
            return 0.5 * (Math.pow((pos - 2), 5) + 2);
        },
        easeInSine: function (pos) {
            return -Math.cos(pos * (Math.PI / 2)) + 1;
        },
        easeOutSine: function (pos) {
            return Math.sin(pos * (Math.PI / 2));
        },
        easeInOutSine: function (pos) {
            return (-.5 * (Math.cos(Math.PI * pos) - 1));
        },
        easeInExpo: function (pos) {
            return (pos == 0) ? 0 : Math.pow(2, 10 * (pos - 1));
        },
        easeOutExpo: function (pos) {
            return (pos == 1) ? 1 : -Math.pow(2, -10 * pos) + 1;
        },
        easeInOutExpo: function (pos) {
            if (pos == 0)
                return 0;
            if (pos == 1)
                return 1;
            if ((pos /= 0.5) < 1)
                return 0.5 * Math.pow(2, 10 * (pos - 1));
            return 0.5 * (-Math.pow(2, -10 * --pos) + 2);
        },
        easeInCirc: function (pos) {
            return -(Math.sqrt(1 - (pos * pos)) - 1);
        },
        easeOutCirc: function (pos) {
            return Math.sqrt(1 - Math.pow((pos - 1), 2));
        },
        easeInOutCirc: function (pos) {
            if ((pos /= 0.5) < 1)
                return -0.5 * (Math.sqrt(1 - pos * pos) - 1);
            return 0.5 * (Math.sqrt(1 - (pos -= 2) * pos) + 1);
        },
        easeOutBounce: function (pos) {
            if ((pos) < (1 / 2.75)) {
                return (7.5625 * pos * pos);
            }
            else if (pos < (2 / 2.75)) {
                return (7.5625 * (pos -= (1.5 / 2.75)) * pos + .75);
            }
            else if (pos < (2.5 / 2.75)) {
                return (7.5625 * (pos -= (2.25 / 2.75)) * pos + .9375);
            }
            else {
                return (7.5625 * (pos -= (2.625 / 2.75)) * pos + .984375);
            }
        },
        easeInBack: function (pos) {
            var s = 1.70158;
            return (pos) * pos * ((s + 1) * pos - s);
        },
        easeOutBack: function (pos) {
            var s = 1.70158;
            return (pos = pos - 1) * pos * ((s + 1) * pos + s) + 1;
        },
        easeInOutBack: function (pos) {
            var s = 1.70158;
            if ((pos /= 0.5) < 1)
                return 0.5 * (pos * pos * (((s *= (1.525)) + 1) * pos - s));
            return 0.5 * ((pos -= 2) * pos * (((s *= (1.525)) + 1) * pos + s) + 2);
        },
        elastic: function (pos) {
            return -1 * Math.pow(4, -8 * pos) * Math.sin((pos * 6 - 1) * (2 * Math.PI) / 2) + 1;
        },
        swingFromTo: function (pos) {
            var s = 1.70158;
            return ((pos /= 0.5) < 1) ? 0.5 * (pos * pos * (((s *= (1.525)) + 1) * pos - s)) : 0.5 * ((pos -= 2) * pos * (((s *= (1.525)) + 1) * pos + s) + 2);
        },
        swingFrom: function (pos) {
            var s = 1.70158;
            return pos * pos * ((s + 1) * pos - s);
        },
        swingTo: function (pos) {
            var s = 1.70158;
            return (pos -= 1) * pos * ((s + 1) * pos + s) + 1;
        },
        bounce: function (pos) {
            if (pos < (1 / 2.75)) {
                return (7.5625 * pos * pos);
            }
            else if (pos < (2 / 2.75)) {
                return (7.5625 * (pos -= (1.5 / 2.75)) * pos + .75);
            }
            else if (pos < (2.5 / 2.75)) {
                return (7.5625 * (pos -= (2.25 / 2.75)) * pos + .9375);
            }
            else {
                return (7.5625 * (pos -= (2.625 / 2.75)) * pos + .984375);
            }
        },
        bouncePast: function (pos) {
            if (pos < (1 / 2.75)) {
                return (7.5625 * pos * pos);
            }
            else if (pos < (2 / 2.75)) {
                return 2 - (7.5625 * (pos -= (1.5 / 2.75)) * pos + .75);
            }
            else if (pos < (2.5 / 2.75)) {
                return 2 - (7.5625 * (pos -= (2.25 / 2.75)) * pos + .9375);
            }
            else {
                return 2 - (7.5625 * (pos -= (2.625 / 2.75)) * pos + .984375);
            }
        },
        easeFromTo: function (pos) {
            if ((pos /= 0.5) < 1)
                return 0.5 * Math.pow(pos, 4);
            return -0.5 * ((pos -= 2) * Math.pow(pos, 3) - 2);
        },
        easeFrom: function (pos) {
            return Math.pow(pos, 4);
        },
        easeTo: function (pos) {
            return Math.pow(pos, 0.25);
        },
        linear: function (pos) {
            return pos;
        },
        sinusoidal: function (pos) {
            return (-Math.cos(pos * Math.PI) / 2) + 0.5;
        },
        reverse: function (pos) {
            return 1 - pos;
        },
        mirror: function (pos, transition) {
            transition = transition || this.sinusoidal;
            if (pos < 0.5)
                return transition(pos * 2);
            else
                return transition(1 - (pos - 0.5) * 2);
        },
        flicker: function (pos) {
            var pos = pos + (Math.random() - 0.5) / 5;
            return this.sinusoidal(pos < 0 ? 0 : pos > 1 ? 1 : pos);
        },
        wobble: function (pos) {
            return (-Math.cos(pos * Math.PI * (9 * pos)) / 2) + 0.5;
        },
        pulse: function (pos, pulses) {
            return (-Math.cos((pos * ((pulses || 5) - .5) * 2) * Math.PI) / 2) + .5;
        },
        blink: function (pos, blinks) {
            return Math.round(pos * (blinks || 5)) % 2;
        },
        spring: function (pos) {
            return 1 - (Math.cos(pos * 4.5 * Math.PI) * Math.exp(-pos * 6));
        },
        none: function (pos) {
            return 0;
        },
        full: function (pos) {
            return 1;
        }
    };
})(canvas2d || (canvas2d = {}));
/// <reference path="sprite.ts" />
/// <reference path="tween.ts" />
var canvas2d;
(function (canvas2d) {
    function ensureItem(array, item) {
        if (array.indexOf(item) < 0) {
            array.push(item);
        }
    }
    function removeItem(array, item) {
        var index = array.indexOf(item);
        if (index > -1) {
            array.splice(index, 1);
        }
    }
    function publish(callbackList) {
        callbackList.forEach(function (callback) {
            callback();
        });
    }
    var Callback = (function () {
        function Callback(func) {
            this.func = func;
            this.done = false;
            this.immediate = true;
        }
        Callback.prototype.step = function () {
            if (!this.done) {
                this.func.call(null);
                this.done = true;
            }
        };
        Callback.prototype.end = function () {
            this.step();
        };
        return Callback;
    })();
    var Delay = (function () {
        function Delay(duration) {
            this.duration = duration;
            this.done = false;
            this.elapsed = 0;
            this.immediate = true;
        }
        Delay.prototype.step = function (deltaTime) {
            this.elapsed += deltaTime;
            if (this.elapsed >= this.duration) {
                this.done = true;
            }
        };
        Delay.prototype.end = function () {
        };
        return Delay;
    })();
    var Transition = (function () {
        function Transition(attrs, duration) {
            this.duration = duration;
            this.done = false;
            this.immediate = false;
            this.elapsed = 0;
            this.attrs = [];
            this.starts = {};
            this.deltas = {};
            var name;
            var value;
            for (name in attrs) {
                value = attrs[name];
                this.attrs.push({
                    name: name,
                    dest: typeof value === 'object' ? value.dest : value,
                    easing: value.easing || 'easeInOutQuad'
                });
            }
        }
        Transition.prototype.step = function (deltaTime, sprite) {
            this.elapsed += deltaTime;
            if (this.elapsed >= this.duration) {
                this.end(sprite);
            }
            else {
                var percent = this.elapsed / this.duration;
                var starts = this.starts;
                var deltas = this.deltas;
                var start;
                var dest;
                var delta;
                var name;
                this.attrs.forEach(function (attr) {
                    name = attr.name;
                    dest = attr.dest;
                    delta = canvas2d.tween[attr.easing](percent);
                    start = starts[name];
                    if (start == null) {
                        start = starts[name] = sprite[name];
                        deltas[name] = dest - start;
                    }
                    sprite[name] = start + (delta * deltas[name]);
                });
            }
        };
        Transition.prototype.end = function (sprite) {
            this.attrs.forEach(function (attr) {
                sprite[attr.name] = attr.dest;
            });
            this.done = true;
        };
        return Transition;
    })();
    var Animation = (function () {
        function Animation(frameList, frameRate, repetitions) {
            this.frameList = frameList;
            this.repetitions = repetitions;
            this.done = false;
            this.immediate = false;
            this.elapsed = 0;
            this.count = 0;
            this.frameIndex = 0;
            this.interval = 1 / frameRate;
        }
        Animation.prototype.step = function (deltaTime, sprite) {
            this.elapsed += deltaTime;
            if (this.elapsed >= this.interval) {
                if (this.repetitions == null || this.count < this.repetitions) {
                    sprite.texture = this.frameList[this.frameIndex++];
                    if (this.frameIndex === this.frameList.length) {
                        this.frameIndex = 0;
                    }
                    this.count++;
                }
                else {
                    this.done = true;
                }
                this.elapsed = 0;
            }
        };
        Animation.prototype.end = function () {
        };
        return Animation;
    })();
    var Listener = (function () {
        function Listener(_actions) {
            this._actions = _actions;
            this._resolved = false;
            this._callback = {};
        }
        Listener.prototype.allDone = function (callback) {
            if (this._resolved) {
                callback();
            }
            else {
                if (!this._callback.all) {
                    this._callback.all = [];
                }
                ensureItem(this._callback.all, callback);
            }
            return this;
        };
        Listener.prototype.anyDone = function (callback) {
            if (this._resolved) {
                callback();
            }
            else {
                if (!this._callback.any) {
                    this._callback.any = [];
                }
                ensureItem(this._callback.any, callback);
            }
            return this;
        };
        Listener.prototype._step = function () {
            var allDone = true;
            var anyDone = false;
            this._actions.forEach(function (action) {
                if (action._done) {
                    anyDone = true;
                }
                else {
                    allDone = false;
                }
            });
            if (anyDone && this._callback.any) {
                publish(this._callback.any);
                this._callback.any = null;
            }
            if (allDone && this._callback.all) {
                publish(this._callback.all);
                removeItem(Action._listenerList, this);
                this._resolved = true;
            }
        };
        return Listener;
    })();
    canvas2d.Listener = Listener;
    var Action = (function () {
        function Action(sprite) {
            this.sprite = sprite;
            this._queue = [];
            this._done = false;
            this.running = false;
        }
        Action.stop = function (sprite) {
            Action._actionList.slice().forEach(function (action) {
                if (action.sprite === sprite) {
                    action.stop();
                }
            });
        };
        Action.listen = function (actions) {
            var listener = new Listener(actions);
            Action._listenerList.push(listener);
            return listener;
        };
        Action._step = function (deltaTime) {
            var actionList = Action._actionList;
            var i = 0;
            var action;
            for (; action = actionList[i]; i++) {
                action._step(deltaTime);
                if (action._done) {
                    removeItem(actionList, action);
                }
            }
            Action._listenerList.slice().forEach(function (listener) {
                listener._step();
            });
        };
        Action.prototype._step = function (deltaTime) {
            if (!this._queue.length) {
                return;
            }
            var action = this._queue[0];
            action.step(deltaTime, this.sprite);
            if (action.done) {
                this._queue.shift();
                if (!this._queue.length) {
                    this._done = true;
                    this.running = false;
                    this.sprite = null;
                }
                else if (action.immediate) {
                    this._step(deltaTime);
                }
            }
        };
        Action.prototype.then = function (func) {
            this._queue.push(new Callback(func));
            return this;
        };
        Action.prototype.wait = function (time) {
            this._queue.push(new Delay(time));
            return this;
        };
        Action.prototype.animate = function (frameList, frameRate, repetitions) {
            var anim = new Animation(frameList, frameRate, repetitions);
            this._queue.push(anim);
            anim.step(anim.interval, this.sprite);
            return this;
        };
        Action.prototype.to = function (attrs, duration) {
            this._queue.push(new Transition(attrs, duration));
            return this;
        };
        Action.prototype.start = function () {
            if (!this.running) {
                ensureItem(Action._actionList, this);
                this.running = true;
            }
            return this;
        };
        Action.prototype.stop = function () {
            this._done = true;
            this.running = false;
            this._queue.length = 0;
            removeItem(Action._actionList, this);
        };
        Action._actionList = [];
        Action._listenerList = [];
        return Action;
    })();
    canvas2d.Action = Action;
})(canvas2d || (canvas2d = {}));
var canvas2d;
(function (canvas2d) {
    var Sound;
    (function (Sound) {
        var audios = {};
        Sound.enabled = true;
        Sound.extention = ".mp3";
        Sound.supportedType = {};
        function load(basePath, name, onComplete, channels) {
            if (channels === void 0) { channels = 1; }
            var path = basePath + name + Sound.extention;
            var audio = document.createElement("audio");
            function onCanPlayThrough() {
                this.removeEventListener('canplaythrough', onCanPlayThrough, false);
                if (onComplete) {
                    onComplete();
                }
                console.log("Loaded: " + path);
            }
            function onError(e) {
                console.warn("Error: " + path + " could not be loaded.");
                audios[name] = null;
            }
            audio.addEventListener('canplaythrough', onCanPlayThrough, false);
            audio.addEventListener('error', onError, false);
            audio.preload = "auto";
            audio.autobuffer = true;
            audio.src = path;
            audio.load();
            console.log("Start to load: ", path);
            audios[name] = [audio];
            var clone;
            while (--channels > 0) {
                clone = audio.cloneNode(true);
                audios[name].push(clone);
            }
        }
        Sound.load = load;
        function loadList(basePath, resList, callback) {
            var counter = resList.length;
            function onCompleted() {
                counter--;
                if (counter === 0 && callback) {
                    callback();
                }
            }
            resList.forEach(function (res) {
                load(basePath, res.name, onCompleted, res.channels);
            });
        }
        Sound.loadList = loadList;
        function getAudio(name, isGetList) {
            if (isGetList === void 0) { isGetList = false; }
            var list = audios[name];
            if (isGetList) {
                return list;
            }
            if (!list || !list.length) {
                return null;
            }
            var i = 0;
            var audio;
            for (; audio = list[i]; i++) {
                if (audio.ended || audio.paused) {
                    break;
                }
            }
            audio = audio || list[0];
            if (audio.ended) {
                audio.currentTime = 0;
            }
            return audio;
        }
        Sound.getAudio = getAudio;
        function play(name, loop) {
            var audio = Sound.enabled && getAudio(name);
            if (audio) {
                if (loop) {
                    audio.loop = true;
                    audio.addEventListener("ended", replay, false);
                }
                else {
                    audio.loop = false;
                    audio.removeEventListener("ended", replay, false);
                }
                audio.play();
            }
            return audio;
        }
        Sound.play = play;
        function pause(name, reset) {
            var audio = getAudio(name);
            if (audio) {
                audio.pause();
                if (reset) {
                    audio.currentTime = 0;
                }
            }
        }
        Sound.pause = pause;
        function stopLoop(name) {
            var audio = getAudio(name);
            if (audio) {
                audio.removeEventListener("ended", replay, false);
                audio.loop = false;
            }
        }
        Sound.stopLoop = stopLoop;
        function replay() {
            this.play();
        }
        function detectSupportedType() {
            var aud = new Audio();
            var reg = /maybe|probably/i;
            var mts = {
                mp3: 'audio/mpeg',
                mp4: 'audio/mp4; codecs="mp4a.40.5"',
                wav: 'audio/x-wav',
                ogg: 'audio/ogg; codecs="vorbis"'
            };
            for (var name in mts) {
                Sound.supportedType[name] = reg.test(aud.canPlayType(mts[name]));
            }
            aud = null;
        }
        detectSupportedType();
    })(Sound = canvas2d.Sound || (canvas2d.Sound = {}));
})(canvas2d || (canvas2d = {}));
/// <reference path="stage.ts" />
var canvas2d;
(function (canvas2d) {
    var UIEvent;
    (function (UIEvent) {
        var keyDown = "keydown";
        var keyUp = "keyup";
        var touchBegin = "touchstart";
        var touchMoved = "touchmove";
        var touchEnded = "touchend";
        var mouseBegin = "mousedown";
        var mouseMoved = "mousemove";
        var mouseEnded = "mouseup";
        var ON_CLICK = "onclick";
        var ON_KEY_UP = "onkeyup";
        var ON_KEY_DOWN = "onkeydown";
        var ON_TOUCH_BEGIN = "ontouchbegin";
        var ON_TOUCH_MOVED = "ontouchmoved";
        var ON_TOUCH_ENDED = "ontouchended";
        var ON_MOUSE_BEGIN = "onmousebegin";
        var ON_MOUSE_MOVED = "onmousemoved";
        var ON_MOUSE_ENDED = "onmouseended";
        var touchMap = {};
        var mouseLoc;
        UIEvent.supportTouch = "ontouchend" in window;
        function register() {
            if (canvas2d.Stage.touchEnabled && UIEvent.supportTouch) {
                canvas2d.Stage.canvas.addEventListener(touchBegin, touchBeginHandler, false);
            }
            if (canvas2d.Stage.mouseEnabled && !UIEvent.supportTouch) {
                canvas2d.Stage.canvas.addEventListener(mouseBegin, mouseBeginHandler, false);
            }
            if (canvas2d.Stage.keyboardEnabled) {
                document.addEventListener(keyDown, keyDownHandler, false);
                document.addEventListener(keyUp, keyUpHandler, false);
            }
        }
        UIEvent.register = register;
        function unregister() {
            canvas2d.Stage.canvas.removeEventListener(touchBegin, touchBeginHandler, false);
            canvas2d.Stage.canvas.removeEventListener(mouseBegin, mouseBeginHandler, false);
            document.removeEventListener(keyDown, keyDownHandler, false);
            document.removeEventListener(keyUp, keyUpHandler, false);
        }
        UIEvent.unregister = unregister;
        function transformTouches(touches, justGet) {
            var ret = [];
            var pos = canvas2d.Stage.canvas.getBoundingClientRect();
            for (var i = 0, x, y, id, transformed, touch; touch = touches[i]; i++) {
                id = touch.identifier;
                x = (touch.clientX - pos.left) / canvas2d.Stage._scale;
                y = (touch.clientY - pos.top) / canvas2d.Stage._scale;
                transformed = touchMap[id];
                if (!transformed) {
                    transformed = touchMap[id] = {
                        identifier: id,
                        beginX: x,
                        beginY: y
                    };
                }
                else if (!justGet) {
                    transformed._moved = x - transformed.beginX !== 0 || y - transformed.beginY !== 0;
                }
                transformed.stageX = x;
                transformed.stageY = y;
                ret.push(transformed);
            }
            return ret;
        }
        function transformLocation(event) {
            var pos = canvas2d.Stage.canvas.getBoundingClientRect();
            var x = (event.clientX - pos.left) / canvas2d.Stage._scale;
            var y = (event.clientY - pos.top) / canvas2d.Stage._scale;
            if (!mouseLoc) {
                mouseLoc = {
                    beginX: x,
                    beginY: y
                };
            }
            else {
                mouseLoc._moved = x - mouseLoc.beginX !== 0 || y - mouseLoc.beginY !== 0;
            }
            mouseLoc.stageX = x;
            mouseLoc.stageY = y;
            return mouseLoc;
        }
        function isRectContainPoint(rect, p) {
            return rect.x <= p.stageX && rect.x + rect.width >= p.stageX && rect.y <= p.stageY && rect.y + rect.height >= p.stageY;
        }
        function touchBeginHandler(event) {
            if (!canvas2d.Stage.isRunning || !canvas2d.Stage.touchEnabled) {
                return;
            }
            var touches = transformTouches(event.changedTouches);
            if (dispatchTouch(canvas2d.Stage.sprite, 0, 0, touches.slice(), event, ON_TOUCH_BEGIN)) {
                touches.forEach(function (touch) {
                    touch.beginTarget = touch.target;
                });
                canvas2d.Stage.canvas.addEventListener(touchMoved, touchMovedHandler, false);
                canvas2d.Stage.canvas.addEventListener(touchEnded, touchEndedHandler, false);
            }
            event.preventDefault();
        }
        function touchMovedHandler(event) {
            if (!canvas2d.Stage.isRunning || !canvas2d.Stage.touchEnabled) {
                return;
            }
            var touches = transformTouches(event.changedTouches);
            dispatchTouch(canvas2d.Stage.sprite, 0, 0, touches, event, ON_TOUCH_MOVED);
            event.preventDefault();
        }
        function touchEndedHandler(event) {
            canvas2d.Stage.canvas.removeEventListener(touchEnded, touchEndedHandler, false);
            canvas2d.Stage.canvas.removeEventListener(touchMoved, touchMovedHandler, false);
            var touches = transformTouches(event.changedTouches, true);
            var target;
            touches.forEach(function (touch) {
                target = touch.target;
                if (canvas2d.Stage.isRunning && canvas2d.Stage.touchEnabled) {
                    if (typeof target[ON_TOUCH_ENDED] === 'function') {
                        target[ON_TOUCH_ENDED](touch, touches, event);
                    }
                    if (typeof target[ON_CLICK] === 'function' && target === touch.beginTarget && !touch._moved) {
                        target[ON_CLICK](touch, event);
                    }
                }
                touch.target = null;
                touch.beginTarget = null;
                touchMap[touch.identifier] = null;
            });
            touches = null;
        }
        function mouseBeginHandler(event) {
            if (!canvas2d.Stage.isRunning || !canvas2d.Stage.mouseEnabled) {
                return;
            }
            var location = transformLocation(event);
            if (dispatchMouse(canvas2d.Stage.sprite, 0, 0, location, event, ON_MOUSE_BEGIN)) {
                location.beginTarget = location.target;
                canvas2d.Stage.canvas.addEventListener(mouseMoved, mouseMovedHandler, false);
                canvas2d.Stage.canvas.addEventListener(mouseEnded, mouseEndedHandler, false);
            }
            event.preventDefault();
        }
        function mouseMovedHandler(event) {
            if (!canvas2d.Stage.isRunning || !canvas2d.Stage.mouseEnabled) {
                return;
            }
            var location = transformLocation(event);
            dispatchMouse(canvas2d.Stage.sprite, 0, 0, location, event, ON_MOUSE_MOVED);
            event.preventDefault();
        }
        function mouseEndedHandler(event) {
            canvas2d.Stage.canvas.removeEventListener(mouseEnded, mouseEndedHandler, false);
            canvas2d.Stage.canvas.removeEventListener(mouseMoved, mouseMovedHandler, false);
            var location = transformLocation(event);
            var target;
            if (canvas2d.Stage.mouseEnabled) {
                target = location.target;
                if (typeof (target[ON_MOUSE_ENDED]) === 'function') {
                    target[ON_MOUSE_ENDED](location, event);
                }
                if (typeof (target[ON_CLICK]) === 'function' && target === location.beginTarget && !location._moved) {
                    target[ON_CLICK](location, event);
                }
            }
            mouseLoc = location.target = location.beginTarget = null;
        }
        function keyDownHandler(event) {
            if (!canvas2d.Stage.isRunning || !canvas2d.Stage.keyboardEnabled) {
                return;
            }
            dispatchKeyboard(canvas2d.Stage.sprite, event.keyCode, event, ON_KEY_DOWN);
        }
        function keyUpHandler(event) {
            if (!canvas2d.Stage.isRunning || !canvas2d.Stage.keyboardEnabled) {
                return;
            }
            dispatchKeyboard(canvas2d.Stage.sprite, event.keyCode, event, ON_KEY_UP);
        }
        function dispatchTouch(sprite, offsetX, offsetY, touches, event, method) {
            if (sprite.touchEnabled === false || !sprite.visible) {
                return false;
            }
            offsetX += sprite.x - sprite._originPixelX;
            offsetY += sprite.y - sprite._originPixelY;
            var children = sprite.children;
            var dispatched;
            if (children && children.length) {
                var index = children.length;
                while (--index >= 0) {
                    dispatched = dispatchTouch(children[index], offsetX, offsetY, touches, event, method);
                    if (dispatched && !touches.length) {
                        return true;
                    }
                }
            }
            var methodNotFound = typeof (sprite[method]) !== 'function';
            if (sprite.width === 0 || sprite.height === 0 || (methodNotFound && typeof (sprite[ON_CLICK]) !== 'function')) {
                return false;
            }
            var hits = [];
            var rect = {
                x: offsetX,
                y: offsetY,
                width: sprite.width,
                height: sprite.height
            };
            for (var i = 0, touch; touch = touches[i]; i++) {
                if (isRectContainPoint(rect, touch)) {
                    touch.target = sprite;
                    touch.localX = touch.stageX - rect.x;
                    touch.localY = touch.stageY - rect.y;
                    hits.push(touch);
                    touches.splice(i--, 1);
                }
            }
            if (hits.length) {
                if (!methodNotFound) {
                    if (sprite[method](hits, event) === false) {
                        return true;
                    }
                }
            }
            return false;
        }
        function dispatchMouse(sprite, offsetX, offsetY, location, event, method) {
            if (sprite.mouseEnabled === false || !sprite.visible) {
                return false;
            }
            offsetX += sprite.x - sprite._originPixelX;
            offsetY += sprite.y - sprite._originPixelY;
            var children = sprite.children;
            var dispatched;
            if (children && children.length) {
                var index = children.length;
                while (--index >= 0) {
                    if (dispatchMouse(children[index], offsetX, offsetY, location, event, method)) {
                        return true;
                    }
                }
            }
            var methodNotFound = typeof (sprite[method]) !== 'function';
            if (sprite.width === 0 || sprite.height === 0 || (methodNotFound && typeof sprite[ON_CLICK] !== 'function')) {
                return false;
            }
            var rect = {
                x: offsetX,
                y: offsetY,
                width: sprite.width,
                height: sprite.height
            };
            if (isRectContainPoint(rect, location)) {
                location.target = sprite;
                location.localX = location.stageX - rect.x;
                location.localY = location.stageY - rect.y;
                if (!methodNotFound) {
                    if (sprite[method](location, event) === false) {
                        return true;
                    }
                }
            }
            return false;
        }
        function dispatchKeyboard(sprite, keyCode, event, method) {
            if (sprite.keyboardEnabled === false) {
                return;
            }
            if (typeof sprite[method] === 'function') {
                sprite[method](keyCode, event);
            }
            var i = 0, children = sprite.children, child;
            if (children && children.length) {
                for (; child = children[i]; i++) {
                    dispatchKeyboard(child, keyCode, event, method);
                }
            }
        }
    })(UIEvent = canvas2d.UIEvent || (canvas2d.UIEvent = {}));
})(canvas2d || (canvas2d = {}));
/// <reference path="action.ts" />
/// <reference path="uievent.ts" />
var canvas2d;
(function (canvas2d) {
    var Stage;
    (function (Stage) {
        var timerID;
        var lastUpdate;
        var bufferCanvas;
        var bufferContext;
        var stageScaleMode;
        Stage.fps = 30;
        Stage.width;
        Stage.height;
        Stage.isRunning = false;
        Stage.touchEnabled = false;
        Stage.mouseEnabled = false;
        Stage.keyboardEnabled = false;
        Stage.canvas;
        Stage.context;
        Stage.sprite;
        Stage._scale;
        (function (ScaleMode) {
            ScaleMode[ScaleMode["SHOW_ALL"] = 0] = "SHOW_ALL";
            ScaleMode[ScaleMode["NO_BORDER"] = 1] = "NO_BORDER";
            ScaleMode[ScaleMode["FIX_WIDTH"] = 2] = "FIX_WIDTH";
            ScaleMode[ScaleMode["FIX_HEIGHT"] = 3] = "FIX_HEIGHT";
        })(Stage.ScaleMode || (Stage.ScaleMode = {}));
        var ScaleMode = Stage.ScaleMode;
        function adjustStageSize() {
            var style = Stage.canvas.style;
            var device = {
                width: window.innerWidth,
                height: window.innerHeight
            };
            var scaleX = device.width / Stage.width;
            var scaleY = device.height / Stage.height;
            var scale;
            var width;
            var height;
            switch (stageScaleMode) {
                case 0 /* SHOW_ALL */:
                    if (scaleX < scaleY) {
                        scale = scaleX;
                        width = device.width;
                        height = scale * Stage.height;
                    }
                    else {
                        scale = scaleY;
                        width = scale * Stage.width;
                        height = device.height;
                    }
                    break;
                case 1 /* NO_BORDER */:
                    if (scaleX > scaleY) {
                        scale = scaleX;
                    }
                    else {
                        scale = scaleY;
                    }
                    width = Stage.width * scale;
                    height = Stage.height * scale;
                    break;
                case 2 /* FIX_WIDTH */:
                    scale = scaleX;
                    width = device.width;
                    height = device.height * scale;
                    break;
                case 3 /* FIX_HEIGHT */:
                    scale = scaleY;
                    width = scale * device.width;
                    height = device.height;
                    break;
                default:
                    throw new Error('Unknow stage scale mode "' + stageScaleMode + '"');
            }
            style.width = width + 'px';
            style.height = height + 'px';
            style.top = ((device.height - height) * 0.5) + 'px';
            style.left = ((device.width - width) * 0.5) + 'px';
            style.position = 'absolute';
            Stage._scale = scale;
        }
        function initScreenEvent() {
            window.addEventListener("resize", adjustStageSize);
        }
        function getDeltaTime() {
            var now = Date.now();
            var delta = now - lastUpdate;
            lastUpdate = now;
            return delta / 1000;
        }
        function step() {
            var width = Stage.canvas.width;
            var height = Stage.canvas.height;
            var deltaTime = getDeltaTime();
            canvas2d.Action._step(deltaTime);
            Stage.sprite._update(deltaTime);
            bufferContext.clearRect(0, 0, width, height);
            Stage.sprite._visit(bufferContext);
            Stage.context.clearRect(0, 0, width, height);
            Stage.context.drawImage(bufferCanvas, 0, 0, width, height);
            timerID = setTimeout(step, 1000 / Stage.fps);
        }
        function init(canvas, width, height, scaleMode) {
            Stage.sprite = new canvas2d.Sprite({
                x: width * 0.5,
                y: height * 0.5,
                width: width,
                height: height
            });
            stageScaleMode = scaleMode;
            this.canvas = canvas;
            this.context = canvas.getContext('2d');
            bufferCanvas = document.createElement("canvas");
            bufferContext = bufferCanvas.getContext("2d");
            this.width = canvas.width = bufferCanvas.width = width;
            this.height = canvas.height = bufferCanvas.height = height;
            adjustStageSize();
            initScreenEvent();
        }
        Stage.init = init;
        function start() {
            if (!Stage.isRunning) {
                lastUpdate = Date.now();
                step();
                canvas2d.UIEvent.register();
                Stage.isRunning = true;
            }
        }
        Stage.start = start;
        function stop() {
            if (!Stage.isRunning) {
                return;
            }
            clearTimeout(timerID);
            canvas2d.UIEvent.unregister();
            Stage.isRunning = false;
        }
        Stage.stop = stop;
        function addChild(child) {
            Stage.sprite.addChild(child);
        }
        Stage.addChild = addChild;
        function removeChild(child) {
            Stage.sprite.removeChild(child);
        }
        Stage.removeChild = removeChild;
        function removeAllChild(recusive) {
            Stage.sprite.removeAllChild(recusive);
        }
        Stage.removeAllChild = removeAllChild;
    })(Stage = canvas2d.Stage || (canvas2d.Stage = {}));
})(canvas2d || (canvas2d = {}));
/// <reference path="sprite.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var canvas2d;
(function (canvas2d) {
    var measureContext = document.createElement("canvas").getContext("2d");
    var regEnter = /\n/;
    var TextLabel = (function (_super) {
        __extends(TextLabel, _super);
        function TextLabel(attrs) {
            _super.call(this, attrs);
            this.fontName = 'Arial';
            this.textAlign = 'center';
            this.fontColor = '#000';
            this.fontSize = 20;
            this.lineSpace = 5;
            this._text = '';
        }
        Object.defineProperty(TextLabel.prototype, "text", {
            get: function () {
                return this._text;
            },
            set: function (content) {
                if (this._text !== content) {
                    this._text = content;
                    if (this.autoResize) {
                        this._resize();
                    }
                    else {
                        this._lines = content.split(regEnter);
                    }
                }
            },
            enumerable: true,
            configurable: true
        });
        TextLabel.prototype._resize = function () {
            this._lines = this._text.split(regEnter);
            var width = 0;
            var height = 0;
            var fontSize = this.fontSize;
            var lineSpace = this.lineSpace;
            measureContext.save();
            measureContext.font = fontSize + 'px ' + this.fontName;
            this._lines.forEach(function (text, i) {
                width = Math.max(width, measureContext.measureText(text).width);
                height = lineSpace * i + fontSize * (i + 1);
            });
            measureContext.restore();
            this.width = width;
            this.height = height;
        };
        TextLabel.prototype.addChild = function () {
            throw new Error("TextLabel cannot not have children");
        };
        TextLabel.prototype.removeChild = function () {
            throw new Error("TextLabel has no child");
        };
        TextLabel.prototype.draw = function (context) {
            if (this._text.length === 0) {
                return;
            }
            this._drawBgColor(context);
            context.font = this.fontSize + 'px ' + this.fontName;
            context.fillStyle = this.fontColor;
            context.textAlign = this.textAlign;
            context.textBaseline = 'top';
            var y = -this.originY * this.height;
            var w = this.width;
            var h = this.fontSize + this.lineSpace;
            this._lines.forEach(function (text) {
                if (text.length > 0) {
                    context.fillText(text, 0, y);
                }
                y += h;
            });
        };
        return TextLabel;
    })(canvas2d.Sprite);
    canvas2d.TextLabel = TextLabel;
})(canvas2d || (canvas2d = {}));
var canvas2d;
(function (canvas2d) {
    var UIEvent;
    (function (UIEvent) {
        UIEvent.key = {
            MOUSE_LEFT: 1,
            MOUSE_MID: 2,
            MOUSE_RIGHT: 3,
            BACKSPACE: 8,
            TAB: 9,
            NUM_CENTER: 12,
            ENTER: 13,
            RETURN: 13,
            SHIFT: 16,
            CTRL: 17,
            ALT: 18,
            PAUSE: 19,
            CAPS_LOCK: 20,
            ESC: 27,
            ESCAPE: 27,
            SPACE: 32,
            PAGE_UP: 33,
            PAGE_DOWN: 34,
            END: 35,
            HOME: 36,
            LEFT: 37,
            UP: 38,
            RIGHT: 39,
            DOWN: 40,
            PRINT_SCREEN: 44,
            INSERT: 45,
            DELETE: 46,
            ZERO: 48,
            ONE: 49,
            TWO: 50,
            THREE: 51,
            FOUR: 52,
            FIVE: 53,
            SIX: 54,
            SEVEN: 55,
            EIGHT: 56,
            NINE: 57,
            A: 65,
            B: 66,
            C: 67,
            D: 68,
            E: 69,
            F: 70,
            G: 71,
            H: 72,
            I: 73,
            J: 74,
            K: 75,
            L: 76,
            M: 77,
            N: 78,
            O: 79,
            P: 80,
            Q: 81,
            R: 82,
            S: 83,
            T: 84,
            U: 85,
            V: 86,
            W: 87,
            X: 88,
            Y: 89,
            Z: 90,
            CONTEXT_MENU: 93,
            NUM0: 96,
            NUM1: 97,
            NUM2: 98,
            NUM3: 99,
            NUM4: 100,
            NUM5: 101,
            NUM6: 102,
            NUM7: 103,
            NUM8: 104,
            NUM9: 105,
            NUM_MULTIPLY: 106,
            NUM_PLUS: 107,
            NUM_MINUS: 109,
            NUM_PERIOD: 110,
            NUM_DIVISION: 111,
            F1: 112,
            F2: 113,
            F3: 114,
            F4: 115,
            F5: 116,
            F6: 117,
            F7: 118,
            F8: 119,
            F9: 120,
            F10: 121,
            F11: 122,
            F12: 123
        };
    })(UIEvent = canvas2d.UIEvent || (canvas2d.UIEvent = {}));
})(canvas2d || (canvas2d = {}));