const { database } = require('../database');
const { NPC } = require('../actor');

/**
 * Use this to create new NPCs from the database.
 */
class NPCProvider
{
    /**
     * Construct a new NPC provider.
     * @param {mongodb.Db} db The Mongo database.
     */
    constructor(db)
    {
        this.collection = db.collection('npcs');
        this.activeNPCs = [];
    }

    /**
     * Create an NPC from the database with the given ID.
     * @param {string} id The ID of the NPC you want to create.
     * @returns {(Promise<NPC>|Promise<null>)} The NPC if it was found, null otherwise.
     */
    async makeById(id)
    {
        let entry = await this.collection.findOne({nameId: id});

        if (entry)
        {
            let npc = new NPC(entry.nameId, entry.name, entry.description);

            npc.dialogue   = entry.dialogueTree || {};
            npc.goodbyeMsg = entry.goodbyeMsg;
            npc.script     = entry.script;

            npc.startScript();
            this.activeNPCs.push(npc);

            return npc;
        }

        return null;
    }
}

/**
 * Initialize and export the NPC Provider.
 * @param {mongodb.Db} database The Mongo database.
 */
async function init(database)
{
    module.exports.npcProvider = new NPCProvider(database);
    return module.exports.npcProvider;
}

module.exports.init = init;