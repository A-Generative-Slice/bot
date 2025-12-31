const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load Product Data Once
const productsPath = path.join(__dirname, '../products.json');
let productContext = "";

try {
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

    // Flatten products into a readable list for the AI
    let allProducts = [];
    if (productsData.categories) {
        Object.values(productsData.categories).forEach(cat => {
            if (cat.products) {
                allProducts = allProducts.concat(cat.products);
            }
        });
    }

    // Create a concise context string
    productContext = allProducts.map(p =>
        `- Name: ${p.name}\n  Price: ₹${p.mrp}\n  Description: ${p.description}\n  Uses: ${p.uses.join(', ')}`
    ).join('\n\n');

    console.log(`Loaded ${allProducts.length} products for AI context.`);
} catch (error) {
    console.error("Error loading products.json:", error);
    productContext = "No product information available currently.";
}

const generateResponse = async (message, language = 'en-IN') => {
    try {
        const langNames = {
            'en-IN': 'English', 'ta-IN': 'Tamil', 'hi-IN': 'Hindi',
            'ml-IN': 'Malayalam', 'te-IN': 'Telugu', 'kn-IN': 'Kannada'
        };
        const targetLang = langNames[language] || 'English';

        const systemPrompt = `
You are "Rose", the creative, friendly, and helpful AI assistant for "Rose Chemicals".
Your goal is to have warm, engaging conversations with customers and help them find the perfect products from our inventory.

RULES:
1. **Mood:** Be cheerful, polite, and use emojis! (e.g., 🌸, ✨, 👋).
2. **Context:** Answer ONLY based on the "Current Inventory" provided below.
3. **Language:** You MUST respond in ${targetLang} language.
4. **Accuracy:** If we don't have a product, suggest a similar one if possible, or politely apologize.
5. **Prices:** Always quote the MRP clearly (e.g., "₹170/kg").

CURRENT INVENTORY:
${productContext}
        `;

        // Call Sarvam AI
        const response = await axios.post('https://api.sarvam.ai/v1/chat/completions', {
            model: "sarvam-2b",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            temperature: 0.3,
            max_tokens: 300
        }, {
            headers: {
                'Content-Type': 'application/json',
                'api-subscription-key': process.env.SARVAM_API_KEY
            }
        });

        if (response.data && response.data.choices && response.data.choices[0]) {
            return response.data.choices[0].message.content;
        } else {
            return "I apologize, but I received an empty response from my brain.";
        }

    } catch (error) {
        console.error('Sarvam AI API Error:', error.response ? error.response.data : error.message);
        // Fallback if Sarvam is down or rate limited
        return "I am currently experiencing high traffic. Please try again in a moment.";
    }
};

module.exports = { generateResponse };
