const bcrypt = require('bcrypt');

async function init(database)
{
    module.exports.accountProvider = new AccountProvider(database);
    return module.exports.accountProvider;
}

/**
 * The different types of accounts.
 * @readonly
 * @enum {string}
 */
const accountRoles =
{
    USER: 'USER',
    ADMIN: 'ADMIN'
};

/**
 * Use this to authenticate, retrieve, create, and modify
 * user accounts. To create a Player object that represents
 * an in-game player, @see Player
 */
class AccountProvider
{
    constructor(db)
    {
        this.collection = db.collection('accounts');
    }

    /**
     * Attempt to authenticate using the given username and password. On success,
     * returns the account's entry in the database. On failure, returns null.
     * @param {string} username The account's username.
     * @param {string} password The account's password.
     * @returns {(Promise<object>|Promise<null>)} The account on success, null on failure.
     */
    async authenticate(username, password)
    {
        let account = await this.collection.findOne({username: username});
        if (!account) return null;

        let valid = await comparePassword(password, account.password);
        if (!valid) return null;

        return account;
    }

    /**
     * Attempt to create a new account. Only works if the username isn't taken.
     * @param {string} username The new account's username.
     * @param {string} password The new account's password.
     * @param {string} role The account's role. @see accountRoles
     * @returns {(Promise<object>|Promise<null>)} The account on success, null on failure.
     */
    async newAccount(username, password, role)
    {
        // Enforce a valid role.
        if (!(role in accountRoles)) return null;
        
        // Make sure username isn't taken.
        let userTaken = await this.isUsernameTaken(username);
        if (userTaken) return null;

        // Create the account.
        let account =
        {
            username: username,
            password: await passwordHash(password),
            creationDate: new Date(),
            role: role,
            roomId: 'start'
        };

        return this.collection.insertOne(account).then
        (
            result => 
            {
                if (result.insertedCount === 1)
                    return {_id: result.insertedId, ...result.ops[0]}
                else 
                    return null;
            }
        );
    }

    /**
     * Check if the given username is in use.
     * @param {string} username The username.
     * @returns {Promise<boolean>} True if the username is taken, false otherwise.
     */
    async isUsernameTaken(username)
    {
        let account = await this.collection.findOne({username: username});
        return !!account;
    }

    /**
     * Return the account entry corresponding to the given username, or null if
     * no such account exists.
     * @param {string} username The account's username.
     * @returns {(Promise<object>|Promise<null>)} The account entry on success, null on failure.
     */
    async findByUsername(username)
    {
        return this.collection.findOne({username: username});
    }

    /**
     * Set a new password for the given account.
     * @param {object} account The account object.
     * @param {string} newPassword The new password.
     */
    async setNewPassword(account, newPassword)
    {
        let hash = await passwordHash(newPassword);
        return this.collection.updateOne({username: account.username}, {$set: {password: hash}});
    }

    /**
     * Change the given account's username.
     * @param {object} account The account object.
     * @param {string} newUsername The new username.
     * @returns {Promise<boolean>} True on success, false if the username was already taken.
     */
    async setNewUsername(account, newUsername)
    {
        let isTaken = await this.isUsernameTaken(newUsername);
        if (isTaken) return false;

        let result = await this.collection.updateOne({username: account.username}, {$set: {username: newUsername}});
        return result.modifiedCount === 1;
    }
}

/**
 * Hash the given password and return the hex-encoded result as a string.
 * @param {string} password The password to hash.
 * @returns {Promise<string>} The resulting hash string.
 */
async function passwordHash(password) 
{
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a password and a hash to see if they match each other.
 * @param {string} password The plaintext password.
 * @param {string} hash The hash to compare the plaintext password against.
 */
async function comparePassword(password, hash)
{
    return bcrypt.compare(password, hash);
}

module.exports.passwordHash = passwordHash;
module.exports.comparePassword = comparePassword;
module.exports.accountRoles = accountRoles;
module.exports.init = init;