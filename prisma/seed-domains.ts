import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultOrigins = [
  { origin: 'http://localhost:3001', label: 'Admin local' },
  { origin: 'http://localhost:5173', label: 'Frontend Vite local' },
  { origin: 'http://localhost:5174', label: 'Frontend Vite alternativo' },
  { origin: 'http://localhost:3107', label: 'Frontend legado local' },
];

async function main() {
  console.log('Iniciando seed de domínios...');

  for (const item of defaultOrigins) {
    await prisma.allowedOrigin.upsert({
      where: { origin: item.origin },
      update: {},
      create: { origin: item.origin, label: item.label, enabled: true },
    });
  }

  console.log(`Domínios padrão liberados: ${defaultOrigins.length}`);
  console.log('Seed de domínios concluido com sucesso.');
}

main()
  .catch((e) => {
    console.error('Erro no seed de domínios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
