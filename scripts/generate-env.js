const fs = require('fs');

const keys = [
  'ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_ORG_ID',
  'DELHIVERY_API_TOKEN', 'DELHIVERY_ENV', 'MONGODB_URI', 'FREEASTRO_API_KEY',
  'AZURE_OPENAI_API_KEY', 'ADMIN_API_KEY', 'HP_API_KEY', 'RESEND_API_KEY',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SHEET_ID'
];

const envContent = keys.map(key => {
  let val = process.env[key] || '';
  return `${key}=${JSON.stringify(val)}`;
}).join('\n');

fs.writeFileSync('.env.production', envContent);
console.log('Successfully generated .env.production');
