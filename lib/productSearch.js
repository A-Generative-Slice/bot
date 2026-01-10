const fs = require('fs');
const path = require('path');

let productsData = {};
try {
    productsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../products.json'), 'utf8'));
} catch (error) {
    console.error('Error loading products.json:', error);
}

const searchProducts = (query, intent = 'general', limit = 5) => {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    let allProducts = [];
    
    // Flatten all products with category info
    Object.entries(productsData.categories || {}).forEach(([categoryKey, category]) => {
        if (category.products) {
            allProducts = allProducts.concat(
                category.products
                    .filter(p => p.name && p.mrp) // Only include complete products
                    .map(p => ({
                        ...p,
                        category: category.name,
                        categoryKey
                    }))
            );
        }
    });
    
    if (searchTerms.length === 0) {
        // If no search terms, return popular products based on intent
        return getProductsByIntent(intent, allProducts, limit);
    }
    
    // Enhanced scoring system
    const scoredProducts = allProducts.map(product => {
        let score = 0;
        
        const searchableFields = [
            { field: product.name, weight: 15 },
            { field: product.description, weight: 8 },
            { field: (product.keywords || []).join(' '), weight: 10 },
            { field: (product.uses || []).join(' '), weight: 6 },
            { field: (product.search_metadata?.search_terms || []).join(' '), weight: 12 }
        ];
        
        searchTerms.forEach(term => {
            searchableFields.forEach(({ field, weight }) => {
                if (field && field.toLowerCase().includes(term)) {
                    // Exact name match gets highest score
                    if (field === product.name && product.name.toLowerCase().includes(term)) {
                        score += weight * 2;
                    } else {
                        score += weight;
                    }
                }
            });
        });
        
        // Intent-based boosting
        score += getIntentBoost(intent, product);
        
        // Popularity boost
        score += (product.search_metadata?.popularity_score || 0) / 10;
        
        // Category boost for specific searches
        if (intent === 'diy_kit_inquiry' && product.categoryKey === 'diy_kits') {
            score += 25;
        }
        
        return { ...product, relevanceScore: score };
    });
    
    return scoredProducts
        .filter(p => p.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
};

const getIntentBoost = (intent, product) => {
    const intentBoosts = {
        'diy_kit_inquiry': product.categoryKey === 'diy_kits' ? 20 : 0,
        'ready_products': product.categoryKey === 'ready_to_use_chemicals' ? 15 : 0,
        'raw_materials': product.categoryKey === 'chemical_raw_materials' ? 15 : 0,
        'fragrance': (product.keywords || []).some(k => k.includes('fragrance')) ? 10 : 0
    };
    
    return intentBoosts[intent] || 0;
};

const getProductsByIntent = (intent, allProducts, limit) => {
    let filteredProducts = allProducts;
    
    switch (intent) {
        case 'diy_kit_inquiry':
            filteredProducts = allProducts.filter(p => p.categoryKey === 'diy_kits');
            break;
        case 'ready_products':
            filteredProducts = allProducts.filter(p => p.categoryKey === 'ready_to_use_chemicals');
            break;
        case 'raw_materials':
            filteredProducts = allProducts.filter(p => p.categoryKey === 'chemical_raw_materials');
            break;
        default:
            // Return popular products from all categories
            filteredProducts = allProducts.filter(p => 
                p.search_metadata?.popularity_score > 50
            );
    }
    
    return filteredProducts
        .sort((a, b) => (b.search_metadata?.popularity_score || 0) - (a.search_metadata?.popularity_score || 0))
        .slice(0, limit)
        .map(p => ({ ...p, relevanceScore: p.search_metadata?.popularity_score || 0 }));
};

const formatProductList = (products, intent, language = 'en-IN') => {
    if (products.length === 0) {
        const fallbackMessages = {
            'en-IN': "Sorry, I couldn't find any products matching your query. Please try different keywords or ask about our main categories: DIY Kits, Raw Materials, Ready-to-use products.",
            'ta-IN': "மன்னிக்கவும், உங்கள் தேடலுக்கு பொருந்தும் தயாரிப்புகள் எதுவும் கிடைக்கவில்லை. வேறு முக்கிய வார்த்தைகளை முயற்சிக்கவும்.",
            'hi-IN': "खुशी, आपकी खोज से मेल खाने वाले कोई उत्पाद नहीं मिले। कृपया अलग कीवर्ड आज़माएं।"
        };
        return fallbackMessages[language] || fallbackMessages['en-IN'];
    }
    
    let response = "";
    
    // Add context-based introduction
    if (intent === 'diy_kit_inquiry') {
        response += "🌸 *Our DIY Manufacturing Kits:*\n\n";
    } else if (intent === 'price_inquiry') {
        response += "💰 *Current Pricing:*\n\n";
    } else {
        response += `✨ *Found ${products.length} products for you:*\n\n`;
    }
    
    products.forEach((product, index) => {
        response += `${index + 1}. **${product.name}**\n`;
        response += `   💰 Price: ₹${product.mrp}`;
        
        // Add yield info for DIY kits
        if (product.yield) {
            response += ` | Makes: ${product.yield}`;
        }
        if (product.cost_per_liter) {
            response += ` | Cost/L: ₹${product.cost_per_liter}`;
        }
        
        response += `\n`;
        
        // Add description
        if (product.description) {
            response += `   📝 ${product.description.substring(0, 80)}${product.description.length > 80 ? '...' : ''}\n`;
        }
        
        // Add kit-specific info
        if (product.categoryKey === 'diy_kits') {
            if (product.manufacturing_time) {
                response += `   ⏱️ Making time: ${product.manufacturing_time}\n`;
            }
            if (product.fragrances && product.fragrances.length > 0) {
                response += `   🌸 Fragrances: ${product.fragrances.slice(0, 2).join(', ')}${product.fragrances.length > 2 ? '...' : ''}\n`;
            }
            if (product.kit_contents && product.kit_contents.length > 0) {
                response += `   📦 Includes: ${product.kit_contents.slice(0, 2).join(', ')}${product.kit_contents.length > 2 ? ' & more' : ''}\n`;
            }
        }
        
        response += `\n`;
    });
    
    // Add call-to-action based on intent
    if (intent === 'diy_kit_inquiry') {
        response += "🎯 *Each kit includes:* Complete formulation + PDF guide + Video tutorial\n";
        response += "📞 *Technical Support:* +91 8610570490";
    } else if (intent === 'price_inquiry') {
        response += "📞 *For bulk pricing:* +91 8610570490\n";
        response += "🚚 *Free delivery* on orders above ₹5000";
    } else {
        response += "💡 *Need more details?* Ask about specific products\n";
        response += "📞 *Contact:* +91 8610570490";
    }
    
    return response;
};

const getProductById = (productId) => {
    let allProducts = [];
    
    Object.values(productsData.categories || {}).forEach(category => {
        if (category.products) {
            allProducts = allProducts.concat(
                category.products.map(p => ({
                    ...p,
                    category: category.name
                }))
            );
        }
    });
    
    return allProducts.find(p => p.id === productId);
};

const getRelatedProducts = (productId, limit = 3) => {
    const product = getProductById(productId);
    
    if (!product || !product.related_products) {
        return [];
    }
    
    return product.related_products
        .map(id => getProductById(id))
        .filter(p => p) // Remove null/undefined products
        .slice(0, limit);
};

const getCategoryProducts = (categoryKey, limit = 10) => {
    const category = productsData.categories?.[categoryKey];
    
    if (!category || !category.products) {
        return [];
    }
    
    return category.products
        .filter(p => p.name && p.mrp)
        .slice(0, limit)
        .map(p => ({
            ...p,
            category: category.name,
            categoryKey
        }));
};

// Get popular products for quick suggestions
const getPopularProducts = (limit = 5) => {
    let allProducts = [];
    
    Object.entries(productsData.categories || {}).forEach(([categoryKey, category]) => {
        if (category.products) {
            allProducts = allProducts.concat(
                category.products
                    .filter(p => p.name && p.mrp)
                    .map(p => ({
                        ...p,
                        category: category.name,
                        categoryKey
                    }))
            );
        }
    });
    
    return allProducts
        .filter(p => p.search_metadata?.popularity_score > 70)
        .sort((a, b) => (b.search_metadata?.popularity_score || 0) - (a.search_metadata?.popularity_score || 0))
        .slice(0, limit);
};

module.exports = { 
    searchProducts, 
    formatProductList, 
    getProductById,
    getRelatedProducts,
    getCategoryProducts,
    getPopularProducts
};