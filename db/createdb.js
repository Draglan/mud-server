db = connect('localhost:27017/mudserver');

// Create the Rooms collection.
db.createCollection('rooms', {
    validator: {$jsonSchema: {
        bsonType: "object",
        required: ["nameId", "name", "description", "exits", "npcs", "objects"],
        properties: {
            nameId: {
                bsonType: "string",
            },
            name: {
                bsonType: "string",
                description: "must be a string; required"
            },
            description: {
                bsonType: "string",
                description: "must be a string; required"
            },
            exits: {
                bsonType: "object",
            },
            npcs: {
                bsonType: "array",
                items: {
                    bsonType: "string"
                }
            },
            objects: {
                bsonType: "array",
                items: {
                    bsonType: "string"
                }
            }
        }
    }}
});

db.rooms.createIndex({nameId: -1}, {unique: true});

// Create the Accounts collection.
db.createCollection('accounts', {
    validator: {$jsonSchema: {
        bsonType: "object",
        required: ["username", "password", "roomId", "creationDate", "role"],
        properties: {
            username: {
                bsonType: "string"
            },
            password: {
                bsonType: "string"
            },
            roomId: {
                bsonType: "string"
            },
            creationDate: {
                bsonType: "date"
            },
            role: {
                bsonType: "string"
            }
        }
    }}
});

db.accounts.createIndex({username: -1}, {unique: true});

// Create the Objects collection.
db.createCollection('objects', {
    validator: {$jsonSchema: {
        bsonType: "object",
        required: ["nameId", "name", "description"],
        properties: {
            nameId: {
                bsonType: "string"
            },  
            name: {
                bsonType: "string"
            },
            description: {
                bsonType: "string"
            },
            script: {
                bsonType: "string"
            }
        }
    }}
});

db.objects.createIndex({nameId: -1}, {unique: true});

// Create the NPC collection.
db.createCollection('npcs', {
    validator: {$jsonSchema: {
        required: ["nameId", "name", "description"],
        properties: {
            nameId: {
                bsonType: "string"
            },
            name: {
                bsonType: "string"
            },
            description: {
                bsonType: "string"
            },
            script: {
                bsonType: "string"
            },
            dialogueTree: {
                bsonType: "object"
            }
        }        
    }}
});

db.npcs.createIndex({nameId: -1}, {unique: true});