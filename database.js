const { MongoClient } = require('mongodb');
const url = 'mongodb://admin:admin@localhost:27017';

let database = null;

async function init()
{
    if (!database)
    {
        return MongoClient.connect(url, {useUnifiedTopology: true}).then
        (
            db => 
            { 
                database = db.db('mudserver');
                return database;
            }
        );
    }
    else
        return database;
}

module.exports.init = init;
