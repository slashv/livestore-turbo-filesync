/* eslint-disable prefer-template, no-var */
// Maestro uses Rhino JS which has limited ES6 support
// Generate a unique user for this test run
var timestamp = new Date().getTime()
var email = 'e2e-mobile-' + timestamp + '@test.local'
var password = 'password123'
var name = 'E2E Mobile Test User'

var API_URL = 'http://localhost:8787'

// Register the new user
var response = http.post(API_URL + '/api/register', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: email,
    password: password,
    name: name,
  }),
})

console.log('Registration response status: ' + response.status)
console.log('Created test user: ' + email)

// Export credentials for use in the flow
output.testUser = {
  email: email,
  password: password,
}
