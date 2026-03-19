import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'
const dbPath = dbUrl.replace(/^file:/, '')
const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath)
const adapter = new PrismaBetterSqlite3({ url: resolvedPath })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Default family members
  await prisma.familyMember.upsert({
    where: { id: 'member-1' },
    update: {},
    create: {
      id: 'member-1',
      name: 'Mom',
      color: '#ec4899',
      emoji: '👩',
      role: 'adult',
    },
  })
  await prisma.familyMember.upsert({
    where: { id: 'member-2' },
    update: {},
    create: {
      id: 'member-2',
      name: 'Dad',
      color: '#3b82f6',
      emoji: '👨',
      role: 'adult',
    },
  })
  await prisma.familyMember.upsert({
    where: { id: 'member-3' },
    update: {},
    create: {
      id: 'member-3',
      name: 'Kid',
      color: '#10b981',
      emoji: '🧒',
      role: 'child',
    },
  })
  console.log('Seeded family members')

  // Add default schedules for existing members
  const members = await prisma.familyMember.findMany()
  for (const member of members) {
    const isAdult = member.role === 'adult'
    // Mon-Fri schedules
    for (let dow = 1; dow <= 5; dow++) {
      await prisma.schedule.upsert({
        where: { id: `schedule-${member.id}-${dow}` },
        update: {},
        create: {
          id: `schedule-${member.id}-${dow}`,
          memberId: member.id,
          dayOfWeek: dow,
          startTime: isAdult ? '09:00' : '08:00',
          endTime: isAdult ? '17:00' : '15:00',
          label: isAdult ? 'Work' : 'School',
          type: isAdult ? 'work' : 'school',
        },
      })
    }
  }
  console.log('Seeded default schedules')
}

main().catch(console.error).finally(() => prisma.$disconnect())
