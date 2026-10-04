const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/register_commands.js', 'utf8');

const oldTanya = `    {
        name: 'tanya',
        description: 'Tanya sesuatu ke AI',
        options: [{ name: 'pertanyaan', type: 3, description: 'Apa yang ingin kamu tanyakan?', required: true }]
    },`;

const newTanya = `    {
        name: 'tanya',
        description: 'Tanya sesuatu ke AI',
        options: [{ name: 'pertanyaan', type: 3, description: 'Apa yang ingin kamu tanyakan?', required: true }]
    },
    {
        name: 'resetmemori',
        description: 'Hapus ingatan AI tentang kamu (atau tentang room ini)'
    },`;

if (!code.includes("name: 'resetmemori'")) {
    code = code.replace(oldTanya, newTanya);
    fs.writeFileSync('D:/discord_bot/register_commands.js', code, 'utf8');
    console.log('Added /resetmemori to register_commands.js');
} else {
    console.log('/resetmemori already exists');
}
