class Item
{
    constructor()
    {
        this.id = 0;
        this.name = '';
        this.attack = 0;
        this.defense = 0;
        this.spellPower = 0;
        this.spellDefense = 0;
        this.type = Item.EQUIPPABLE;
        this.equipSlot = equipSlots.none;
    }
}

Item.equipSlots = 
{
    none: 'none',
    helmet: 'helmet',
    chest: 'chest',
    legs: 'legs',
    feet: 'feet',
    weapon: 'weapon',
    offHand: 'offhand'
};

Item.MISC = 'misc';
Item.EQUIPPABLE = 'equippable';

module.exports.Item = Item;
module.exports.equipSlots = equipSlots;