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
connectDB();

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
                        chat = new Chat({ phoneNumber: from, messages: [] });
                    }

                    // Save User Message
                    chat.messages.push({ role: 'user', content: text });
                    await chat.save();

                    // Generate AI response
                    const aiResponse = await generateResponse(text);

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
