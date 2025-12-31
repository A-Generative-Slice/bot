const axios = require('axios');

const sendMessage = async (to, text) => {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                text: { body: text },
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error('WhatsApp Send Message Error:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = { sendMessage };
