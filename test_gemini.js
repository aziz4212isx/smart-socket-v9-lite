const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyDmqNPEhm_wFDU_NPV_3NufguZE4xgXaWs');

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("hello");
        console.log("Success:", result.response.text());
    } catch (error) {
        console.error("Test 1.5-flash failed:", error);
    }
}

listModels();
