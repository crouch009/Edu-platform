import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Usage:
 *   npm run seed
 *   npm run seed -- --school="مدرسة النور" --email="owner@noor.com" --password="ChangeMe123!"
 *   npm run seed -- --demo=false   (skip creating demo teacher/students/exam data)
 *
 * Each call creates a brand new School (tenant) with its own isolated owner
 * account. Run this once per school you want to onboard onto the platform.
 * By default it also seeds a demo teacher, a few students, a sample exam,
 * and a result, so the dashboards aren't empty on first login.
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
    seedDemo: get('demo', 'true') !== 'false',
  };
}

async function main() {
  const { schoolName, email, password, seedDemo } = parseArgs();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User with email ${email} already exists, skipping.`);
    return;
  }

  const school = await prisma.school.create({ data: { name: schoolName } });

  const ownerPasswordHash = await bcrypt.hash(password, 12);
  const owner = await prisma.user.create({
    data: {
      email,
      passwordHash: ownerPasswordHash,
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

  if (!seedDemo) {
    console.log('Skipping demo data (--demo=false).');
    return;
  }

  // ---------- Demo teacher ----------
  const teacherPasswordHash = await bcrypt.hash('Teacher123!', 12);
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@demo.com',
      passwordHash: teacherPasswordHash,
      name: 'أ. سارة أحمد',
      role: 'teacher',
      schoolId: school.id,
      stages: ['ابتدائي', 'إعدادي'],
    },
  });

  // ---------- Demo parent ----------
  const parentPasswordHash = await bcrypt.hash('Parent123!', 12);
  const parent = await prisma.user.create({
    data: {
      email: 'parent@demo.com',
      passwordHash: parentPasswordHash,
      name: 'ولي أمر تجريبي',
      role: 'parent',
      schoolId: school.id,
    },
  });

  // ---------- Demo students ----------
  const studentPasswordHash = await bcrypt.hash('Student123!', 12);
  const student1 = await prisma.student.create({
    data: {
      name: 'يوسف كريم',
      grade: 'الصف الخامس',
      className: 'فصل أ',
      schoolId: school.id,
      teacherId: teacher.id,
      parentId: parent.id,
      loginEmail: 'student1@demo.com',
      passwordHash: studentPasswordHash,
    },
  });
  const student2 = await prisma.student.create({
    data: {
      name: 'مريم علي',
      grade: 'الصف الخامس',
      className: 'فصل أ',
      schoolId: school.id,
      teacherId: teacher.id,
      loginEmail: 'student2@demo.com',
      passwordHash: studentPasswordHash,
    },
  });
  const student3 = await prisma.student.create({
    data: {
      name: 'أحمد محمود',
      grade: 'الصف الخامس',
      className: 'فصل ب',
      schoolId: school.id,
      teacherId: teacher.id,
    },
  });

  // ---------- Demo subject, curriculum, questions, exam, result ----------
  const subject = await prisma.subject.create({
    data: { name: 'العلوم', teacherId: teacher.id, schoolId: school.id },
  });

  const curriculum = await prisma.curriculum.create({
    data: {
      title: 'الوحدة الأولى - الكائنات الحية',
      text: 'الكائنات الحية تحتاج إلى الماء والغذاء والهواء لتعيش وتنمو. تنقسم الكائنات الحية إلى نباتات وحيوانات. النباتات تصنع غذاءها بنفسها عن طريق عملية التمثيل الضوئي.',
      teacherId: teacher.id,
      schoolId: school.id,
    },
  });

  const q1 = await prisma.question.create({
    data: {
      type: 'mcq',
      text: 'ما هي العملية التي تصنع بها النباتات غذاءها؟',
      options: ['التنفس', 'التمثيل الضوئي', 'الهضم', 'الإخراج'],
      correctAnswer: 'التمثيل الضوئي',
      curriculumId: curriculum.id,
      teacherId: teacher.id,
      schoolId: school.id,
    },
  });
  const q2 = await prisma.question.create({
    data: {
      type: 'truefalse',
      text: 'الكائنات الحية تحتاج إلى الماء لتعيش',
      correctAnswer: 'صح',
      curriculumId: curriculum.id,
      teacherId: teacher.id,
      schoolId: school.id,
    },
  });
  const q3 = await prisma.question.create({
    data: {
      type: 'short',
      text: 'اذكر نوعين من الكائنات الحية',
      correctAnswer: 'نباتات وحيوانات',
      curriculumId: curriculum.id,
      teacherId: teacher.id,
      schoolId: school.id,
    },
  });

  const exam = await prisma.exam.create({
    data: {
      title: 'امتحان الوحدة الأولى - العلوم',
      duration: 20,
      teacherId: teacher.id,
      schoolId: school.id,
      questions: { connect: [{ id: q1.id }, { id: q2.id }, { id: q3.id }] },
    },
  });

  await prisma.examResult.create({
    data: {
      examId: exam.id,
      studentId: student1.id,
      answers: [
        { questionId: q1.id, answer: 'التمثيل الضوئي' },
        { questionId: q2.id, answer: 'صح' },
        { questionId: q3.id, answer: 'نباتات وحيوانات' },
      ],
      score: 3,
      total: 3,
      percent: 100,
    },
  });

  // ---------- Demo grade entry ----------
  const assessment = await prisma.assessment.create({
    data: {
      title: 'اختبار قصير - الوحدة الأولى',
      type: 'quiz',
      maxScore: 10,
      date: new Date(),
      subjectId: subject.id,
      teacherId: teacher.id,
      schoolId: school.id,
    },
  });
  await prisma.grade.create({
    data: { assessmentId: assessment.id, studentId: student1.id, score: 9, feedback: 'أداء ممتاز' },
  });
  await prisma.grade.create({
    data: { assessmentId: assessment.id, studentId: student2.id, score: 7 },
  });

  console.log('');
  console.log('Demo data created:');
  console.log('  Teacher login: teacher@demo.com / Teacher123!');
  console.log('  Parent login:  parent@demo.com / Parent123!');
  console.log('  Student logins (exam portal, at /student/login):');
  console.log('    student1@demo.com / Student123! (has a completed exam result + grade)');
  console.log('    student2@demo.com / Student123!');
  console.log('  A 3rd student ("أحمد محمود") has no login yet - useful for testing the "set credentials" flow.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
