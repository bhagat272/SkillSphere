import { connectDatabase, disconnectDatabase } from '../config/database';
import { User, UserRole } from '../models/User';
import { logger } from '../config/logger';

const demoUsers = [
  {
    email: 'candidate@skillsphere.dev',
    password: 'Password123!',
    role: 'user' as UserRole,
    profile: {
      firstName: 'Sumit',
      lastName: 'Candidate',
      headline: 'Associate Software Engineer | React Native + MERN',
      bio: 'Full-stack developer focused on React Native, React.js, Node.js, Express.js, MongoDB, Redux, Socket.io, Stripe, Firebase, and REST APIs.',
      location: 'India',
      socialLinks: {},
    },
    skills: [
      { name: 'React Native', level: 'expert', endorsed: 12 },
      { name: 'React.js', level: 'expert', endorsed: 18 },
      { name: 'Node.js', level: 'intermediate', endorsed: 10 },
      { name: 'MongoDB', level: 'intermediate', endorsed: 8 },
      { name: 'Socket.io', level: 'intermediate', endorsed: 6 },
    ],
  },
  {
    email: 'recruiter@skillsphere.dev',
    password: 'Password123!',
    role: 'recruiter' as UserRole,
    profile: {
      firstName: 'Riya',
      lastName: 'Recruiter',
      headline: 'Technical Recruiter hiring MERN engineers',
      bio: 'Recruiter account for testing job posting, candidate dashboards, and application tracking.',
      location: 'Remote',
      socialLinks: {},
    },
    skills: [{ name: 'Hiring', level: 'expert', endorsed: 5 }],
  },
  {
    email: 'admin@skillsphere.dev',
    password: 'Password123!',
    role: 'admin' as UserRole,
    profile: {
      firstName: 'Aarav',
      lastName: 'Admin',
      headline: 'Platform Administrator',
      bio: 'Admin account for analytics, moderation, and user management testing.',
      location: 'Remote',
      socialLinks: {},
    },
    skills: [{ name: 'Platform Operations', level: 'expert', endorsed: 9 }],
  },
];

async function seedDemoUsers() {
  await connectDatabase();

  for (const demoUser of demoUsers) {
    const existing = await User.findOne({ email: demoUser.email }).select('+password');

    if (existing) {
      existing.password = demoUser.password;
      existing.role = demoUser.role;
      existing.profile = demoUser.profile;
      existing.skills = demoUser.skills as any;
      existing.isEmailVerified = true;
      existing.isActive = true;
      existing.refreshTokens = [];
      await existing.save();
      logger.info(`Updated demo user: ${demoUser.email}`);
      continue;
    }

    await User.create({
      ...demoUser,
      isEmailVerified: true,
      isActive: true,
      isPremium: demoUser.role === 'admin',
      subscriptionTier: demoUser.role === 'admin' ? 'pro' : 'free',
    });
    logger.info(`Created demo user: ${demoUser.email}`);
  }

  await disconnectDatabase();
}

seedDemoUsers()
  .then(() => {
    logger.info('Demo users seeded successfully.');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Failed to seed demo users:', error);
    process.exit(1);
  });
