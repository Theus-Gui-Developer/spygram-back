import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@spygram.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';
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
