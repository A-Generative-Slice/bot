require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./lib/db');
const { sendMessage } = require('./lib/whatsapp');
const { generateResponse } = require('./lib/sarvam');
const Chat = require('./models/Chat');

const app = express();
app.use(bodyParser.json());

// Connect to Database
// Connect to Database
// connectDB() moved to handlers for serverless support

// Webhook Verification (GET)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400); // Invalid request
    }
});

// Webhook Event Handling (POST)
app.post('/webhook', async (req, res) => {
    try {
        await connectDB();
        const body = req.body;

        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const messageObject = body.entry[0].changes[0].value.messages[0];
                const from = messageObject.from; // User's phone number
                const text = messageObject.text ? messageObject.text.body : null;

                if (text) {
                    console.log(`Received message from ${from}: ${text}`);

                    // Find or create chat session
                    let chat = await Chat.findOne({ phoneNumber: from });
                    if (!chat) {
                        chat = new Chat({ phoneNumber: from, messages: [], language: 'en-IN', interactionState: 'IDLE' });
                    }

                    const input = text.trim();

                    // 1. Handle Reset / Menu Command
                    if (input.toLowerCase() === 'hello' || input.toLowerCase() === 'hi' || input.toLowerCase() === 'menu') {
                        chat.interactionState = 'AWAITING_LANGUAGE';
                        await chat.save();

                        const menuMsg = `🙏 Welcome to Rose Chemicals! Please select your language:\n\n1. English\n2. Tamil\n3. Hindi\n4. Malayalam\n5. Telugu\n6. Kannada\n\nReply with the number (e.g., 2).`;
                        await sendMessage(from, menuMsg);
                        res.sendStatus(200);
                        return;
                    }

                    // 2. Handle Language Selection
                    if (chat.interactionState === 'AWAITING_LANGUAGE') {
                        const langMap = {
                            '1': { code: 'en-IN', name: 'English', msg: "Welcome to Rose Chemicals! How can I help you?" },
                            '2': { code: 'ta-IN', name: 'Tamil', msg: "ரோஸ் கெமிக்கல்ஸிற்கு வரவேற்கிறோம்! நான் உங்களுக்கு எப்படி உதவ முடியும்?" },
                            '3': { code: 'hi-IN', name: 'Hindi', msg: "रोज़ केमिकल्स में आपका स्वागत है! मैं आपकी कैसे मदद कर सकता हूँ?" },
                            '4': { code: 'ml-IN', name: 'Malayalam', msg: "റോസ് കെമിക്കൽസിലേക്ക് സ്വാഗതം! എനിക്ക് നിങ്ങളെ എങ്ങനെ സഹായിക്കാനാകും?" },
                            '5': { code: 'te-IN', name: 'Telugu', msg: "రోజ్ కెమికల్స్ కి స్వాగతం! నేను మీకు ఎలా సహాయపడగలను?" },
                            '6': { code: 'kn-IN', name: 'Kannada', msg: "ರೋಸ್ ಕೆಮಿಕಲ್ಸ್‌ಗೆ ಸ್ವಾಗತ! ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ?" }
                        };

                        if (langMap[input]) {
                            chat.language = langMap[input].code;
                            chat.interactionState = 'IDLE';
                            await chat.save();
                            await sendMessage(from, langMap[input].msg);
                        } else {
                            await sendMessage(from, "Please reply with a number from 1 to 6.\n\n1. English\n2. Tamil\n3. Hindi\n4. Malayalam\n5. Telugu\n6. Kannada");
                        }
                        res.sendStatus(200);
                        return;
                    }

                    // 3. Normal AI Chat (IDLE state)
                    // Save User Message
                    chat.messages.push({ role: 'user', content: text });
                    await chat.save();

                    // Generate AI response with Language Context
                    const aiResponse = await generateResponse(text, chat.language);

                    // Send response back
                    await sendMessage(from, aiResponse);

                    // Save AI Response
                    chat.messages.push({ role: 'assistant', content: aiResponse });
                    chat.lastUpdated = new Date();
                    await chat.save();
                }
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('Webhook Error:', error);
        res.sendStatus(500);
    }
});

// Admin API to fetch chats
app.get('/api/chats', async (req, res) => {
    try {
        await connectDB();
        const chats = await Chat.find().sort({ lastUpdated: -1 });
        res.json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
