const detectIntent = (message) => {
    const msg = message.toLowerCase();

    const intents = {
        'diy_kit_inquiry': [
            'kit', 'diy', 'make', 'manufacture', 'how to make', 'fabric conditioner kit',
            'liquid detergent kit', 'dish wash kit', 'floor cleaner kit', 'soap oil kit',
            'glass cleaner kit', 'toilet bowl cleaner', 'room freshener kit', 'phenyl kit',
            'manufacturing kit', 'production kit', 'formula kit'
        ],
        'price_inquiry': [
            'price', 'cost', 'rate', 'mrp', 'how much', 'kitna', 'cost per liter',
            'per litre', 'pricing', 'charges', 'amount', 'rupees', 'rupee'
        ],
        'product_details': [
            'details', 'information', 'about', 'tell me', 'specification', 'yield',
            'what is', 'describe', 'explain', 'features', 'benefits'
        ],
        'franchise': [
            'franchise', 'business', 'dealership', 'investment', 'partner', 'distributorship',
            'business opportunity', 'dealership', 'tie up', 'collaboration'
        ],
        'technical_support': [
            'how to', 'guidance', 'help', 'support', 'training', 'video', 'pdf',
            'tutorial', 'instruction', 'process', 'method', 'procedure'
        ],
        'samples': [
            'sample', 'trial', 'test', 'demo', 'try', 'testing', 'check quality'
        ],
        'fragrance': [
            'fragrance', 'perfume', 'scent', 'smell', 'aroma', 'fragrance options',
            'perfume options', 'flavour', 'variants'
        ],
        'ordering': [
            'order', 'buy', 'purchase', 'delivery', 'shipping', 'payment', 'book',
            'place order', 'want to buy', 'need to order'
        ],
        'contact': [
            'contact', 'phone', 'address', 'location', 'visit', 'call', 'reach',
            'office', 'where are you', 'contact details'
        ],
        'working_hours': [
            'working hours', 'office hours', 'timing', 'when open', 'available when',
            'office time', 'business hours'
        ],
        'greeting': [
            'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
            'namaste', 'vanakkam', 'namaskar', 'adaab'
        ],
        'ready_products': [
            'ready products', 'finished products', 'readymade', 'pre made', 'prepared products'
        ],
        'broom_inquiry': [
            'broom', 'brrom', 'brum', 'cleaning broom', 'sweep', 'sweeper', 'sweeping broom',
            'house broom', 'floor broom', 'what brooms', 'broom available', 'show broom',
            'broom types', 'broom varieties', 'delux broom', 'supriya broom', 'tulsi broom'
        ],
        'brush_inquiry': [
            'brush', 'toilet brush', 'scrub brush', 'cleaning brush', 'kitchen brush',
            'sink brush', 'what brushes', 'brush available', 'show brush', 'brushes you have'
        ],
        'mop_inquiry': [
            'mop', 'mopping', 'floor mop', 'wet mop', 'dry mop', 'what mops', 'mop available',
            'microfiber mop', 'string mop', 'show mop'
        ],
        'wiper_inquiry': [
            'wiper', 'squeegee', 'window wiper', 'glass wiper', 'floor wiper',
            'what wipers', 'wiper available', 'show wiper'
        ],
        'cleaning_tools_inquiry': [
            'cleaning tools', 'cleaning equipment', 'household tools', 'what tools',
            'cleaning accessories', 'tools available', 'show tools'
        ],
        'floor_cleaner_inquiry': [
            'floor cleaner', 'phenyl', 'mopping liquid', 'floor cleaning', 'tile cleaner',
            'surface cleaner', 'floor wash'
        ],
        'dish_cleaner_inquiry': [
            'dish wash', 'dishwash', 'utensil cleaner', 'kitchen cleaner', 'grease remover',
            'dish liquid', 'plate cleaner'
        ],
        'toilet_cleaner_inquiry': [
            'toilet cleaner', 'bathroom cleaner', 'wc cleaner', 'commode cleaner',
            'washroom cleaner', 'toilet bowl'
        ],
        'fabric_care_inquiry': [
            'fabric conditioner', 'softener', 'clothes conditioner', 'laundry softener',
            'fabric softener', 'conditioner'
        ],
        'container_inquiry': [
            'container', 'bottle', 'packaging', 'storage', 'what containers',
            'container available', 'packaging material'
        ],
        'faq_training': [
            'training', 'workshop', 'learn', 'teach', 'session', 'course',
            'hands on', 'online training', 'manufacturing video', 'pdf guide'
        ],
        'faq_delivery': [
            'delivery', 'shipping', 'dispatch', 'courier', 'transport',
            'how long', 'delivery time', 'when reach', 'tracking'
        ],
        'faq_payment': [
            'payment', 'pay', 'upi', 'bank transfer', 'payment method',
            'credit', 'advance payment', 'how to pay'
        ],
        'faq_formulation': [
            'formulation', 'formula', 'recipe', 'process sheet',
            'raw material list', 'documentation', 'customize formula'
        ],
        'faq_customization': [
            'customize', 'custom', 'personalize', 'adjust', 'modify',
            'private label', 'oem', 'white label', 'own brand'
        ],
        'faq_safety': [
            'safety', 'precaution', 'sds', 'msds', 'safety data sheet',
            'protective gear', 'safety standard', 'compliance'
        ],
        'faq_catalogue': [
            'catalogue', 'catalog', 'brochure', 'product list', 'download'
        ],
        'general': ['help', 'info', 'thanks', 'okay', 'ok', 'yes', 'no']
    };

    let intentScores = {};

    for (const [intent, keywords] of Object.entries(intents)) {
        let score = 0;
        keywords.forEach(keyword => {
            if (msg.includes(keyword)) {
                if (msg === keyword) {
                    score += 10;
                } else if (msg.split(' ').includes(keyword)) {
                    score += 5;
                } else {
                    score += 2;
                }
            }
        });

        // Boost score for specific product category questions
        if (msg.match(/what.*do.*you.*have|show.*me|available/) && score > 0) {
            score += 3;
        }

        intentScores[intent] = score;
    }

    const topIntent = Object.keys(intentScores).reduce((a, b) =>
        intentScores[a] > intentScores[b] ? a : b
    );

    return intentScores[topIntent] > 0 ? topIntent : 'general';
};

const getContextualResponse = (intent, products = []) => {
    const responses = {
        'diy_kit_inquiry': {
            prefix: "Our DIY Kits are perfect for starting your cleaning product business! Here's what we offer:",
            suffix: "\n\nEach kit includes complete formulation, ingredients, and step-by-step video guidance!\nCall +91 8610570490 for technical support"
        },
        'price_inquiry': {
            prefix: "Here are our current prices:",
            suffix: "\n\nFor bulk orders or franchise pricing, call +91 8610570490\nAll DIY kits include yield information and cost per liter"
        },
        'product_details': {
            prefix: "Here are the detailed specifications:",
            suffix: "\n\nFor technical guidance and video tutorials, call +91 8610570490"
        },
        'franchise': {
            prefix: "Rose Chemicals Franchise Opportunities:",
            suffix: "\n\nCall +91 8610570490 to discuss franchise requirements and investment details"
        },
        'general': {
            prefix: "Rose Chemicals - Your Manufacturing Partner:",
            suffix: "\n\nFor more information, call +91 8610570490"
        }
    };

    return responses[intent] || responses['general'];
};

const getQuickReplies = (intent) => {
    const quickReplies = {
        'diy_kit_inquiry': [
            'Fabric Conditioner Kit', 'Liquid Detergent Kit', 'Dish Wash Kit', 'Floor Cleaner Kit'
        ],
        'price_inquiry': [
            'DIY Kit Prices', 'Ready Product Prices', 'Franchise Investment', 'Bulk Pricing'
        ],
        'franchise': [
            'Investment Required', 'Franchise Benefits', 'Territory Rights', 'Training Program'
        ],
        'product_details': [
            'Product Features', 'How to Use', 'Ingredients', 'Shelf Life'
        ],
        'general': [
            'View Products', 'DIY Kits', 'Franchise Info', 'Contact Support'
        ]
    };

    return quickReplies[intent] || quickReplies['general'];
};

const getTrainingResponse = (intent, message) => {
    const trainingResponses = {
        'diy_kit_inquiry': {
            'fabric_conditioner': {
                price: "Rs 1100",
                yield: "20 litres",
                cost_per_liter: "Rs 55",
                fragrances: ["Moments", "Blossom", "Comfort", "Magic"]
            },
            'liquid_detergent_ultra': {
                price: "Rs 1600",
                yield: "25 litres",
                cost_per_liter: "Rs 64",
                fragrances: ["Ariel", "Surf Excel", "Aqua", "Zesty Fresh"]
            },
            'liquid_detergent_smart': {
                price: "Rs 2000",
                yield: "55 litres",
                cost_per_liter: "Rs 36"
            },
            'dish_wash_ultra': {
                price: "Rs 1200",
                yield: "20 litres",
                cost_per_liter: "Rs 60"
            },
            'dish_wash_smart': {
                price: "Rs 2000",
                yield: "55 litres",
                cost_per_liter: "Rs 36"
            }
        }
    };

    return trainingResponses[intent] || null;
};

module.exports = {
    detectIntent,
    getContextualResponse,
    getQuickReplies,
    getTrainingResponse
};