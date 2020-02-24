const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { accountProvider, accountRoles } = require('../providers/account-provider');
const app = express();
const port = 8080;

let db = null;
const secret = fs.readFileSync('./api/secret-key');

function init(database)
{
    db = database;
}

// Enable CORS.
app.use((req, res, next) => 
    {
        res.header('Access-Control-Allow-Origin', 'localhost');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();   
    }
);

app.use(bodyParser.json());

// Check for JSON syntax errors.
app.use((err, req, res, next) => 
    {
        if (err instanceof SyntaxError)
            res.status(400).json({error: "bad JSON syntax"});
        else
            next();
    }
)

/**
 * Check that the request body has all of the required parameters.
 * @param {object} body The body of the request.
 * @param {string[]} required The list of required parameters.
 */
function checkRequiredParams(body, required)
{
    let missing = [];

    if (body)
    {
        required.forEach
        (
            param => 
            {
                if (!body[param])
                {
                    missing.push(param);
                }
            }
        );
    }
    else
    {
        missing = required;
    }

    return {ok: missing.length === 0, missing: missing};
}

/**
 * Check that the request body only consists of allowed parameters.
 * @param {object} body The request body.
 * @param {string[]} allowed The list of allowed parameters.
 */
function checkAllowedParams(body, allowed)
{
    let notAllowed = [];

    if (body)
    {
        for (param in body)
        {
            if (body[param] && !allowed.find(p => p === param))
                notAllowed.push(param);
        }
    }

    return {ok: notAllowed.length === 0, notAllowed: notAllowed};
}

/**
 * Retrieve all of the entries in the given collection.
 * @param {string} collectionName The name of the collection to retrieve entries from.
 * @param {Response} res The response object.
 * @param {Function} callback Called for each entry before they are sent to the client.
 */
function getAll(collectionName, res, callback = null)
{
    let cursor = db.collection(collectionName).find({});
    cursor.toArray().then(results => 
        {
            if (callback) results.forEach(entry => callback(entry));
            res.status(200).json(results);
        }
    );
}

/**
 * Retrieve the entry with the given parameter in the given collection.
 * @param {string} collectionName The name of the collection to retrieve the entry from.
 * @param {object} filter The filter to use to find the entry.
 * @param {Response} res The response object.
 * @param {Function} callback Called before the response is sent to the client.
 */
function getByParameter(collectionName, filter, res, callback = null)
{
    db.collection(collectionName).findOne(filter)
        .then
        (
            result =>
            {
                if (result) 
                {
                    if (callback) callback(result);
                    res.status(200).json(result);
                }
                else res.sendStatus(404);
            }
        );
}

/**
 * Insert a new object into the database on request.
 * @param {string} collectionName The collection to insert into.
 * @param {Request} req The request object.
 * @param {Response} res The response object.
 * @param {string[]} required The list of required parameters.
 */
function post(collectionName, req, res, required, allowed)
{
    // Make sure the request has all of the required parameters.
    let missingParams = checkRequiredParams(req.body, required);

    if (!missingParams.ok)
        return res.status(400).json({missingParams: missingParams.missing});


    // Make sure the request only has allowed parameters.
    let notAllowed = checkAllowedParams(req.body, allowed);

    if (!notAllowed.ok)
        return res.status(400).json({paramsNotAllowed: notAllowed.notAllowed});

    // Insert the object into the collection.
    db.collection(collectionName).insertOne(req.body).then(
        result => 
        {
            res.sendStatus(200);
        }
    )
    .catch(err =>
        {
            res.status(400).json({error: err});
        }
    );
}

/**
 * Modify an existing entry in the database.
 * @param {string} collectionName The name of the collection to use.
 * @param {object} filter The filter to use to find the entry to update.
 * @param {Request} req The request object.
 * @param {Response} res The response object.
 * @param {string[]} allowed The list of parameters that the client is allowed to modify.
 */
function put(collectionName, filter, req, res, allowed)
{
    if (!req.body)
    {
        return res.status(400).json({error: "missing JSON body"});
    }

    // Check that only allowed parameters are included in the request.
    let notAllowed = checkAllowedParams(req.body, allowed);

    if (!notAllowed.ok)
        return res.status(400).json({paramsNotAllowed: notAllowed.notAllowed});

    // Update the entry, or return a 404 if the entry doesn't exist.
    db.collection(collectionName).updateOne(filter, {$set: {...req.body}})
        .then(result => 
            {
                if (result.matchedCount > 0)
                    return res.sendStatus(200);
                else
                    return res.sendStatus(404);
            }
        )
        .catch(error => 
            {
                res.status(400).json({error: error});
            }
        );
}

/**
 * Delete an entry in the database.
 * @param {string} collectionName The collection to delete from.
 * @param {object} filter The filter to use to find the entry to delete.
 * @param {Response} res The response object.
 */
function deleteEntry(collectionName, filter, res)
{
    // Delete the entry that matches the filter, or send 404 if it doesn't exist.
    db.collection(collectionName).deleteOne(filter)
        .then(result => 
            {
                if (result.deletedCount === 1)
                    res.sendStatus(200);
                else
                    res.sendStatus(404);
            }
        )
        .catch(err => 
            {
                res.status(400).json({error: err});
            }
        );
}

// Auth API
//

// Authenticate an admin for the API.
app.post('/api/auth', 
    async (req, res) => 
    {
        let missing = checkRequiredParams(req.body, ['username', 'password']);
        
        if (!missing.ok)
            return res.status(400).json({missingParams: missing.missing});

        // Authenticate the account.
        let account = await accountProvider.authenticate(req.body.username, req.body.password);
        if (!account || account.role != accountRoles.ADMIN) return res.sendStatus(403);

        // On success, respond with a JWT to authorize the client.
        jwt.sign
        (
            {}, 
            secret, 
            { algorithm: 'RS256' },
            (err, token) =>
            {
                if (err) return res.sendStatus(500);
                res.status(200).send(token);
            }
        );
    }
);

// Check for authorization.
app.use((req, res, next) => 
    {
        let token = req.header('Authorization');

        if (token) 
        {
            token = token.split(' ')[1];

            // See if the supplied token is valid.
            jwt.verify
            (
                token, 
                secret, 
                {algorithms: ['RS256']},
                (err, decoded) => 
                {
                    if (!decoded) return res.sendStatus(403);
                    if (err) return res.sendStatus(400).json(err.message);

                    req.auth = decoded;
                    next();
                }
            );
        }
        else
        {
            return res.sendStatus(403);
        }
    }
);

// Account API
//

app.get('/api/accounts', 
    (req, res) =>
    {
        getAll('accounts', res, (entry) => delete entry.password);
    }
);

app.get('/api/accounts/:username', 
    (req, res) =>
    {
        getByParameter('accounts', {username: req.params.username}, res, (entry) => delete entry.password);
    }
);

app.post('/api/accounts', 
    async (req, res) => 
    {
        let required = ['username', 'password'];
        let allowed = [...required, 'role'];

        // Check for missing parameters.
        let missing = checkRequiredParams(req.body, required);
        if (!missing.ok)
            return res.status(400).json({ missingParams: missing.missing });

        // Check for invalid parameters.
        let notAllowed = checkAllowedParams(req.body, allowed);
        if (!notAllowed.ok)
            return res.status(400).json({notAllowed: notAllowed.notAllowed});

        // Create the account.
        let account = await accountProvider.newAccount(req.body.username, req.body.password, req.body.role || accountRoles.USER);

        if (!account) 
            return res.status(400).json({error: 'Username already taken.'});
        
        res.sendStatus(200);
    }
);

app.put('/api/accounts/:username', 
    async (req, res) => 
    {
        // Check for invalid parameters.
        let allowed = ['password', 'roomId', 'role'];
        let notAllowed = checkAllowedParams(req.body, allowed);

        if (!notAllowed.ok)
            return res.status(400).json({paramsNotAllowed: notAllowed.notAllowed});

        // Check for valid role.
        if (req.body.role && !(req.body.role in accountRoles))
            return res.status(400).json({error: 'Invalid account role. Choose either USER or ADMIN.'});

        // Check that the account exists.
        let account = await accountProvider.findByUsername(req.params.username);
        if (!account) return res.sendStatus(404);

        // Change the password if requested. Then delete the password entry
        // from the request body so we don't overwrite the hash.
        if (req.body.password)
            await accountProvider.setNewPassword(account, req.body.password);

        delete req.body.password;

        // Update anything else that is requested.
        db.collection('accounts').updateOne({username: req.params.username}, {$set: req.body},
            (err, result) =>
            {
                if (err) return res.sendStatus(400).json(err);

                if (result.matchedCount === 1) res.sendStatus(200);
                else res.sendStatus(404);
            }
        );
    }
);

app.delete('/api/accounts/:username', 
    (req, res) => 
    {
        deleteEntry('accounts', {username: req.params.username}, res);
    }
);

// Room API
//

app.get('/api/rooms',
    (req, res) =>
    {
        getAll('rooms', res);
    }
);

app.get('/api/rooms/:id',
    (req, res) =>
    {
        getByParameter('rooms', {nameId: req.params.id}, res);
    }
);

app.post('/api/rooms',
    (req, res) =>
    {
        let required = ['nameId', 'name', 'description', 'exits', 'npcs', 'objects'];
        post('rooms', req, res, required, required);
    }
);

app.put('/api/rooms/:id', (req, res) => 
    {
        let allowed = ['name', 'description', 'objects', 'npcs', 'exits'];
        put('rooms', {nameId: req.params.id}, req, res, allowed);
    }
);

app.delete('/api/rooms/:id', (req, res) => 
    {
        deleteEntry('rooms', {nameId: req.params.id}, res);
    }
);

// NPC API
//

app.get('/api/npcs', (req, res) => 
    {
        getAll('npcs', res);
    }
);

app.get('/api/npcs/:id', (req, res) => 
    {
        getByParameter('npcs', {'nameId': req.params.id}, res);
    }
);

app.post('/api/npcs', (req, res) => 
    {
        let required = ['nameId', 'name', 'description'];
        let allowed = [...required, 'script', 'dialogueTree'];

        post('npcs', req, res, required, allowed);
    }
);

app.put('/api/npcs/:id', (req, res) => 
    {
        let allowed = ['name', 'description', 'script', 'dialogueTree'];
        put('npcs', {nameId: req.params.id}, req, res, allowed);
    }
);

app.delete('/api/npcs/:id', (req, res) => 
    {
        deleteEntry('npcs', {nameId: req.params.id}, res);
    }
);

module.exports.init = init;
module.exports.port = port;
module.exports.api = app;