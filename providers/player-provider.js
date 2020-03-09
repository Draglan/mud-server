const { Player } = require('../actor');
const { Connection } = require('../connection');
const { roomProvider } = require('./room-provider');
const { accountProvider, accountRoles } = require('./account-provider');

/**
 * Fired when a Player logs out.
 * @event Player#onLogout
 * @type {Player}
 * @param {Player} player The Player that logged out.
 */
Player.onLogout = 'playerLogout';

/**
 * Fired when a Player logs in.
 * @event Player#onLogin
 * @type {Player}
 * @param {Player} player The Player that logged in.
 */
Player.onLogin  = 'playerLogin';

class PlayerProvider
{
    constructor(db)
    {
        this.collection = db.collection('accounts');
        this.activePlayers = [];
    }

    /**
     * Attempt to authenticate a user with the given username and password.
     * @param {string} username The player's username.
     * @param {string} password The player's password.
     * @param {Connection} connection The Connection the player is using.
     * @returns {Promise<Player>} Resolves to the logged-in player on success, null otherwise.
     */
    async authenticate(username, password, connection)
    {
        // 1. Authenticate the account using the account provider.
        // 2. Log the player in using the account's info.
        //

        let entry = await accountProvider.authenticate(username, password);

        if (entry)
        {
            let player = new Player(entry._id, entry.username, connection);

            // Find their room.
            let room = await roomProvider.findByNameId(entry.roomId);

            // If the room exists, log them in; otherwise, the authentication has failed.
            if (room) this.loginPlayer(player, room);
            else      return null;

            // Authentication success.
            return player;
        }

        return null;
    }

    /**
     * Attempt to create a new user with the given username and password.
     * @param {string} username The player's username.
     * @param {string} password The player's password.
     * @param {Connection} connection The Connection the player is using to connect.
     * @returns {Promise<Player>} Return the player object created, or null if the player couldn't be created.
     */
    async newPlayer(username, password, connection)
    {
        let account = await accountProvider.newAccount(username, password, accountRoles.USER);
        if (!account) return null;

        let player = new Player(account._id, username, connection);
        let room = await roomProvider.findByNameId(account.roomId);
        if (!room) return null;

        this.loginPlayer(player, room);
        return player;
    }

    /**
     * Login a player, adding them to the given room.
     * @param {Player} player The player to log in.
     * @param {Room} room The room to add the player to.
     */
    loginPlayer(player, room)
    {
        room.addActor(player);
        this.activePlayers.push(player);
        
        // Automatically remove the player when they disconnect.
        player.connection.once(Connection.onDisconnect, () => this.logoutPlayer(player));

        player.emit(Player.onLogin, player);
        console.log(`${player.name} logged in.`);
    }

    /**
     * Logout the given player.
     * @param {Player} player The player to log out.
     */
    logoutPlayer(player)
    {
        let index = this.activePlayers.findIndex(p => p === player);

        if (index != -1)
        {
            this.savePlayer(player);

            if (player.room)
                player.room.removeActor(player);

            this.activePlayers.splice(index, 1);
            player.emit(Player.onLogout, player);

            console.log(`${player.name} logged out.`);
        }
    }

    /**
     * Check to see if a player with the given ID is currently online.
     * @param {string} uid The player's ID.
     * @returns {boolean} True if the player is online, false otherwise.
     */
    isPlayerOnline(uid)
    {
        return !!this.activePlayers.find(p => p.id === uid);
    }

    /**
     * Update the player's entry in the database with whatever relevant
     * information has changed since they logged in.
     * @param {Player} player The player to save to the database.
     */
    savePlayer(player)
    {
        // Update the user's room ID.
        this.collection.updateOne({_id: player.id}, {$set: {roomId: player.room.id}});
    }
}

/**
 * Create and export the PlayerProvider.
 */
async function init(database)
{
    module.exports.playerProvider = new PlayerProvider(database);
    return module.exports.playerProvider;
}

/**
 * Find the database entry corresponding to the given username.
 * @param {string} username The player's username.
 * @param {mongodb.collection} collection The Collection to search.
 * @returns {object} Returns the result object from the database.
 */
async function findByUsername(username, collection)
{
    return collection.findOne({username: username});
}

module.exports.init = init;