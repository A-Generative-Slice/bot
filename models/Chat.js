const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        index: true,
    },
    messages: [
        {
            role: {
                type: String,
                enum: ['user', 'assistant'],
                required: true,
            },
            content: {
                type: String,
                required: true,
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    lastUpdated: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Chat', chatSchema);
