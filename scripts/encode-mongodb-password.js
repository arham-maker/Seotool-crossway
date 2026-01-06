/**
 * Helper script to URL-encode MongoDB password for connection string
 * Usage: node scripts/encode-mongodb-password.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('MongoDB Connection String Helper\n');
console.log('This script will help you create a properly encoded MongoDB connection string.\n');

rl.question('Enter your MongoDB username: ', (username) => {
  rl.question('Enter your MongoDB password: ', (password) => {
    rl.question('Enter your MongoDB cluster host (e.g., crosswaycluster.fupytmq.mongodb.net): ', (host) => {
      rl.question('Enter database name (default: crossway-tool): ', (dbName) => {
        const finalDbName = dbName || 'crossway-tool';
        
        // URL encode the password
        const encodedPassword = encodeURIComponent(password);
        
        // Build the connection string
        const connectionString = `mongodb+srv://${username}:${encodedPassword}@${host}/${finalDbName}?retryWrites=true&w=majority&appName=CrosswayCluster`;
        
        console.log('\n' + '='.repeat(60));
        console.log('Your MongoDB Connection String:');
        console.log('='.repeat(60));
        console.log(connectionString);
        console.log('='.repeat(60));
        console.log('\nAdd this to your .env.local file as:');
        console.log(`MONGODB_URI=${connectionString}`);
        console.log('\nPassword encoding details:');
        console.log(`Original: ${password}`);
        console.log(`Encoded:  ${encodedPassword}`);
        
        rl.close();
      });
    });
  });
});

