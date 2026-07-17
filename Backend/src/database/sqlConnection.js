import prisma from "./prismaClient.js";

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL Database connected successfully!");
  } catch (err) {
    console.error("❌ PostgreSQL Database connection failed:", err);
    process.exit(1); // Exit if DB connection fails
  }
};

export default prisma;
