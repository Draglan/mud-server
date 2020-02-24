const EventEmitter = require('events');

/**
 * Represents a user's connection. Can be used to write strings to the
 * user, and manages the client's states using a stack.
 */
class Connection extends EventEmitter
{
    /**
     * Construct a new Connection object.
     * @param {stream.Readable} inputStream The stream from which this Connection will read.
     * @param {stream.Writable} outputStream The stream to which this Connection will write.
     */
    constructor(inputStream, outputStream)
    {
        super();
        
        this.input = inputStream;
        this.output = outputStream;
        this.states = new Array();
        this.connected = true;
    }

    /**
     * Write some text to the connection.
     * @param {string} text The text to write to the connection.
     */
    write(text)
    {
        if (this.connected)
            this.output.write(text);
    }

    /**
     * Write some text and a newline to the connection.
     * @param {string} text The text to write to the connection.
     */
    writeLine(text = '')
    {
        if (this.connected)
            this.output.write(text + '\r\n');
    }

    /**
     * Push a state onto the Connection's state stack. The new state
     * will handle input from the Connection. The previous state will be
     * paused.
     * @param {UserState} state The state to push.
     */
    pushState(state)
    {
        this.input.removeAllListeners('data');
        this.input.on('data', (data) => state.handleInput(data.toString()));

        // Pause the current state.
        if (this.states.length > 0)
            this.currentState().onPause();

        this.states.push(state);
        state.onStart();
    }

    /**
     * Pop the current top state off of the state stack. The new top state will
     * be resumed, if there is one.
     * @returns {(UserState|null)} The state that was popped, or null if the stack is empty.
     */
    popState()
    {
        if (this.states.length === 0) return null;
        
        this.input.removeAllListeners('data');
        let result = this.states.pop();

        if (this.states.length > 0)
        {  
            this.input.on('data', (data) => this.currentState().handleInput(data.toString()));
            this.currentState().onResume();
        }

        result.onEnd();
        return result;
    }

    /**
     * Return the Connection's current user state.
     * @returns {(UserState|null)} The state on top of the state stack, or null if the stack is empty.
     */
    currentState()
    {
        return this.states.length > 0 
            ? this.states[this.states.length-1] 
            : null;
    }

    /**
     * Clear all user states from this Connection.
     */
    clearStates()
    {
        this.input.removeAllListeners('data');
        this.states = new Array();
    }

    /**
     * Called when the Connection ends.
     */
    onDisconnect()
    {
        this.connected = false;
        this.clearStates();
        this.emit(Connection.onDisconnect);
    }
}

/**
 * Fired by a Connection object when the connection ends.
 * @event Connection#onDisconnect
 * @type {void}
 */
Connection.onDisconnect = 'disconnect';

module.exports.Connection = Connection;