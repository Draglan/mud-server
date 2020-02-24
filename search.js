const { NPC } = require('./actor');

/**
 * All of the available commands in the game.
 */
const commandList =
[
    'look',  'l',
    'north', 'n',
    'south', 's',
    'east',  'e',
    'west',  'w',
    'up',    'u',
    'down',  'd',
    'talk',  't',
    'say',
    'emote'
];

/**
 * Used to search a set of strings using a potentially incomplete search term.
 */
class Trie
{
    /**
     * Make a new Trie.
     */
    constructor()
    {
        this.root = new Node();
    }

    /**
     * Insert the given string into the Trie.
     * @param {string} key The string to insert.
     * @param {object} value The object you wish to store at the key.
     */
    insert(key, value = null)
    {
        this.root.insert(key, value);
    }

    /**
     * Add all of the strings in the given array into the Trie.
     * @param {(object)} values An object containing the key/value pairs to add to the Trie.
     */
    insertAll(values)
    {
        Object.keys(values).forEach
        (
            key =>
            {
                this.root.insert(key, values[key]);
            }
        );
    }

    /**
     * Get a list of strings that match or partially match the supplied
     * search term, or an empty list if no matches are found.
     * @param {string} term The search term to use. Leave blank if you want all of the strings in the Trie.
     * @returns {any[]} The list of search results.
     */
    search(term = '')
    {
        let results = [];
        let node = this.root.search(term);

        if (node)
            node.getEntriesOfNode(results);

        return results;
    }
}

/**
 * A Node in a Trie.
 */
class Node
{
    /**
     * Create a new Trie node.
     * @param {string} key The string represented by the current position in the Trie.
     */
    constructor(key = '')
    {
        this.children   = {};
        this.key        = key;
        this.value      = null;
        this.isComplete = false;
    }

    /**
     * Insert a string or part of a string into the Trie, starting with this node.
     * @param {string} key The string to insert.
     * @param {number} startIndex The position of the string to get the next character from.
     */
    insert(key, value = null, startIndex = 0)
    {
        if (key.length - startIndex > 0)
        {
            let ch = key.charAt(startIndex++);

            if (this.children[ch])
                this.children[ch].insert(key, value, startIndex);
            else
            {
                this.children[ch] = new Node(key.substring(0, startIndex));
                this.children[ch].insert(key, value, startIndex);
            }
        }
        else
        {
            this.isComplete = true;
            this.value = value;
        }
    }

    /**
     * Return the Node that most closely matches the given string.
     * @param {string} str The search term.
     * @param {number} startIndex The position of the string to get the next character from.
     * @returns {Node} The Node that most closely matches the given string.
     */
    search(str, startIndex = 0)
    {
        if (str.length - startIndex <= 0) return this;
        let ch = str.charAt(startIndex++);

        if (ch in this.children)
            return this.children[ch].search(str, startIndex);
        else
            return null;
    }

    /**
     * Starting from this node, recursively get all of the complete entries
     * in the tree from this node downward.
     * @param {string[]} results The current set of results.
     */
    getEntriesOfNode(results)
    {
        if (this.isComplete) results.push(this.value);

        for (let ch in this.children)
            this.children[ch].getEntriesOfNode(results);
    }
}

// Create a trie for searching the command list.
let commandsSearch = new Trie();
commandList.forEach(c => commandsSearch.insert(c, c));

/**
 * Returns any number of commands that match or partially match the
 * text of the provided command. For example, 'd' might return ['dig', 'down'].
 * @param {string} command The command to search for.
 */
function searchForCommand(command)
{
    return commandsSearch.search(command);
}

/**
 * Search for an NPC in the given Room.
 * @param {string} term The search term to use.
 * @param {Room} room The Room to search.
 */
function searchForNPC(term, room)
{
    term = term.trim();
    term = term.toLowerCase();

    let results = [];

    // Get the NPCs in the room.
    let npcs = room.actors.filter(a => a instanceof NPC);
    npcs.forEach(n => 
    {
        if (n.name.toLowerCase().includes(term))
            results.push(n);
    });

    // Nobody is in the room, so return the empty list.
    return results;
}

/**
 * Search for a GameObject in the given Room.
 * @param {string} term The search term to use.
 * @param {Room} room The Room to search.
 */
function searchForObject(term, room)
{
    term = term.trim();
    term = term.toLowerCase();

    let results = [];

    room.objects.forEach
    (   o => 
        {
            if (o.name.toLowerCase().includes(term))
                results.push(o);
        }
    );

    return results;
}

module.exports.Trie             = Trie;
module.exports.searchForCommand = searchForCommand;
module.exports.searchForNPC     = searchForNPC;
module.exports.searchForObject  = searchForObject;