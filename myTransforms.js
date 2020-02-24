const { Transform } = require('stream');

class LineTransform extends Transform
{
    constructor(options)
    {
        super(options);
        this._line = '';
    }

    _transform(chunk, enc, callback)
    {
        chunk = chunk.toString();
        const nlIndex = chunk.indexOf('\r\n');

        if (nlIndex != -1)
        {
            this.push(this._line + chunk.substring(0, nlIndex));
            this._line = chunk.substring(nlIndex + 2);
        }
        else
        {
            this._line += chunk;
        }

        callback();
    }
}

module.exports.LineTransform = LineTransform;