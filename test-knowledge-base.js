// Quick test script for knowledge base functionality
const { searchKnowledgeBase, isFAQQuery, getKnowledgeBaseResponse } = require('./lib/knowledgeBase');

console.log('🧪 Testing Knowledge Base Integration\n');

// Test 1: Search for franchise information
console.log('Test 1: Franchise Query');
console.log('Query: "How can I apply for a franchise?"');
const result1 = searchKnowledgeBase('How can I apply for a franchise?', 2);
console.log(`Found ${result1.length} results`);
if (result1.length > 0) {
    console.log(`✅ Match: ${result1[0].question}`);
    console.log(`   Answer: ${result1[0].answer.substring(0, 100)}...`);
} else {
    console.log('❌ No results found');
}
console.log('\n---\n');

// Test 2: Search for product kit information
console.log('Test 2: Product Kit Query');
console.log('Query: "What product kits do you have?"');
const result2 = searchKnowledgeBase('What product kits do you have?', 2);
console.log(`Found ${result2.length} results`);
if (result2.length > 0) {
    console.log(`✅ Match: ${result2[0].question}`);
    console.log(`   Answer: ${result2[0].answer.substring(0, 100)}...`);
} else {
    console.log('❌ No results found');
}
console.log('\n---\n');

// Test 3: Search for working hours
console.log('Test 3: Working Hours Query');
console.log('Query: "What are your working hours?"');
const result3 = searchKnowledgeBase('What are your working hours?', 2);
console.log(`Found ${result3.length} results`);
if (result3.length > 0) {
    console.log(`✅ Match: ${result3[0].question}`);
    console.log(`   Answer: ${result3[0].answer}`);
} else {
    console.log('❌ No results found');
}
console.log('\n---\n');

// Test 4: Check if query is FAQ
console.log('Test 4: FAQ Detection');
const queries = [
    'How can I order?',
    'Show me floor cleaners',
    'What is the price?',
    'Tell me about phenyl'
];

queries.forEach(query => {
    const isFAQ = isFAQQuery(query);
    console.log(`"${query}" → FAQ: ${isFAQ ? '✅ Yes' : '❌ No'}`);
});
console.log('\n---\n');

// Test 5: Direct response
console.log('Test 5: Direct Knowledge Base Response');
console.log('Query: "Do you provide training?"');
const response = getKnowledgeBaseResponse('Do you provide training?');
if (response) {
    console.log(`✅ Response: ${response}`);
} else {
    console.log('❌ No response found');
}

console.log('\n✨ Knowledge Base Test Complete!');
