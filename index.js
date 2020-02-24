const net = require('net');
const db = require('./database');
const accountProvider = require('./providers/account-provider');

// Create the server instance.
initialize().then
(
    _ => 
    {
        // Create the MUD server.
        //
        const server = net.createServer
        (
            socket =>
            {
                const { LoginOrRegisterForm } = require('./forms');
                const { Connection } = require('./connection');
                const { LineTransform } = require('./myTransforms');

                let input = socket.pipe(new LineTransform());
                let conn = new Connection(input, socket);
                console.log('Someone connected.');

                // Set up socket event handlers.
                socket.on('error', e => console.log('Socket error: ' + e));
                socket.on('close', _ => conn.onDisconnect());

                conn.pushState(new LoginOrRegisterForm(conn));
            }
        );
        
        server.on('error', (e) => console.log('A server error occurred + ' + e));
        server.on('close', () => console.log('Server closed.'));

        // Start the MUD server on port 3000.
        server.listen(3000, () => console.log('Server started.'));

        // Start the API server.
        const api = require('./api/api');
        api.api.listen(api.port, () => console.log('API server started.'));
    }
);

// Return a promise that initializes the database and all of the modules that depend on the database.
function initialize()
{
    // Initialize the database
    return db.init().then(
        database => 
        {
            // Initialize all of the provider modules.
            accountProvider.init(database)
                .then(_ =>
                    {
                        const roomProvider = require('./providers/room-provider');
                        return roomProvider.init(database);
                    }
                )
                .then(_ => 
                    {
                        const playerProvider = require('./providers/player-provider');
                        return playerProvider.init(database)
                    }
                )
                .then(_ => 
                    {
                        const npcProvider = require('./providers/npc-provider');
                        return npcProvider.init(database);
                    }
                )
                .then(_ => 
                    {
                        const gameObjectProvider = require('./providers/gameobject-provider');
                        return gameObjectProvider.init(database);
                    }
                )
                .then(_ =>
                    {    
                        const api = require('./api/api');
                        return api.init(database);
                    }
                )
                .catch(e => console.log(e));
        })
        .catch(e => console.log(e)
    )
}