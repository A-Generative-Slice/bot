const productsData = require('../products.json');

/**
 * Search the knowledge base for relevant Q&A pairs
 * @param {string} query - User's query
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Array} - Array of matching Q&A objects
 */
const searchKnowledgeBase = (query, maxResults = 3) => {
    const queryLower = query.toLowerCase();
    const results = [];

    if (!productsData.knowledge_base) {
        return results;
    }

    const kb = productsData.knowledge_base;

    // Helper function to calculate match score
    const calculateScore = (item) => {
        let score = 0;
        const keywords = item.keywords || [];

        // Check for exact keyword matches
        keywords.forEach(keyword => {
            if (queryLower.includes(keyword.toLowerCase())) {
                score += 10;
            }
        });

        // Check if query is in question
        if (item.question && queryLower.includes(item.question.toLowerCase().substring(0, 20))) {
            score += 15;
        }

        // Add priority bonus
        score += (item.priority || 0) / 10;

        return score;
    };

    // Search all categories
    const allItems = [];

    // Add main menu
    if (kb.main_menu?.greeting) {
        allItems.push(kb.main_menu.greeting);
    }

    // Add all other categories
    ['product_kits', 'formulations', 'franchise', 'ordering_delivery_payment',
        'training_safety', 'contact_information', 'working_hours', 'general'].forEach(category => {
            if (Array.isArray(kb[category])) {
                allItems.push(...kb[category]);
            }
        });

    // Score and filter items
    const scoredItems = allItems.map(item => ({
        ...item,
        matchScore: calculateScore(item)
    })).filter(item => item.matchScore > 0);

    // Sort by score and return top results
    scoredItems.sort((a, b) => b.matchScore - a.matchScore);

    return scoredItems.slice(0, maxResults);
};

/**
 * Get knowledge base answer by category
 * @param {string} category - Category name
 * @param {string} subcategory - Optional subcategory
 * @returns {Object|null} - Knowledge base item or null
 */
const getKnowledgeByCategory = (category, subcategory = null) => {
    if (!productsData.knowledge_base) {
        return null;
    }

    const kb = productsData.knowledge_base;

    if (subcategory && kb[category]) {
        return kb[category][subcategory] || null;
    }

    return kb[category] || null;
};

/**
 * Get formatted knowledge base response
 * @param {string} query - User's query
 * @returns {string|null} - Formatted response or null
 */
const getKnowledgeBaseResponse = (query) => {
    const results = searchKnowledgeBase(query, 1);

    if (results.length === 0) {
        return null;
    }

    return results[0].answer;
};

/**
 * Check if query is FAQ-related
 * @param {string} query - User's query
 * @returns {boolean} - True if FAQ-related
 */
const isFAQQuery = (query) => {
    const faqKeywords = [
        'how', 'what', 'when', 'where', 'can i', 'do you',
        'working hours', 'contact', 'address', 'phone', 'email',
        'franchise', 'training', 'delivery', 'payment', 'order',
        'samples', 'catalogue', 'formulation', 'customiz'
    ];

    const queryLower = query.toLowerCase();
    return faqKeywords.some(keyword => queryLower.includes(keyword));
};

/**
 * Get all knowledge base entries for context
 * @returns {Array} - All knowledge base entries
 */
const getAllKnowledgeBaseEntries = () => {
    const allEntries = [];

    if (!productsData.knowledge_base) {
        return allEntries;
    }

    const kb = productsData.knowledge_base;

    // Add main menu
    if (kb.main_menu?.greeting) {
        allEntries.push(kb.main_menu.greeting);
    }

    // Add all other categories
    ['product_kits', 'formulations', 'franchise', 'ordering_delivery_payment',
        'training_safety', 'contact_information', 'working_hours', 'general'].forEach(category => {
            if (Array.isArray(kb[category])) {
                allEntries.push(...kb[category]);
            }
        });

    return allEntries;
};

module.exports = {
    searchKnowledgeBase,
    getKnowledgeByCategory,
    getKnowledgeBaseResponse,
    isFAQQuery,
    getAllKnowledgeBaseEntries
};
