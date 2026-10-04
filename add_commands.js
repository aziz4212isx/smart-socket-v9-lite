const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/register_commands.js', 'utf8');

const newCommands = `,
    {
        name: 'coinflip',
        description: 'Lempar koin untuk bertaruh (Heads/Tails)',
        options: [
            { name: 'taruhan', description: 'Jumlah koin yang ditaruhkan', type: 4, required: true },
            { name: 'sisi', description: 'Pilih sisi koin (heads / tails)', type: 3, required: true, choices: [ { name: 'Heads (Kepala)', value: 'heads' }, { name: 'Tails (Ekor)', value: 'tails' } ] }
        ]
    },
    {
        name: 'slots',
        description: 'Main mesin slot putar (Jackpot x10)',
        options: [
            { name: 'taruhan', description: 'Jumlah koin yang ditaruhkan', type: 4, required: true }
        ]
    }
`;

if (!code.includes('coinflip')) {
    code = code.replace(/}\n];/g, '}' + newCommands + '];');
    fs.writeFileSync('D:/discord_bot/register_commands.js', code, 'utf8');
    console.log('Added coinflip & slots to register_commands.js');
}
