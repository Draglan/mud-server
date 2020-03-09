const { Room } = require('../room');
const { npcProvider } = require('./npc-provider');
const { gameObjectProvider } = require('./gameobject-provider');
const mongodb = require('mongodb');

class RoomProvider
{
    constructor(db)
    {
        this.collection = db.collection('rooms');
        this.rooms = {};
    }

    /**
     * Return a Room given its ID. Returns null if no such room exists.
     * @param {string} id The name ID of the Room to find.
     * @returns {(Promise<Room>|null)} The Room or null.
     */
    async findByNameId(id)
    {
        if (id in this.rooms)
        {
            // if the room has already been created, return it.
            return this.rooms[id];
        }
        else
        {
            return this.findByParameter({nameId: id});
        }
    }

    /**
     * Find a room given its ID.
     * @param {string} id The Room's ID.
     * @returns {(Promise<Room>|Promise<null>)}
     */
    async findById(id)
    {
        return this.findByParameter({_id: id});
    }

    /**
     * Find the first room in the database that has the property defined by param.
     * @param {object} param A key-value pair identifying the room to find.
     * @returns {(Promise<Room>|Promise<null>)}
     */
    async findByParameter(param)
    {
        // Find the room's entry in the database.
        let entry = await this.collection.findOne(param);

        if (entry)
        {
            // If the room is already loaded, return the loaded room.
            if (entry.nameId in this.rooms) 
            {
                return this.rooms[entry.nameId];
            }
            else
            {
                let room = new Room(entry.nameId, entry.name, entry.description);
                this.assignExitsOfRoom(room, entry.exits);
                this.assignNPCsOfRoom(room, entry.npcs);
                //this.assignObjectsOfRoom(room, entry.objects);

                this.rooms[entry.nameId] = room;
                return room;
            }
        }

        return null;
    }

    async loadAllRooms()
    {
        this.findByParameter({});
    }

    /**
     * Load the exits of a given Room and assign them to the Room.
     * @param {Room} room The Room to load the exits for.
     * @param {object} exitIds A map of direction to roomId. Ex: exitIds['north'] === '8eecbf1...';
     */
    assignExitsOfRoom(room, exitIds)
    {
        let promises = [];
        for (let direction in exitIds)
        {
            let exitId = exitIds[direction];
            promises.push(this.findByNameId(exitId).then(r => room.exits[direction] = r));
        }

        return Promise.all(promises);
    }

    /**
     * Assign objects to the given room from the database.
     * @param {Room} room The Room to load objects into.
     * @param {string[]} objectIds The array of object IDs to load from.
     */
    assignObjectsOfRoom(room, objectIds)
    {
        
    }

    async assignNPCsOfRoom(room, npcs) 
    {
        npcs.forEach
        (
            async id => 
            {
                let npc = await npcProvider.makeById(id);
                room.addActor(npc);
            }
        );
    }
}

async function init(database)
{
    module.exports.roomProvider = new RoomProvider(database);
    return module.exports.roomProvider;
}

module.exports.init = init;