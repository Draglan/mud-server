const { FormState, RoomState } = require('./state');
const { playerProvider } = require('./providers');
const { renderLine } = require('./render-text');

class LoginOrRegisterForm extends FormState
{
    constructor(conn)
    {
        super(conn, onLoginOrRegisterFinish);
        this.setHeader('Welcome! Select an action:\n\t1. Login\n\t2. Register');
        this.addPrompt('>', 'selection', (input) => input === '1' || input === '2', 'Please select 1 or 2.');
    }
}

class LoginForm extends FormState
{
    constructor(conn)
    {
        super(conn, onLoginFormFinish);

        this.addPrompt('Username:', 'username');
        this.addPrompt('Password:', 'password');
    }
}

class RegisterForm extends FormState
{
    constructor(conn)
    {
        super(conn, onRegisterFormFinish);

        this.addPrompt('Username:', 'username');
        this.addPrompt('Password:', 'password');
        this.addPrompt('Repeat password:', 'repeatPassword');
    }
}

function onLoginOrRegisterFinish(form)
{
    if (form.values.selection === '1')
    {
        form.connection.pushState(new LoginForm(form.connection));
    }
    else
    {
        form.connection.pushState(new RegisterForm(form.connection));
    }
}

function onLoginFormFinish(form)
{
    playerProvider.authenticate(form.values.username, form.values.password, form.connection)
        .then
        (
            player =>
            {
                if (player)
                {
                    enterRoomState(player, player.room);
                }
                else
                {
                    renderLine(form.connection, 'Authentication failed.');
                    form.connection.pushState(new LoginForm(form.connection));
                }
            }
        );
}

function onRegisterFormFinish(form)
{
    if (form.values.password != form.values.repeatPassword)
    {
        form.connection.writeLine('Passwords don\'t match.');
        return;
    }

    playerProvider.newPlayer(form.values.username, form.values.password, form.connection)
    .then
    (
        player =>
        {
            if (player) enterRoomState(player, player.room);
            else
            {
                renderLine(form.connection, 'That username is already taken.');
                form.connection.pushState(new LoginOrRegisterForm(form.connection));
            }
        }
    );
}

function enterRoomState(player, room)
{
    player.connection.clearStates();
    player.connection.pushState(new RoomState(player.connection, room, player));
}

module.exports.LoginOrRegisterForm = LoginOrRegisterForm;
module.exports.LoginForm = LoginForm;