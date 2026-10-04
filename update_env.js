const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\discord_bot';
const envPath = path.join(targetDir, '.env');

let envContent = fs.readFileSync(envPath, 'utf8');
envContent += '\nGEMINI_API_KEY=AIzaSyDmqNPEhm_wFDU_NPV_3NufguZE4xgXaWs\n';

fs.writeFileSync(envPath, envContent);
console.log('API Key injected into .env');
