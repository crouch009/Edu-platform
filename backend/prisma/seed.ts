import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Usage:
 *   npm run seed
 *   npm run seed -- --school="مدرسة النور" --email="owner@noor.com" --password="ChangeMe123!"
 *
 * Each call creates a brand new School (tenant) with its own isolated owner
 * account. Run this once per school you want to onboard onto the platform.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string, fallback: string) => {
    const found = args.find(a => a.startsWith(`--${flag}=`));
    return found ? found.split('=')[1].replace(/^"|"$/g, '') : fallback;
  };
  return {
    schoolName: get('school', 'مدرسة تجريبية'),
    email: get('email', 'owner@platform.com'),
    password: get('password', 'ChangeMe123!'),
  };
}

async function main() {
  const { schoolName, email, password } = parseArgs();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User with email ${email} already exists, skipping.`);
    return;
  }

  const school = await prisma.school.create({ data: { name: schoolName } });

  const passwordHash = await bcrypt.hash(password, 12);
  const owner = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'مالك المنصة',
      role: 'owner',
      schoolId: school.id,
    },
  });

  console.log('School + owner account created:');
  console.log(`  school: ${schoolName} (${school.id})`);
  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);
  console.log('IMPORTANT: log in, change the password, and set up 2FA immediately.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
