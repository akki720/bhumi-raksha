require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const User = require('../models/User');

const seedAccounts = [
  {
    name: 'Demo User',
    username: 'demouser',
    email: 'user@bhumi.com',
    password: 'Bhumi@123',
    phone: '9876543210',
    role: 'user',
    authorityApproved: true,
  },
  {
    name: 'Authority Officer',
    username: 'authority1',
    email: 'authority@bhumi.com',
    password: 'Bhumi@456',
    phone: '9876543211',
    role: 'authority',
    authorityApproved: true,
  },
  {
    name: 'System Admin',
    username: 'admin',
    email: 'admin@bhumi.com',
    password: 'Bhumi@789',
    phone: '9876543212',
    role: 'admin',
    authorityApproved: true,
  },
];

async function run() {
  await connectDB();

  for (const account of seedAccounts) {
    const existing = await User.findOne({ email: account.email.toLowerCase() });

    if (existing) {
      existing.name = account.name;
      existing.username = account.username;
      existing.phone = account.phone;
      existing.role = account.role;
      existing.authorityApproved = account.authorityApproved;
      existing.password = account.password;
      await existing.save();
      console.log(`Updated existing ${account.role}: ${account.email}`);
    } else {
      await User.create(account);
      console.log(`Created new ${account.role}: ${account.email}`);
    }
  }

  console.log('Auth seed complete.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Auth seed failed:', err);
  process.exit(1);
});
