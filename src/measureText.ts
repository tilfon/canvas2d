import { ITextLabel, FontStyle, FontWeight } from './sprite/TextLabel';
import { Color } from './Util';

var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');

// var _cache: { [key: string]: MeasuredSize } = {};
var _cache2: { [key: string]: MeasuredSize2 } = {};
var _cacheCount = 0;

// function getCacheKey(text: string, width: number, fontFace: FontFace, fontSize: number, lineHeight: number) {
//     return text + width + fontFace.name + fontSize + lineHeight;
// }

function getCacheKey2(
    textFlow: TextFlow[],
    width: number,
    fontName: string,
    fontSize: number,
    lineHeight: number,
    wordWrap: boolean,
    autoResizeWidth: boolean,
) {
    return [JSON.stringify(textFlow), width, fontName, fontSize, lineHeight, wordWrap, autoResizeWidth].join(':');
}

export type TextFlow = {
    text: string;
    fontStyle?: FontStyle;
    fontName?: string;
    fontWeight?: FontWeight;
    fontColor?: Color;
    fontSize?: number;
    strokeWidth?: number;
    strokeColor?: Color;
}

export type TextFragment = TextFlow & {
    width: number;
}

// export type FontFace = {
//     style: string;
//     weight: string;
//     name: string;
// }

export type MeasuredSize = {
    width: number;
    height: number;
    lines: { width: number; text: string }[];
};

export type MeasuredSize2 = {
    width: number;
    height: number;
    lines: {
        width: number;
        fragments: TextFragment[];
    }[];
};

export function measureText2(
    textFlow: TextFlow[],
    width: number,
    fontName: string,
    fontStyle: FontStyle,
    fontWeight: FontWeight,
    fontSize: number,
    lineHeight: number,
    wordWrap: boolean,
    autoResizeWidth: boolean,
): MeasuredSize2 {
    let cacheKey = getCacheKey2(textFlow, width, fontName, fontSize, lineHeight, wordWrap, autoResizeWidth);
    let cached = _cache2[cacheKey];
    if (cached) {
        return cached;
    }

    let measuredSize: MeasuredSize2 = {
        width: width,
        height: 0,
        lines: [],
    };
    let remainWidth = width;
    let lineFragments: TextFragment[] = [];
    let lineWidth = 0;
    let textMetrics: TextMetrics;

    textFlow.forEach(flow => {
        let text: string = flow.text;
        let props: TextFlow = {
            fontSize,
            fontStyle,
            fontName,
            fontWeight,
            ...flow,
        }

        ctx.font = props.fontStyle + ' ' + props.fontWeight + ' ' + props.fontSize + 'px ' + props.fontName;

        if (!wordWrap) {
            textMetrics = ctx.measureText(text);
            lineFragments.push({
                ...props,
                text: text,
                width: textMetrics.width,
            });
            lineWidth += textMetrics.width;
            return;
        }

        let currentPos = 0;
        let lastMeasuredWidth = 0;
        let currentLine = "";
        let tryLine: string;

        while (currentPos < text.length) {
            // console.log("remain width", remainWidth)
            let breaker = nextBreak(text, currentPos, remainWidth, props.fontSize, autoResizeWidth);

            if (breaker.words) {
                tryLine = currentLine + breaker.words;
                textMetrics = ctx.measureText(tryLine);

                if (autoResizeWidth && !breaker.required) {
                    currentLine = tryLine;
                    lastMeasuredWidth = textMetrics.width;
                }
                else if (!autoResizeWidth && textMetrics.width + lineWidth > width) {
                    if (breaker.words.length > 1 && textMetrics.width + lineWidth - props.fontSize <= width) {
                        // console.log(breaker.words, textMetrics.width, lineWidth, props.fontSize, width, remainWidth);
                        tryLine = currentLine + breaker.words.slice(0, breaker.words.length - 1);
                        breaker.words = breaker.words.slice(breaker.words.length - 1);
                        if (breaker.required) {
                            breaker.pos -= 2;
                        }
                        else {
                            breaker.pos -= 1;
                        }

                        lineFragments.push({
                            ...props,
                            text: tryLine.trim(),
                            width: textMetrics.width - fontSize,
                        });
                        measuredSize.lines.push({
                            width: lineWidth + textMetrics.width - fontSize,
                            fragments: lineFragments,
                        });
                    }
                    else {
                        // console.log(breaker.words, textMetrics.width, lineWidth, props.fontSize, width, remainWidth, currentLine);
                        lineFragments.push({
                            ...props,
                            text: currentLine.trim(),
                            width: lastMeasuredWidth,
                        });
                        measuredSize.lines.push({
                            fragments: lineFragments,
                            width: lineWidth + lastMeasuredWidth
                        });
                    }

                    measuredSize.height += lineHeight;

                    lineFragments = [];
                    lineWidth = 0;
                    currentLine = breaker.words;
                    lastMeasuredWidth = ctx.measureText(currentLine.trim()).width;
                    remainWidth = width - lastMeasuredWidth;

                    if (breaker.required) {
                        measuredSize.lines.push({
                            width: lastMeasuredWidth,
                            fragments: [{
                                ...props,
                                text: currentLine.trim(),
                                width: lastMeasuredWidth,
                            }],
                        });
                        measuredSize.height += lineHeight;
                        currentLine = "";
                        lastMeasuredWidth = 0;
                    }
                }
                else if (breaker.required) {
                    lineFragments.push({
                        ...props,
                        text: tryLine.trim(),
                        width: textMetrics.width,
                    });
                    measuredSize.lines.push({
                        width: lineWidth + textMetrics.width,
                        fragments: lineFragments,
                    });
                    measuredSize.height += lineHeight;

                    lineFragments = [];
                    lineWidth = 0;
                    remainWidth = width;
                    lastMeasuredWidth = 0;
                    currentLine = "";
                }
                else {
                    currentLine = tryLine;
                    lastMeasuredWidth = textMetrics.width;
                    remainWidth = width - lastMeasuredWidth;
                }
            }
            else if (breaker.required) {
                currentLine = currentLine.trim();
                if (currentLine.length) {
                    lineFragments.push({
                        ...props,
                        text: currentLine,
                        width: lastMeasuredWidth,
                    });
                }
                measuredSize.lines.push({
                    width: lineWidth + lastMeasuredWidth,
                    fragments: lineFragments,
                });
                measuredSize.height += lineHeight;
                lineFragments = [];
                lineWidth = 0;
                currentLine = "";
                lastMeasuredWidth = 0;
                remainWidth = width;
            }

            currentPos = breaker.pos;
        }

        currentLine = currentLine.trim();
        if (currentLine.length) {
            lineFragments.push({
                ...props,
                text: currentLine,
                width: lastMeasuredWidth,
            });
            lineWidth += lastMeasuredWidth;
            remainWidth = width - lineWidth;
        }
    });

    if (lineFragments.length) {
        measuredSize.lines.push({
            width: lineWidth,
            fragments: lineFragments,
        });
        measuredSize.height += lineHeight;
    }

    if (autoResizeWidth) {
        let max = 0;
        measuredSize.lines.forEach(l => {
            if (l.width > max) {
                max = l.width;
            }
        });
        measuredSize.width = max;
    }

    if (_cacheCount > 200) {
        _cache2 = {};
        _cacheCount = 0;
    }
    _cache2[cacheKey] = measuredSize;
    _cacheCount += 1;
    return measuredSize;
}

type Breaker = {
    pos: number;
    words: string;
    required: boolean;
}

function nextBreak(text: string, currPos: number, width: number, fontSize: number, autoResizeWidth: boolean): Breaker {
    if (!autoResizeWidth && width < fontSize) {
        return {
            pos: currPos,
            words: "",
            required: true,
        };
    }

    let nextWords: string;
    let required: boolean;
    let breakPos: number;
    let pos: number;
    let num: number;

    num = autoResizeWidth ? text.length - currPos : Math.min(text.length - currPos, Math.floor(width / fontSize));
    nextWords = text.slice(currPos, currPos + num);
    breakPos = nextWords.indexOf('\n');
    required = breakPos > -1;

    if (required) {
        nextWords = nextWords.slice(0, breakPos);
        pos = currPos + breakPos + 1;
    }
    else {
        pos = currPos + num;
    }

    return {
        pos,
        words: nextWords,
        required: required
    };
}


// export function measureText(text: string, width: number, fontFace: FontFace, fontSize: number, lineHeight: number): MeasuredSize {
//     var cacheKey = getCacheKey(text, width, fontFace, fontSize, lineHeight);
//     var cached = _cache[cacheKey];
//     if (cached) {
//         return cached;
//     }

//     var measuredSize: MeasuredSize = {} as any;
//     var textMetrics: TextMetrics;
//     var lastMeasuredWidth: number;
//     var tryLine: string;
//     var currentLine: string;

//     ctx.font = fontFace.style + ' ' + fontFace.weight + ' ' + fontSize + 'px ' + fontFace.name;
//     textMetrics = ctx.measureText(text);

//     measuredSize.width = textMetrics.width;
//     measuredSize.height = lineHeight;
//     measuredSize.lines = [];

//     if (measuredSize.width <= width) {
//         // The entire text string fits.
//         measuredSize.lines.push({ width: measuredSize.width, text: text });
//     }
//     else {
//         // Break into multiple lines.
//         measuredSize.width = width;
//         currentLine = '';

//         let breaker = new LineBreaker(text, fontSize);
//         let remainWidth = width;
//         let index = 0;
//         let words: string;

//         while (index < text.length) {
//             let res = breaker.nextBreak(remainWidth);

//             if (res.len) {
//                 words = text.slice(index, index + res.len);
//                 tryLine = currentLine + words;
//                 textMetrics = ctx.measureText(tryLine);
//                 if (textMetrics.width > width) {
//                     measuredSize.height += lineHeight;
//                     measuredSize.lines.push({
//                         width: lastMeasuredWidth,
//                         text: currentLine.trim(),
//                     });
//                     currentLine = words;
//                     lastMeasuredWidth = ctx.measureText(currentLine.trim()).width;
//                     remainWidth = width;
//                 }
//                 else {
//                     currentLine = tryLine;
//                     lastMeasuredWidth = textMetrics.width;
//                     remainWidth = width - lastMeasuredWidth;
//                 }
//             }
//             else {
//                 measuredSize.height += lineHeight;
//                 measuredSize.lines.push({
//                     width: lastMeasuredWidth,
//                     text: currentLine.trim(),
//                 });
//                 currentLine = "";
//                 lastMeasuredWidth = 0;
//                 remainWidth = width;
//             }

//             index += res.len;
//         }

//         currentLine = currentLine.trim();
//         if (currentLine.length > 0) {
//             textMetrics = ctx.measureText(currentLine);
//             measuredSize.lines.push({ width: textMetrics.width, text: currentLine });
//         }
//     }

//     _cache[cacheKey] = measuredSize;

//     return measuredSize;
// }

// class LineBreaker {

//     private position = 0;

//     constructor(public text: string, public fontSize: number) {

//     }

//     nextBreak(width: number) {
//         let len = Math.max(0, Math.floor(width / this.fontSize) - 1);
//         let pos = this.position;
//         this.position += len;
//         return {
//             len,
//         };
//     }
// }