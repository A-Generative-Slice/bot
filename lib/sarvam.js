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

    // OPTIMIZATION: Sort by popularity and take Top 50 to prevent Token Limit (400 Error)
    allProducts.sort((a, b) => {
        const scoreA = a.search_metadata ? a.search_metadata.popularity_score : 0;
        const scoreB = b.search_metadata ? b.search_metadata.popularity_score : 0;
        return scoreB - scoreA;
    });

    const topProducts = allProducts.slice(0, 50);

    // Create a concise context string (Compact format)
    productContext = topProducts.map(p =>
        `• ${p.name} (₹${p.mrp}): ${p.description}`
    ).join('\n');

    console.log(`Loaded ${topProducts.length} top products for AI context (Optimized).`);

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
        // NOTE: Previous logs confirmed 'Authorization: Bearer' works for this endpoint.
        const response = await axios.post('https://api.sarvam.ai/v1/chat/completions', {
            model: "sarvam-m",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            temperature: 0.3,
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
        // Fallback: Expose actual error to user for debugging
        const errorMsg = error.response && error.response.data && error.response.data.error
            ? JSON.stringify(error.response.data.error)
            : error.message;
        return `⚠️ Service Error: ${errorMsg}. Please check logs.`;
    }
};

module.exports = { generateResponse };
