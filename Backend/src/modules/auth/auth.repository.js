import prisma from '../../database/prismaClient.js';

class AuthRepository {
    /**
     * Clean up expired tokens (can still be kept for cleanup of any legacy data)
     */
    async cleanupExpiredTokens() {
        const now = new Date();

        const [emailTokens, resetTokens, refreshTokens] = await Promise.all([
            prisma.emailVerificationToken.deleteMany({
                where: { expiresAt: { lt: now } },
            }),
            prisma.passwordResetToken.deleteMany({
                where: { expiresAt: { lt: now } },
            }),
            prisma.refreshToken.deleteMany({
                where: { expiresAt: { lt: now } },
            }),
        ]);

        return {
            emailTokens: emailTokens.count,
            resetTokens: resetTokens.count,
            refreshTokens: refreshTokens.count,
        };
    }
}

export default new AuthRepository();
