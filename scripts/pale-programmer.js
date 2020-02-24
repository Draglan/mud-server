function script(npc)
{
    console.log('Pale Programmer script started.');

    //  Walk around randomly.
    function walk()
    {
        let rng = Math.floor(Math.random() * 4);

        switch (rng)
        {
            case 0: npc.moveInDirection('north'); break;
            case 1: npc.moveInDirection('east'); break;
            case 2: npc.moveInDirection('south'); break;
            case 3: npc.moveInDirection('west'); break;
        }

        setTimeout(walk, Math.floor(Math.random() * 20000));
    }

    setTimeout(walk, 5000);
}

script(npc);