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

const generateResponse = async (message) => {
    try {
        const systemPrompt = `
You are a helpful, polite, and expert sales assistant for "Rose Chemicals".
Your goal is to answer customer questions about our products accurately using the inventory list below.

RULES:
1. Answer ONLY based on the "Current Inventory" provided.
2. If a product is not in the list, politely say you don't have it.
3. You can converse in English, Hindi, Tamil, Telugu, or any Indian language based on the user's message.
4. Be concise and professional.
5. If asked about prices, quote the MRP from the list.

CURRENT INVENTORY:
${productContext}
        `;

        // Call Sarvam AI (using standard OpenAI-compatible structure if supported, or text completion)
        // Adjusting to a generic chat completion structure common for Sarvam/OpenAI
        const response = await axios.post('https://api.sarvam.ai/v1/chat/completions', {
            model: "sarvam-2b", // Corrected model name
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            temperature: 0.3, // Keep it factual
            max_tokens: 300
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SARVAM_API_KEY}`
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
