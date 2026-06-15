import { PrismaClient } from '@prisma/client';
import { hash as argon2Hash, Algorithm } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await argon2Hash('Password123', { algorithm: Algorithm.Argon2id });

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@penwave.dev' },
    update: {},
    create: {
      email: 'admin@penwave.dev',
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
      isVerified: true,
      profile: { create: { displayName: 'Penwave Admin', bio: 'Platform administrator' } },
    },
  });

  // Demo user
  const demo = await prisma.user.upsert({
    where: { email: 'demo@penwave.dev' },
    update: {},
    create: {
      email: 'demo@penwave.dev',
      username: 'demowriter',
      passwordHash,
      isVerified: true,
      profile: { create: { displayName: 'Demo Writer', bio: 'Writing about technology and the web.' } },
    },
  });

  // Tags
  const tagData = [
    { name: 'TypeScript', slug: 'typescript' },
    { name: 'React', slug: 'react' },
    { name: 'Node.js', slug: 'nodejs' },
    { name: 'PostgreSQL', slug: 'postgresql' },
    { name: 'Web Development', slug: 'web-development' },
  ];

  const tags = await Promise.all(
    tagData.map((t) =>
      prisma.tag.upsert({ where: { slug: t.slug }, update: {}, create: t })
    )
  );

  // Sample post
  await prisma.post.upsert({
    where: { slug: 'getting-started-with-penwave' },
    update: {},
    create: {
      authorId: demo.id,
      title: 'Getting Started with Penwave',
      slug: 'getting-started-with-penwave',
      content: '<h2>Welcome to Penwave</h2><p>Penwave is a modern creator-first blogging platform built with Next.js 15, TypeScript, and PostgreSQL. This post covers the basics of getting started.</p><h2>Writing your first post</h2><p>Click the <strong>Write</strong> button in the navigation bar to open the editor. The rich text editor supports headings, lists, code blocks, images, and more.</p>',
      excerpt: 'Learn how to use Penwave — a modern blogging platform for developers and writers.',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      readingTime: 3,
      tags: { create: [{ tagId: tags[0]!.id }, { tagId: tags[4]!.id }] },
    },
  });

  console.log('✅ Seed complete');
  console.log('   Admin:  admin@penwave.dev / Password123');
  console.log('   Demo:   demo@penwave.dev  / Password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
