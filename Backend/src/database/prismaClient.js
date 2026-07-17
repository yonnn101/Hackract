// prisma/prismaClient.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Prevent multiple PrismaClient instances during development (hot reloads)
export const prisma =
	globalForPrisma.prisma ||
	new PrismaClient({
		log: ['query', 'info', 'warn', 'error'], // Enable detailed logging
		errorFormat: 'pretty', // Better error readability
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
