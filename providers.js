const {npcProvider} = require('./providers/npc-provider');
const {playerProvider} = require('./providers/player-provider');
const {gameObjectProvider} = require('./providers/gameobject-provider');
const {roomProvider} = require('./providers/room-provider');


module.exports.npcProvider = npcProvider;
module.exports.playerProvider = playerProvider;
module.exports.gameObjectProvider = gameObjectProvider;
module.exports.roomProvider = roomProvider;