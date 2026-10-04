const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// 1. Add require at the top
if (!code.includes("const { callAIWithMemory, resetMemory } = require('./ai_memory.js');")) {
    code = code.replace(
        "const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');",
        "const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');\nconst { callAIWithMemory, resetMemory } = require('./ai_memory.js');"
    );
}

// 2. Add /resetmemori command handler
const resetMemoriHandler = `        if (cmd === 'resetmemori') {
            const memoryId = interaction.channel?.type === ChannelType.GuildVoice || tempChannels.has(interaction.channelId) 
                ? 'room_' + interaction.channelId 
                : 'user_' + uid;
            resetMemory(memoryId);
            return interaction.reply({ content: '?? Memori AI untuk ' + (memoryId.startsWith('room_') ? 'room ini' : 'kamu') + ' telah dihapus!', flags: 64 });
        }

        if (cmd === 'tanya') {`;
code = code.replace("        if (cmd === 'tanya') {", resetMemoriHandler);

// 3. Modify /tanya logic
// OLD logic starting from: const apis = [
const oldTanyaAI = `                const apis = [
                    { type: 'gemini', key: process.env.GEMINI_API_KEY },
                    { type: 'gemini', key: process.env.GEMINI_API_KEY_2 },
                    { type: 'gemini', key: process.env.GEMINI_API_KEY_3 },
                    { type: 'groq', key: process.env.GROQ_API_KEY },
                    { type: 'openrouter', key: process.env.OPENROUTER_API_KEY }
                ].filter(a => a.key && a.key.trim() !== '');
                if (apis.length === 0) return interaction.editReply('Belum ada API Key!');

                let respText = null;
                for (const api of apis) {
                    try {
                        if (api.type === 'gemini') {
                            const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + api.key, {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error('Gemini Fail');
                            respText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        } 
                        else if (api.type === 'groq') {
                            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
                                body: JSON.stringify({ model: 'qwen/qwen3.6-27b', messages: [{ role: 'user', content: prompt }] })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error('Groq Fail');
                            respText = data.choices?.[0]?.message?.content;
                        }
                        else if (api.type === 'openrouter') {
                            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
                                body: JSON.stringify({ model: 'google/gemma-4-26b-a4b-it:free', messages: [{ role: 'user', content: prompt }] })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error('OpenRouter Fail');
                            respText = data.choices?.[0]?.message?.content;
                        }
                        if (respText) break;
                    } catch(e) {}
                }
                if (!respText) return interaction.editReply('Semua API sedang limit atau error. Coba lagi nanti!');`;

const newTanyaAI = `                const memoryId = interaction.channel?.type === ChannelType.GuildVoice || tempChannels.has(interaction.channelId) 
                    ? 'room_' + interaction.channelId 
                    : 'user_' + uid;
                const respText = await callAIWithMemory(prompt, memoryId, process.env);`;

code = code.replace(oldTanyaAI, newTanyaAI);

// 4. Modify messageCreate logic
const oldMsgAI = `            // Sistem Fallback AI
            const apis = [
                { type: 'gemini', key: process.env.GEMINI_API_KEY },
                { type: 'gemini', key: process.env.GEMINI_API_KEY_2 },
                { type: 'gemini', key: process.env.GEMINI_API_KEY_3 },
                { type: 'groq', key: process.env.GROQ_API_KEY },
                { type: 'openrouter', key: process.env.OPENROUTER_API_KEY }
            ].filter(a => a.key && a.key.trim() !== '');

            if (apis.length === 0) return message.reply('Belum ada API Key yang dikonfigurasi di .env!');

            let respText = null;
            let currentApi = null;

            for (const api of apis) {
                try {
                    currentApi = api.type;
                    if (api.type === 'gemini') {
                        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + api.key;
                        const res = await fetch(url, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                        });
                        const data = await res.json();
                        if (!res.ok) {
                            console.log('Gemini error (' + res.status + '):', data.error?.message);
                            throw new Error('Gemini API Error');
                        }
                        respText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    } 
                    else if (api.type === 'groq') {
                        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
                            body: JSON.stringify({ model: 'qwen/qwen3.6-27b', messages: [{ role: 'user', content: prompt }] })
                        });
                        const data = await res.json();
                        if (!res.ok) {
                            console.log('Groq error (' + res.status + '):', data.error?.message);
                            throw new Error('Groq API Error');
                        }
                        respText = data.choices?.[0]?.message?.content;
                    }
                    else if (api.type === 'openrouter') {
                        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
                            body: JSON.stringify({ model: 'google/gemma-4-26b-a4b-it:free', messages: [{ role: 'user', content: prompt }] })
                        });
                        const data = await res.json();
                        if (!res.ok) {
                            console.log('OpenRouter error (' + res.status + '):', data.error?.message);
                            throw new Error('OpenRouter API Error');
                        }
                        respText = data.choices?.[0]?.message?.content;
                    }
                    if (respText) break;
                } catch(e) {
                    console.error('['+currentApi+'] Gagal:', e.message);
                }
            }

            if (!respText) {
                return message.reply('Maaf, semua sistem AI sedang limit atau gangguan. Coba beberapa saat lagi.');
            }`;

const newMsgAI = `            const memoryId = message.channel?.type === ChannelType.GuildVoice || tempChannels.has(message.channelId) 
                ? 'room_' + message.channelId 
                : 'user_' + uid;
            
            let respText;
            try {
                respText = await callAIWithMemory(prompt, memoryId, process.env);
            } catch (e) {
                return message.reply('Maaf, AI gagal merespon: ' + e.message);
            }`;

code = code.replace(oldMsgAI, newMsgAI);

fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
console.log('bot.js modified successfully for AI memory support!');
