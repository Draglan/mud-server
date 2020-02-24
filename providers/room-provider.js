const { Room } = require('../room');
const { npcProvider } = require('./npc-provider');
const { gameObjectProvider } = require('./gameobject-provider');

class RoomProvider
{
    constructor(db)
    {
        this.collection = db.collection('rooms');
        this.rooms = {};
    }

    /**
     * Return a Room given its ID. Returns null if no such room exists.
     * @param {string} id The ID of the Room to find.
     * @returns {(Promise<Room>|null)} The Room or null.
     */
    async findById(id)
    {
        if (id in this.rooms)
        {
            // if the room has already been created, return it.
            return this.rooms[id];
        }
        else
        {
            // Otherwise, create the room from the database.
            let entry = await this.collection.findOne({nameId: id});
            if (entry)
            {
                let room = new Room(entry.nameId, entry.name, entry.description);
                this.assignExitsOfRoom(room, entry.exits);
                //this.assignNPCsOfRoom(room, entry.npcs);
                //this.assignObjectsOfRoom(room, entry.objects);

                this.rooms[entry.nameId] = room;
                return room;
            }

            return null;
        }
    }

    /**
     * Load the exits of a given Room and assign them to the Room.
     * @param {Room} room The Room to load the exits for.
     * @param {object} exitIds A map of direction to roomId. Ex: exitIds['north'] === 'someRoom';
     */
    assignExitsOfRoom(room, exitIds)
    {
        let promises = [];
        for (let direction in exitIds)
        {
            let exitId = exitIds[direction];
            promises.push(this.findById(exitId).then(r => room.exits[exitId] = r));
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

    assignNPCsOfRoom(room, npcs) 
    {
        
    }
}

async function init(database)
{
    module.exports.roomProvider = new RoomProvider(database);
    return module.exports.roomProvider;
}

module.exports.init = init;