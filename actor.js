const { directions } = require('./room');
const { Connection } = require('./connection');
const EventEmitter = require('events');
const fs = require('fs');

/**
 * Represents an Actor in the game world.
 */
class Actor extends EventEmitter
{
    /**
     * Create a new Actor.
     * @param {number} id The actor's ID.
     * @param {string} name The actor's name.
     * @param {string} description The actor's description.
     */
    constructor(id, name, description)
    {
        super();

        this.id          = id;
        this.name        = name;
        this.description = description;
        this.room        = null;
    }

    /**
     * Move the Actor to the given room.
     * @param {Room} room The room to move to.
     */
    moveToRoom(room)
    {
        room.addActor(this);
    }

    /**
     * Move in a given direction.
     * @param {string} direction The direction to move in.
     * @returns {boolean} true if the Actor could move, false otherwise.
     */
    moveInDirection(direction)
    {
        if (this.room && direction in directions && direction in this.room.exits)
        {
            this.moveToRoom(this.room.exits[direction]);
            return true;
        }
        return false;
    }

    /**
     * Have the Actor say the given message.
     * @param {string} message The message to say.
     */
    say(message)
    {
        if (this.room)
        {
            this.room.broadcastExceptTo(this, `${this.name} says, "${message}"`);
        }
    }

    /**
     * Have the Actor make the given emote.
     * @param {string} message The emote's message.
     */
    emote(message)
    {
        if (this.room)
        {
            this.room.broadcast(`${this.name} ${message}`);
        }
    }
}

Actor.getMaxExp = function(level)
{
    return 99 + Math.ceil(Math.pow(level, 3));
}

/**
 * Represents a player in the game world.
 */
class Player extends Actor
{
    /**
     * Create a new Player object.
     * @param {number} id The Player's ID.
     * @param {string} username The Player's username.
     * @param {Connection} connection The Player's Connection to the server.
     */
    constructor(id, username, connection)
    {
        super(id, username, '');
        this.connection = connection;
    }
}

/**
 * Represents an NPC in the game world.
 */
class NPC extends Actor
{
    /**
     * Create a new NPC.
     * @param {number} id The NPC's ID.
     * @param {string} name The NPC's name.
     * @param {string} description The NPC's description.
     */
    constructor(id, name, description)
    {
        super(id, name, description);

        this.dialogue   = {};
        this.goodbyeMsg = '';
        this.script     = '';
    }

    /**
     * Begin running this NPC's designated script, if it has one.
     */
    startScript()
    {
        if (this.script)
        {
            fs.readFile
            (
                './scripts/' + this.script, 
                (err, contents) => {
                    if (err)
                    {
                        console.log('Failed to load script for NPC '+npc.name);
                        console.log(err);
                        return;
                    }

                    (new Function('npc', contents))(this);
                }
            );
        }
    }
}

module.exports.Actor = Actor;
module.exports.Player = Player;
module.exports.NPC = NPC;
