// Debug script to understand fetch mocking
const fetch = require('node-fetch');

console.log('Testing fetch mock behavior');

// Test 1: What happens when we call json() on a mock
const mockResponse = {
  ok: true,
  json: () => ({ signed_url: 'test_url' })
};

console.log('mockResponse:', mockResponse);
console.log('mockResponse.json:', mockResponse.json);
console.log('typeof mockResponse.json:', typeof mockResponse.json);
console.log('mockResponse.json():', mockResponse.json());

// Test 2: What happens when we call json() that returns a promise
const mockResponse2 = {
  ok: true,
  json: () => Promise.resolve({ signed_url: 'test_url' })
};

console.log('\nmockResponse2:', mockResponse2);
console.log('mockResponse2.json():', mockResponse2.json());
console.log('await mockResponse2.json():', await mockResponse2.json());