const fs = require('fs');

const MEMORY_FILE = './ai_memory_data.json';
const MAX_HISTORY = 20;

function getMemory(memoryId) {
    if (!fs.existsSync(MEMORY_FILE)) return [];
    try {
        const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
        return data[memoryId] || [];
    } catch { return []; }
}

function saveMemory(memoryId, history) {
    let data = {};
    if (fs.existsSync(MEMORY_FILE)) {
        try { data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); } catch {}
    }
    if (history.length > MAX_HISTORY) history = history.slice(history.length - MAX_HISTORY);
    data[memoryId] = history;
    try { fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch {}
}

function resetMemory(memoryId) {
    let data = {};
    if (fs.existsSync(MEMORY_FILE)) {
        try { data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); } catch {}
    }
    delete data[memoryId];
    try { fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch {}
}

async function fetchWithTimeout(url, options, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function callAIWithMemory(prompt, memoryId, envParams) {
    let history = getMemory(memoryId);
    history.push({ role: 'user', content: prompt });

    const apis = [
        { type: 'gemini', key: envParams.GEMINI_API_KEY },
        { type: 'gemini', key: envParams.GEMINI_API_KEY_2 },
        { type: 'gemini', key: envParams.GEMINI_API_KEY_3 },
        { type: 'groq', key: envParams.GROQ_API_KEY },
        { type: 'openrouter', key: envParams.OPENROUTER_API_KEY }
    ].filter(a => a.key && a.key.trim() !== '');

    if (apis.length === 0) throw new Error('Belum ada API Key!');

    let respText = null;
    let tokens = 0;
    let errMessage = 'Semua API gagal merespon.';

    for (const api of apis) {
        try {
            if (api.type === 'gemini') {
                const contents = history.map(h => ({
                    role: h.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: h.content }]
                }));
                const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + api.key;
                const res = await fetchWithTimeout(url, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents })
                }, 8000); // 8 detik timeout
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || 'Gemini Error');
                respText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                tokens = data.usageMetadata?.totalTokenCount || 0;
            } 
            else if (api.type === 'groq') {
                const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
                    body: JSON.stringify({ model: 'qwen-2.5-32b', messages: history })
                }, 8000);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || 'Groq Error');
                respText = data.choices?.[0]?.message?.content;
                tokens = data.usage?.total_tokens || 0;
            }
            else if (api.type === 'openrouter') {
                const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
                    body: JSON.stringify({ model: 'google/gemma-4-26b-a4b-it:free', messages: history })
                }, 8000);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || 'OpenRouter Error');
                respText = data.choices?.[0]?.message?.content;
                tokens = data.usage?.total_tokens || 0;
            }
            if (respText) break; // Berhasil
        } catch(e) {
            errMessage = e.message;
            continue; // Coba API selanjutnya secepatnya
        }
    }
    
    if (!respText) throw new Error(errMessage);
    
    history.push({ role: 'assistant', content: respText });
    saveMemory(memoryId, history);
    
    return { text: respText, tokens, historyLength: history.length };
}

module.exports = { callAIWithMemory, resetMemory };
