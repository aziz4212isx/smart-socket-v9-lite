const fs = require('fs');
let code = fs.readFileSync('D:/discord_bot/bot.js', 'utf8');

if (!code.includes("const creatingChannel = new Set();")) {
    // Inject the Set declaration above voiceStateUpdate
    code = code.replace(
        "client.on('voiceStateUpdate', async (oldState, newState) => {",
        "const creatingChannel = new Set();\nclient.on('voiceStateUpdate', async (oldState, newState) => {"
    );

    // Inject the lock checks
    code = code.replace(
        "if (newState.channel?.name === CREATE_CHANNEL_NAME) {\n          try {\n              const member = newState.member;",
        "if (newState.channel?.name === CREATE_CHANNEL_NAME) {\n          if (creatingChannel.has(newState.member.id)) return;\n          creatingChannel.add(newState.member.id);\n          try {\n              const member = newState.member;"
    );

    // Add finally block before return
    // Previous code: } catch (e) { console.error('Creator channel error:', e); }\n          return;
    code = code.replace(
        "} catch (e) { console.error('Creator channel error:', e); }\n          return;",
        "} catch (e) { console.error('Creator channel error:', e); } finally { creatingChannel.delete(newState.member.id); }\n          return;"
    );

    fs.writeFileSync('D:/discord_bot/bot.js', code, 'utf8');
    console.log('Fixed double voice channel creation');
} else {
    console.log('Lock already exists');
}
