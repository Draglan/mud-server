const { wordWrap } = require('./myTransforms');
const { Room, directions } = require('./room');
const { NPC, Player } = require('./actor');
const { searchForCommand, searchForNPC, searchForObject } = require('./search');
const { renderLine, renderText, TAB, foreground, themes, LINE_WIDTH } = require('./render-text');

/**
 * The input state for a user. Handles the parsing and response
 * to input from a user. Extended to create things like forms,
 * menus, the game world, etc.
 */
class UserState
{
    /**
     * Create a new UserState object.
     * @param {Connection} connection The Connection object used to read and write data.
     */
    constructor(connection)
    {
        this.connection = connection;
    }

    /**
     * Called when input is received from the user. This is where you would
     * parse the input and respond to it.
     * @param {string} input The user's input.
     */
    handleInput(input)
    {
    }

    /**
     * Called when the State is added to a Connection.
     */
    onStart()
    {
    }

    /**
     * Called when the State is removed from a Connection.
     */
    onEnd()
    {
    }

    /**
     * Called when the State is paused.
     */
    onPause()
    {
    }

    /**
     * Called when the State is resumed.
     */
    onResume()
    {
    }
}

/**
 * Use this to create basic forms. 
 */
class FormState extends UserState
{
    /**
     * 
     * @param {Connection} conn The Connection to use.
     * @param {FormState~onFormFinish} onFormFinish Called when the user is done filling out the form.
     */
    constructor(conn, onFormFinish = null)
    {
        super(conn);

        this.prompts       = [];
        this.currentPrompt = null;
        this.promptIndex   = 0;
        this.values        = {};
        this.onFormFinish  = onFormFinish;
        this.parentForm    = null;
        this.header        = null;
    }

    /**
     * Add an item to the form.
     * @param {string} prompt The prompt for this item.
     * @param {string} resultVariableName The name of the variable in the resulting 'values' object.
     * @param {FormState~validator} validator The validator to use on this item, or null.
     * @param {string} errorMsg The error message to use if this item is given invalid input.
     */
    addPrompt(prompt, resultVariableName, validator = null, errorMsg = '')
    {
        this.prompts.push
        (
            {
                prompt: prompt + ' ', 
                resultVariableName: resultVariableName, 
                validator: validator, 
                errorMsg: errorMsg
            }
        );
    }

    /**
     * Set the text to be displayed at the start of the form.
     * @param {string} header The text to display at the start of the form.
     */
    setHeader(header)
    {
        this.header = header;
    }

    handleInput(input)
    {
        if (this.currentPrompt)
        {
            // Update the current field.
            //

            // Validate the input.
            if (this.currentPrompt.validator && !this.currentPrompt.validator(input))
            {
                // Write the error message.
                if (this.currentPrompt.errorMsg.length > 0)
                    renderLine(this.connection, this.currentPrompt.errorMsg);
                
                // Re-send the prompt.
                renderText(this.connection, this.currentPrompt.prompt);
                return;
            }

            this.values[this.currentPrompt.resultVariableName] = input;

            // Get the next prompt.
            if (this.getNextPrompt()) 
            {
                renderText(this.connection, this.currentPrompt.prompt);
            }
            else 
            {
                this.connection.popState();
                
                if (this.onFormFinish)
                    this.onFormFinish(this);
            }
        }
        else if (this.onFormFinish)
            this.onFormFinish(this);
    }

    onStart()
    {
        this.currentPrompt = this.prompts[0] || null;
        this.promptIndex = 0;

        if (this.header)
        {
            renderText(this.connection, this.header);
            renderLine(this.connection);
        }

        if (this.currentPrompt)
            renderText(this.connection, this.currentPrompt.prompt);
    }

    getNextPrompt()
    {
        this.currentPrompt = this.prompts[++this.promptIndex] || null;
        return this.currentPrompt != null;
    }
}

/**
 * Called when a form is completed. Use form.values to get the values of the form's fields.
 * @callback FormState~onFormFinish
 * @param {FormState} form The FormState object that was completed by the user.
 */

/**
 * Called to validate a given input in the form.
 * @callback FormState~validator
 * @param {string} input The input that was given.
 */

 /**
  * The Player's interface to a Room in the game world. In other words,
  * it allows the Player to interact with a Room.
  */
class RoomState extends UserState
{
    /**
     * Create a new RoomState.
     * @param {Connection} conn The Connection to use.
     * @param {Room} room The Room that this RoomState represents.
     * @param {Player} player The Player that is interacting with the Room.
     */
    constructor(conn, room, player)
    {
        super(conn);
        this.room = room;
        this.player = player;

        // Define event handlers for the room
        //

        // Emit a message when an actor joins the room
        this.onActorEnter = (event) =>
        {
            if (event.actor != this.player)
            {
                let color = event.actor instanceof NPC ? themes.npcName : foreground.default;
                renderText(this.connection, event.actor.name, color);

                if (event.prevRoom)
                    renderLine(this.connection, ` arrived from ${event.prevRoom.name}.`);
                else
                    renderLine(this.connection, ` has arrived from the ether.`);
            }
        };

        // Emit a message when an actor leaves. If the current player is leaving this
        // room for another, handle the State transition.
        this.onActorLeave = (event) =>
        {
            if (event.actor != this.player)
            {
                let color = event.actor instanceof NPC ? themes.npcName : foreground.default;
                renderText(this.connection, event.actor.name, color);
                
                if (event.nextRoom)
                    renderLine(this.connection, ` left for ${event.nextRoom.name}.`);
                else
                    renderLine(this.connection, ` poofed out of existence.`);
            }
            else if (event.actor === this.player && event.nextRoom) // only transition if the next room is set
            {
                // Transition to the next room.
                this.player.connection.popState(); // Pop this state
                this.player.connection.pushState(new RoomState(this.player.connection, event.nextRoom, this.player));
            }
        }
    }

    onStart()
    {
        // Set up event handlers
        this.room.on(Room.onActorEnter, this.onActorEnter);
        this.room.on(Room.onActorLeave, this.onActorLeave);
        
        // Send room text to the player.
        this.renderRoom();
    }

    onEnd()
    {
        // Remove event handlers.
        this.room.off(Room.onActorEnter, this.onActorEnter);
        this.room.off(Room.onActorLeave, this.onActorLeave);
    }

    onPause()
    {
        // Pause event handlers.
        this.room.off(Room.onActorEnter, this.onActorEnter);
        this.room.off(Room.onActorLeave, this.onActorLeave);
    }

    onResume()
    {
        // Resume event handlers.
        this.room.on(Room.onActorEnter, this.onActorEnter);
        this.room.on(Room.onActorLeave, this.onActorLeave);  
    }

    handleInput(input)
    {
        let command = parseCommand(input);

        if (command.length > 0)
        {
            command[0] = command[0].toLowerCase();
            let potentials = searchForCommand(command[0]);

            if (potentials.length === 1)
            {
                command[0] = potentials[0];
                executeCommand(command, this);
            }
            else if (potentials.includes(command[0]))
            {
                executeCommand(command, this);
            }
            else
            {
                // If it's not found, show a list of search results.
                renderLine(this.connection, 'I don\'t recognize that command.');
                if (potentials.length > 0)
                {
                    renderLine(this.connection, 'Did you mean one of the following?');
                    potentials.forEach(p => renderLine(this.connection, `${TAB}${p}`));
                }
            }
        }
    }

    /**
     * Return a pretty string used to render the name of a Room.
     * @returns {string} The header string.
     */
    printRoomHeader()
    {
        let decorCount = (LINE_WIDTH - this.room.name.length - 4) / 2;

        renderText(this.connection, '[' + '='.repeat(decorCount) + ' ', foreground.blue);
        renderText(this.connection, this.room.name, themes.location);
        renderText(this.connection, ' ' + '='.repeat(decorCount) + ']', foreground.blue);
        renderLine(this.connection);
    }

    /**
     * Send the Room's text to the player.
     */
    renderRoom()
    {
        // Send Room text to the player.
        renderLine(this.connection);
        renderLine(this.connection, this.printRoomHeader());
        renderLine(this.connection);
        renderLine(this.connection, this.room.description);
        renderLine(this.connection);

        // Send player list.
        renderLine(this.connection, 'Players:');
        this.room.actors.forEach(a =>
        {
            if (a instanceof Player)
                renderLine(this.connection, `${TAB}${a.name}`);
        });

        // Send exit list.
        renderLine(this.connection, 'Exits:');
        for (let direction in this.room.exits)
        {
            renderText(this.connection, `${TAB}${direction}: `);
            renderLine(this.connection, `${this.room.exits[direction].name}`, themes.location);
        }

        // Send NPC list.
        renderLine(this.connection);
        this.room.actors.forEach(a =>
        {
            if (a instanceof NPC)
            {
                renderText(this.connection, '* ', foreground.blue);
                renderLine(this.connection, a.name, themes.npcName);
            }   
        });

        renderLine(this.connection);
    }
}

/**
 * Represents an active dialogue with an NPC.
 */
class DialogueState extends UserState
{
    /**
     * Create a new DialogueState.
     * @param {Connection} conn The connection to use.
     * @param {NPC} npc The NPC to talk to.
     */
    constructor(conn, npc)
    {
        super(conn);
        this.npc = npc;
        this.currentIndex = npc.dialogue.firstIndex || '';
    }

    // Prompt at the start
    onStart()
    {
        this.prompt();

        // Pop this state off the stack if the NPC decides
        // to leave the room in the middle of a conversation.
        if (this.npc.room)
        {
            this.npc.room.once
            (
                Room.onActorLeave, 
                args => 
                {
                    if (args.actor === this.npc)
                    {
                        if (this.npc.goodbyeMsg)
                            renderLine(this.connection, this.npc.goodbyeMsg);
                        this.connection.popState();
                    }
                }
            );
        }
    }

    handleInput(input)
    {
        let branch = this.npc.dialogue[this.currentIndex];
        if (!branch) {
            renderLine(this.connection, `${this.npc.name} is done talking.`);
            this.connection.popState();
            return;
        }

        input = parseInt(input, 10);

        // Check for invalid input
        if (Number.isNaN(input) || input >= branch.responses.length+1 || input <= 0)
        {
            renderLine(this.connection, "Please choose one of the responses.");
            return;
        }

        // Move to the next dialogue or end the conversation
        if (branch.responses[input-1].index)
        {
            this.currentIndex = branch.responses[input-1].index;
            this.prompt();
        }
        else
        {
            renderLine(this.connection, this.npc.goodbyeMsg);
            this.connection.popState();
        }
    }

    /**
     * Show the current dialogue text and a list of responses.
     */
    prompt()
    {
        let branch = this.npc.dialogue[this.currentIndex];
        if (!branch) {
            renderLine(this.connection, `${this.npc.name} doesn't want to talk.`);
            this.connection.popState();
            return;
        }

        renderLine(this.connection);
        renderLine(this.connection, `${this.npc.name}:`, themes.npcName);

        renderLine(this.connection, branch.text);
        renderLine(this.connection);

        if (branch.responses && branch.responses.length > 0)
        {
            branch.responses.forEach(
            (r, index) =>
            {
                renderLine(this.connection, `${TAB}${index+1}. ${r.text}`);
            });
        }
        else this.connection.popState();
    }
}

const executors =
{
    'look': executeLook,
    'l': executeLook,
    'north': moveNorth,
    'n': moveNorth,
    'east': moveEast,
    'e': moveEast,
    'south': moveSouth,
    's': moveSouth,
    'west': moveWest,
    'w': moveWest,
    'up': moveUp,
    'u': moveUp,
    'down': moveDown,
    'd': moveDown,
    'talk': executeTalk,
    't': executeTalk,
    'say': executeSay,
    'emote': executeEmote
};

/**
 * Execute the given command.
 * @param {string[]} command The array of arguments. The first element is the command's name.
 * @param {UserState} state The state performing the execution. That sounds dark, doesn't it?
 */
function executeCommand(command, state)
{
    if (command.length > 0 && command[0] in executors)
    {
        executors[command[0]](command, state);
    }
}

/**
 * Returns a parsed command in the form of an array,
 * where the first element is the command, and the remaining
 * elements are arguments to that command.
 * @param {string} text The command text to parse.
 * @param {boolean} singleArgument Set this to true if the command only has one argument, and thus spaces should be included in the argument. Set it to false otherwise.
 * @returns {string[]}
 */
function parseCommand(text, singleArgument = false)
{
    text = text.trim();

    const expr = /"(.*?[^\\])"|[^\s]+/gm;
    let matches = text.matchAll(expr);
    let command = [];

    for (match of matches)
    {
        // replace escaped quotes (\") with actual quotes (")
        let arg = match[1] ? match[1] : match[0];
        arg     = arg.replace(/\\"/g, '"');

        command.push(arg);
    }
    return command;
}

function executeLook(args, state)
{
    if (state.renderRoom) 
    {
        if (args.length === 1)
            state.renderRoom();
        else if (args.length > 1)
        {
            // Search for NPCs.
            let npcs = searchForNPC(args[1], state.room);
            if (npcs.length > 0) renderLine(state.connection, npcs[0].name + ': ' + npcs[0].description);

            // Search for game objects.
            let objects = searchForObject(args[1], state.room);
            if (objects.length > 0) renderLine(state.connection, objects[0].name + ': ' + objects[0].description);

            // No results found
            if (objects.length === 0 && npcs.length === 0)
            {
                renderLine(state.connection, 'You don\'t see anything that looks like that.');
            }
        }
    }
}

function moveNorth(args, state)
{
    if (state.player)
    {
        if (!state.player.moveInDirection(directions.north))
            renderLine(state.connection, 'You can\'t move in that direction.');
    }
}

function moveEast(args, state)
{
    if (state.player)
    {
        if (!state.player.moveInDirection(directions.east))
            renderLine(state.connection, 'You can\'t move in that direction.');
    }
}

function moveSouth(args, state)
{
    if (state.player)
    {
        if (!state.player.moveInDirection(directions.south))
            renderLine(state.connection, 'You can\'t move in that direction.');
    }
}

function moveWest(args, state)
{
    if (state.player)
    {
        if (!state.player.moveInDirection(directions.west))
            renderLine(state.connection, 'You can\'t move in that direction.');
    }
}

function moveUp(args, state)
{
    if (state.player)
    {
        if (!state.player.moveInDirection(directions.up))
            renderLine(state.connection, 'You can\'t move in that direction.');
    }
}

function moveDown(args, state)
{
    if (state.player)
    {
        if (!state.player.moveInDirection(directions.down))
            renderLine(state.connection, 'You can\'t move in that direction.');
    }
}

function executeTalk(args, state)
{
    if (args.length > 1)
    {
        let npcs = searchForNPC(args[1], state.room);
        if (npcs.length > 0)
        {
            let dialogue = new DialogueState(state.connection, npcs[0]);
            state.connection.pushState(dialogue);
        }
    }
}

function executeSay(args, state)
{
    // Send the message to the sending player.
    if (args.length > 1)
    {
        renderLine(state.connection, `You say, "${args[1]}".`);

        // Broadcast the message to everyone else in the room.
        state.player.say(args[1]);
    }
}

function executeEmote(args, state)
{
    if (args.length > 1)
    {
        state.player.emote(args[1]);
    }
}

module.exports.UserState     = UserState;
module.exports.FormState     = FormState;
module.exports.RoomState     = RoomState;
module.exports.DialogueState = DialogueState;