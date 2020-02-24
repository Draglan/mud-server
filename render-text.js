const LINE_WIDTH = 80;

const foreground =
{
    default: '\033[0m',
    black: '\033[30m',
    red: '\033[31m',
    green: '\033[32m',
    yellow: '\033[33m',
    blue: '\033[34m',
    magenta: '\033[35m',
    cyan: '\033[36m',
    white: '\033[37m',
    brightBlack: '\033[90m',
    brightRed: '\033[91m',
    brightGreen: '\033[92m',
    brightYellow: '\033[93m',
    brightBlue: '\033[94m',
    brightMagenta: '\033[95m',
    brightCyan: '\033[96m',
    brightWhite: '\033[97m'
};

const themes =
{
    location: foreground.yellow,
    npcName: foreground.brightMagenta,
    itemName: foreground.green
};

/**
 * Returns a string formatted with the given max width. Lines are
 * broken, if possible, at word boundaries rather than character boundaries.
 * @param {string} text The string to wrap.
 * @param {number} width The maximum number of characters per line.
 * @returns {string} The word-wrapped text.
 */
function wordWrap(text, width)
{
    let lineStart = 0;
    let result    = '';

    while (text.length - lineStart > 0)
    {
        // find where the line should end
        let lineEnd = lastSpaceInRange(text, lineStart, lineStart + width) + 1;

        if (lineEnd === 0 || text.length - lineStart <= width) 
            lineEnd = Math.min(lineStart + width, text.length);

        // add the new line to the result
        result += text.substring(lineStart, lineEnd);

        // Append a newline if we're not on the last line.
        if (text.length - lineStart > width)
            result += '\n';

        lineStart = lineEnd;
    }

    return result;
}

function lastSpaceInRange(text, start, end)
{
    if (end > text.length) end = text.length;

    for (let i = end - 1; i >= start; --i)
        if (text.charAt(i).search(/\s/) != -1) return i;

    return -1;
}

/**
 * Send formatted text to the client.
 * @param {string} text The text to send to the client.
 */
function renderText(connection, text, fgColor = -1)
{
    if (fgColor === -1)
        connection.write(wordWrap(text, LINE_WIDTH));
    else
        connection.write(fgColor + wordWrap(text, LINE_WIDTH) + foreground.default);
}

/**
 * Send formatted text to the client with a newline at the end.
 * @param {string} text The text to send to the client.
 */
function renderLine(connection, text = '', fgColor = -1)
{
    if (fgColor === -1)
        connection.writeLine(wordWrap(text, LINE_WIDTH));
    else
        connection.writeLine(fgColor + wordWrap(text, LINE_WIDTH) + foreground.default);
}

const TAB = '  ';

module.exports.wordWrap = wordWrap;
module.exports.renderText = renderText;
module.exports.renderLine = renderLine;
module.exports.TAB = TAB;
module.exports.foreground = foreground;
module.exports.themes = themes;
module.exports.LINE_WIDTH = LINE_WIDTH;