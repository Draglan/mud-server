const EventEmitter = require('events');
const { renderLine, renderText } = require('./render-text');

/**
 * The directions that Players can move:
 *  - north
 *  - east
 *  - south
 *  - west
 *  - up
 *  - down
 */
const directions =
{
    north: 'north',
    east: 'east',
    south: 'south',
    west: 'west',
    up: 'up',
    down: 'down'
};

/**
 * Represents a room in the game world.
 */
class Room extends EventEmitter
{
    /**
     * Create a new Room object.
     * @param {number} id The ID of the Room.
     * @param {string} name The name of the Room.
     * @param {string} desc The Room's description.
     */
    constructor(id, name, desc)
    {
        super();
        this.id          = id;
        this.name        = name;
        this.description = desc;
        this.actors      = [];
        this.exits       = {};
        this.objects     = [];
    }

    /**
     * Add an Actor to the room, removing them from the Room they were in
     * previously.
     * @param {Actor} actor The Actor to add to the room.
     */
    addActor(actor)
    {   
        let prevRoom = null;

        // Remember their previous Room, if any, and remove the Player
        // from their old Room.
        if (actor.room)
        {
            prevRoom = actor.room;
            actor.room.removeActor(actor, this);
        }
        
        actor.room = this;
        this.actors.push(actor);

        // Emit leave and join events.
        if (prevRoom)
            prevRoom.emit(Room.onActorLeave, {room: prevRoom, nextRoom: this, actor: actor});

        this.emit(Room.onActorEnter, {room: this, prevRoom: prevRoom, actor: actor});
    }

    /**
     * Remove the given Player from the room. Does nothing if they're not in the room.
     * @param {Player} actor The player to remove from the room.
     * @param {(Room|null)} nextRoom The Room the Player is leaving to, if any.
     */
    removeActor(actor, nextRoom = null)
    {
        let index = this.actors.findIndex(p => p === actor);

        if (index != -1)
        {
            actor.room = null;
            this.actors.splice(index, 1);

            // If the next Room isn't set, emit the player left event now.
            // Otherwise, it will be emitted when the player joins the new room
            // to maintain consistency in the state of the Player (the Player
            // shouldn't be in a null room when the event handlers are called,
            // unless the player is logging out and therefore should not be put
            // into another room).
            if (!nextRoom)
                this.emit(Room.onActorLeave, {room: this, nextRoom: nextRoom, actor: actor});
        }
    }

    /**
     * Broadcast a message to every Player in this Room.
     * @param {string} message The message to broadcast.
     */
    broadcast(message)
    {
        this.actors.forEach
        (
            a =>
            {
                if (a.connection)
                {
                    renderLine(a.connection, message);
                }
            }
        );
    }

    /**
     * Broadcast a message to every Player in this Room except for the given Player.
     * @param {Player} excludedPlayer The Player who won't receive the message.
     * @param {string} message The message to broadcast.
     */
    broadcastExceptTo(excludedPlayer, message)
    {
        this.actors.forEach
        (
            a =>
            {
                if (a.connection && a != excludedPlayer)
                {
                    renderLine(a.connection, message);
                }
            }
        );
    }
}

/**
 * Fired when an Actor enters a Room.
 * @event Room#onActorEnter
 * @type {object}
 * @property {Room} room The Room that was entered.
 * @property {(Room|null)} prevRoom The Room that was left, or null if the Actor just logged in.
 * @property {Actor} actor The Actor.
 */
Room.onActorEnter = 'actorEntered';

/**
 * Fired when an Actor leaves a Room.
 * @event Room#onActorLeave
 * @type {object}
 * @property {Room} room The Room that was left.
 * @property {(Room|null)} nextRoom The Room that the Actor is leaving for, or null if the Actor logged out.
 * @property {Actor} actor The Actor.
 */
Room.onActorLeave = 'actorLeft';

module.exports.Room = Room;
module.exports.directions = directions;