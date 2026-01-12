const fs = require('fs');
const path = require('path');
const websiteAPI = require('./websiteAPI');

let productsData = {};
try {
    productsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../products.json'), 'utf8'));
} catch (error) {
    console.error('Error loading products.json:', error);
}

const searchProducts = async (query, intent = 'general', limit = 5) => {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    let allProducts = [];

    // Get local products (existing)
    Object.entries(productsData.categories || {}).forEach(([categoryKey, category]) => {
        if (category.products) {
            allProducts = allProducts.concat(
                category.products
                    .filter(p => p.name && p.mrp) // Only include complete products
                    .map(p => ({
                        ...p,
                        category: category.name,
                        categoryKey,
                        source: 'local'
                    }))
            );
        }
    });

    // Get website products
    try {
        let websiteProducts = [];

        if (searchTerms.length > 0) {
            // Search website for specific terms
            const websiteSearchResults = await websiteAPI.searchProducts(query);
            websiteProducts = websiteSearchResults.products || [];
        } else {
            // Get featured products for general queries
            const featuredResults = await websiteAPI.getFeaturedProducts();
            websiteProducts = featuredResults.products || [];
        }

        // Format website products to match local structure
        const formattedWebsiteProducts = websiteProducts.map(product => ({
            id: product.id || product.slug,
            name: product.name || product.title,
            mrp: extractPrice(product.price || product.mrp),
            description: product.description || product.short_description || '',
            category: product.category || 'Website Products',
            categoryKey: 'website',
            source: 'website',
            link: `${process.env.WEBSITE_URL || 'https://www.rosechemicals.in'}/products/${product.slug}`,
            image: product.image,
            keywords: product.tags || [],
            features: product.features || [],
            specifications: product.specifications || {},
            search_metadata: {
                popularity_score: product.featured ? 80 : 50,
                search_terms: [
                    product.name,
                    product.category,
                    ...(product.tags || [])
                ].filter(Boolean)
            }
        }));

        allProducts = [...allProducts, ...formattedWebsiteProducts];
    } catch (error) {
        console.error('Failed to fetch website products:', error);
        // Continue with local products only
    }

    if (searchTerms.length === 0) {
        // If no search terms, return popular products based on intent
        return getProductsByIntent(intent, allProducts, limit);
    }

    // Category-based search with intent mapping
    const categoryMappings = {
        'broom_inquiry': ['brooms'],
        'brush_inquiry': ['nouful_products', 'china_products', 'global_product_mart'],
        'mop_inquiry': ['china_products', 'global_product_mart'],
        'wiper_inquiry': ['global_product_mart'],
        'cleaning_tools_inquiry': ['nouful_products', 'global_product_mart', 'china_products'],
        'floor_cleaner_inquiry': ['ready_to_use_chemicals', 'diy_kits'],
        'dish_cleaner_inquiry': ['ready_to_use_chemicals', 'diy_kits'],
        'toilet_cleaner_inquiry': ['ready_to_use_chemicals', 'diy_kits'],
        'fabric_care_inquiry': ['ready_to_use_chemicals', 'diy_kits'],
        'container_inquiry': ['containers'],
        'diy_kit_inquiry': ['diy_kits']
    };

    let priorityProducts = [];

    // First, search by intent-specific categories
    if (intent && categoryMappings[intent]) {
        const targetCategories = categoryMappings[intent];

        Object.entries(productsData.categories || {}).forEach(([categoryKey, category]) => {
            if (targetCategories.includes(categoryKey) && category.products) {
                category.products
                    .filter(p => p.name && p.mrp)
                    .forEach(product => {
                        const score = calculateCategoryRelevanceScore(product, searchTerms, intent, categoryKey);
                        if (score > 10) {
                            priorityProducts.push({
                                ...product,
                                category: category.name,
                                categoryKey,
                                source: 'local',
                                relevanceScore: score
                            });
                        }
                    });
            }
        });
    }

    // If priority products found, use them; otherwise fallback to general search
    if (priorityProducts.length > 0) {
        return priorityProducts
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, limit);
    }

    // Enhanced scoring system
    const scoredProducts = allProducts.map(product => {
        let score = 0;

        const searchableFields = [
            { field: product.name, weight: 15 },
            { field: product.description, weight: 8 },
            { field: (product.keywords || []).join(' '), weight: 10 },
            { field: (product.uses || []).join(' '), weight: 6 },
            { field: (product.search_metadata?.search_terms || []).join(' '), weight: 12 },
            { field: product.category, weight: 7 },
            { field: (product.features || []).join(' '), weight: 5 }
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

        // Website product boost for cleaning tools
        if (product.source === 'website' && isCleaningTool(query, intent)) {
            score += 30;
        }

        return { ...product, relevanceScore: score };
    });

    return scoredProducts
        .filter(p => p.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
};

const calculateCategoryRelevanceScore = (product, searchTerms, intent, categoryKey) => {
    let score = 0;
    const productName = product.name.toLowerCase();

    // Direct name matching
    searchTerms.forEach(term => {
        if (productName.includes(term)) {
            if (productName === term) score += 100;
            else if (productName.startsWith(term)) score += 80;
            else score += 50;
        }
    });

    // Intent-category alignment bonus
    const intentCategoryBonus = {
        'broom_inquiry': { 'brooms': 50 },
        'brush_inquiry': { 'nouful_products': 30, 'china_products': 40, 'global_product_mart': 20 },
        'mop_inquiry': { 'china_products': 40, 'global_product_mart': 30 },
        'cleaning_tools_inquiry': { 'nouful_products': 25, 'global_product_mart': 25, 'china_products': 25 },
        'diy_kit_inquiry': { 'diy_kits': 50 },
        'container_inquiry': { 'containers': 50 }
    };

    if (intent && intentCategoryBonus[intent] && intentCategoryBonus[intent][categoryKey]) {
        score += intentCategoryBonus[intent][categoryKey];
    }

    // Product type specific bonuses
    if (productName.includes('delux') || productName.includes('premium')) score += 10;
    if (productName.includes('plastic')) score += 5;

    return score;
};

const isCleaningTool = (query, intent) => {
    const cleaningToolKeywords = [
        'broom', 'brush', 'mop', 'cloth', 'sponge', 'scrubber',
        'wiper', 'duster', 'cleaning tool', 'cleaning equipment'
    ];
    const lowerQuery = query.toLowerCase();
    return cleaningToolKeywords.some(keyword => lowerQuery.includes(keyword)) ||
        intent === 'cleaning_tools';
};

const extractPrice = (priceString) => {
    if (typeof priceString === 'number') return priceString;
    if (typeof priceString === 'string') {
        const match = priceString.match(/₹?(\d+(?:,\d+)*(?:\.\d{2})?)/);
        return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
    }
    return 0;
};

const getIntentBoost = (intent, product) => {
    const intentBoosts = {
        'diy_kit_inquiry': product.categoryKey === 'diy_kits' ? 20 : 0,
        'ready_products': product.categoryKey === 'ready_to_use_chemicals' ? 15 : 0,
        'raw_materials': product.categoryKey === 'chemical_raw_materials' ? 15 : 0,
        'broom_inquiry': product.categoryKey === 'brooms' ? 30 : 0,
        'fragrance': (product.keywords || []).some(k => k.includes('fragrance')) ? 10 : 0,
        'cleaning_tools': isCleaningToolProduct(product) ? 25 : 0,
        'website_products': product.source === 'website' ? 20 : 0
    };

    return intentBoosts[intent] || 0;
};

const isCleaningToolProduct = (product) => {
    const cleaningCategories = ['broom', 'brush', 'mop', 'cleaning', 'tools'];
    const productText = `${product.name} ${product.category} ${(product.keywords || []).join(' ')}`.toLowerCase();
    return cleaningCategories.some(cat => productText.includes(cat));
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
        case 'broom_inquiry':
            filteredProducts = allProducts.filter(p => p.categoryKey === 'brooms');
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
    } else if (intent === 'broom_inquiry') {
        response += "🧹 *Our Broom Collection:*\n\nWe have an extensive range of traditional and modern brooms for all your cleaning needs:\n\n";
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

// New function to get products by category from website
const getProductsByCategory = async (categoryName, limit = 10) => {
    try {
        const websiteResults = await websiteAPI.getProductsByCategory(categoryName);
        const websiteProducts = (websiteResults.products || []).map(product => ({
            id: product.id || product.slug,
            name: product.name || product.title,
            mrp: extractPrice(product.price || product.mrp),
            description: product.description || product.short_description,
            category: product.category || categoryName,
            source: 'website',
            link: `${process.env.WEBSITE_URL || 'https://www.rosechemicals.in'}/products/${product.slug}`,
            image: product.image,
            features: product.features || [],
            specifications: product.specifications || {}
        }));

        return websiteProducts.slice(0, limit);
    } catch (error) {
        console.error('Failed to get category products:', error);
        return [];
    }
};

// New function to get all website categories
const getAllCategories = async () => {
    try {
        const categoriesResult = await websiteAPI.getCategories();
        return categoriesResult.categories || [];
    } catch (error) {
        console.error('Failed to get categories:', error);
        return [];
    }
};

module.exports = {
    searchProducts,
    formatProductList,
    getProductById,
    getRelatedProducts,
    getCategoryProducts,
    getPopularProducts,
    getProductsByCategory,
    getAllCategories
};