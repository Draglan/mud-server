const fs = require('fs');

/**
 * Represents a static object in the game world that users can look at.
 */
class GameObject
{
    /**
     * 
     * @param {number} id The object's ID.
     * @param {string} name The object's name.
     * @param {string} description The object's description when looked at.
     */
    constructor(id, name, description)
    {
        this.id          = id;
        this.name        = name;
        this.description = description;
        this.script      = '';
    }

    /**
     * If this game object has a script, start executing it.
     */
    startScript()
    {
        if (this.script)
        {
            fs.readFile
            (
                './scripts/' + this.script,
                (err, contents) =>
                {
                    if (err)
                    {
                        console.log('Error loading script for object: ' + err);
                        return;
                    }
                    
                    (new Function('gameObject', contents))(this);
                }
            );
        }
    }
}

module.exports.GameObject = GameObject;