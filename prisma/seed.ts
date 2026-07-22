import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@spygram.com';
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ?? 'YRW152xK2vjROkKFCqj5nedYVQYXrYgV5/xd0p9iL+g=';
const ADMIN_NAME = process.env.ADMIN_NAME ?? 'Administrador';

async function main() {
  console.log('Iniciando seed...');

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: ADMIN_NAME,
    },
  });

  console.log(`Usuário admin criado/atualizado: ${ADMIN_EMAIL}`);

  const leadCount = await prisma.lead.count();
  console.log(`Leads existentes: ${leadCount}`);

  const defaultOrigins = [
    { origin: 'http://localhost:3001', label: 'Admin local' },
    { origin: 'http://localhost:5173', label: 'Frontend Vite local' },
    { origin: 'http://localhost:5174', label: 'Frontend Vite alternativo' },
    { origin: 'http://localhost:3107', label: 'Frontend legado local' },
  ];

  for (const item of defaultOrigins) {
    await prisma.allowedOrigin.upsert({
      where: { origin: item.origin },
      update: {},
      create: { origin: item.origin, label: item.label, enabled: true },
    });
  }
  console.log(`Origens padrão liberadas: ${defaultOrigins.length}`);

  console.log('Seed concluido com sucesso.');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
