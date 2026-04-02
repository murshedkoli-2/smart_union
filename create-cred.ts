import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const { default: User } = await import('./src/models/User');
  const { hashPassword } = await import('./src/lib/auth/password');

  const pwd = await hashPassword('password123');

  // Entrepreneur
  const ent = await User.findOne({ email: 'entrepreneur@smartunion.gov.bd' });
  if (!ent) {
    await User.create({
      name: 'Demo Entrepreneur',
      email: 'entrepreneur@smartunion.gov.bd',
      password: pwd,
      role: 'entrepreneur',
      status: 'active',
      permissions: ['citizen.view', 'citizen.create', 'certificate.view', 'certificate.create'],
    });
    console.log('Created Entrepreneur');
  } else {
    console.log('Entrepreneur already exists');
  }

  // Citizen
  const cit = await User.findOne({ email: 'citizen@smartunion.gov.bd' });
  if (!cit) {
    await User.create({
      name: 'Demo Citizen',
      email: 'citizen@smartunion.gov.bd',
      password: pwd,
      role: 'citizen',
      status: 'active',
    });
    console.log('Created Citizen');
  } else {
    console.log('Citizen already exists');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
