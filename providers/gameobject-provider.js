const { GameObject } = require('../gameobject');

class GameObjectProvider
{
    constructor(db)
    {
        this.collection = db.collection('objects');
    }

    /**
     * Make a new Game Object from the database with the given ID.
     * @param {string} id The ID of the object you want to create.
     * @returns {(Promise<GameObject>|Promise<null>)} A new instance of the object if it is in the database, null otherwise.
     */
    async makeById(id)
    {
        let entry = await this.collection.findOne({nameId: id});

        if (entry)
        {
            let obj = new GameObject(entry.nameId, entry.name, entry.description);
            obj.script = entry.script;
            obj.startScript();
            return obj;
        }

        return null;
    }
}

/**
 * Initialize and export the game object provider.
 * @param {mongodb.Db} database The MongoDB database.
 */
async function init(database)
{
    module.exports.gameObjectProvider = new GameObjectProvider(database);
    return module.exports.gameObjectProvider;
}

module.exports.init = init;