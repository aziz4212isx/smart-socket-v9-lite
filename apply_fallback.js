const fs = require('fs');

let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

// 1. Remove GoogleGenerativeAI initialization
code = code.replace(
    /const \{ GoogleGenerativeAI \} = require\('@google\/generative-ai'\);\n*/g,
    ''
);

code = code.replace(
    /let genAI = null;\nif \(process\.env\.GEMINI_API_KEY\) genAI = new GoogleGenerativeAI\(process\.env\.GEMINI_API_KEY\);\n*/g,
    ''
);

// 2. Define universal fetch fallback for AI
const newAiBlock = `
    if (isTanyaAi || isMentioned || isAICmd) {
        await message.channel.sendTyping();
        try {
            let prompt = msg;
            if (isMentioned) prompt = msg.replace(/<@!?\\d+>/g, '').trim();
            else if (msg.startsWith('!tanya ')) prompt = msg.substring(7).trim();
            else if (msg.startsWith('!ai ')) prompt = msg.substring(4).trim();
            if (!prompt || prompt === '!tanya' || prompt === '!ai') return message.reply('Ketik pertanyaanmu! Contoh: !tanya apa itu AI?');
            
            // Cek cooldown per user (hindari spam ke API)
            const lastAI = aiCooldown.get(uid) || 0;
            if (Date.now() - lastAI < 4000) {
                return message.reply('Sabar ya! Tunggu beberapa detik sebelum bertanya lagi.');
            }
            aiCooldown.set(uid, Date.now());

            // Sistem Fallback AI
            const apis = [
                { type: 'gemini', key: process.env.GEMINI_API_KEY },
                { type: 'gemini', key: process.env.GEMINI_API_KEY_2 },
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
                        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + api.key;
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
                            body: JSON.stringify({ model: 'llama3-70b-8192', messages: [{ role: 'user', content: prompt }] })
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
                            body: JSON.stringify({ model: 'meta-llama/llama-3-8b-instruct:free', messages: [{ role: 'user', content: prompt }] })
                        });
                        const data = await res.json();
                        if (!res.ok) {
                            console.log('OpenRouter error (' + res.status + '):', data.error?.message);
                            throw new Error('OpenRouter API Error');
                        }
                        respText = data.choices?.[0]?.message?.content;
                    }

                    if (respText) break; // Berhasil!
                } catch (err) {
                    console.log(\`Fallback AI: \${api.type} gagal, mencoba selanjutnya...\`);
                    continue; // Coba API selanjutnya
                }
            }

            if (!respText) {
                return message.reply('⏳ Semua layanan AI sedang sibuk atau limit harian habis. Coba lagi beberapa menit.');
            }

            await message.reply(respText.length > 1999 ? respText.substring(0, 1995) + '...' : respText);
        } catch (e) {
            console.error(e);
            await message.reply('Otak AI saya sedang gangguan total. Coba lagi nanti!');
        }
    }
`;

// Extract everything up to "if (isTanyaAi" and replace
const startIndex = code.indexOf('if (isTanyaAi || isMentioned || isAICmd) {');
const endIndex = code.indexOf('});\n\n// ═══════════════════════════════════════════════════════\n// ERROR HANDLERS', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    code = code.substring(0, startIndex) + newAiBlock.trim() + '\n' + code.substring(endIndex);
    fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
    console.log('AI Fallback berhasil diimplementasikan!');
} else {
    console.log('Gagal menemukan blok AI!');
}
