import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { UserSignatureErrorCodes } from './userSignature.constants.js';

class UserSignatureRepository {
    async createSignature(data) {
        try {
            return await prisma.userSignature.create({
                data,
                include: {
                    user: { select: { fullName: true, email: true } },
                    agreement: { select: { title: true, version: true, type: true } }
                }
            });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new AppError('User has already signed this agreement', 409, UserSignatureErrorCodes.ALREADY_SIGNED);
            }
            throw error;
        }
    }

    async findByUserId(userId) {
        return prisma.userSignature.findMany({
            where: { userId },
            include: {
                agreement: { select: { title: true, version: true, type: true } }
            },
            orderBy: { signedAt: 'desc' }
        });
    }

    async findByAgreementId(agreementId) {
        return prisma.userSignature.findMany({
            where: { agreementId },
            include: {
                user: { select: { fullName: true, email: true } }
            },
            orderBy: { signedAt: 'desc' }
        });
    }

    async checkUserSigned(userId, agreementId) {
        const signature = await prisma.userSignature.findUnique({
            where: {
                userId_agreementId: { userId, agreementId }
            }
        });
        return !!signature;
    }

    async findById(id) {
        return prisma.userSignature.findUnique({
            where: { id },
            include: {
                user: true,
                agreement: true
            }
        });
    }
}

export default new UserSignatureRepository();
