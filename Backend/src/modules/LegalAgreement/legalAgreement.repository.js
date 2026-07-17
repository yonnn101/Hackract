import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { LegalAgreementErrorCodes } from './legalAgreement.constants.js';

class LegalAgreementRepository {
    async createAgreement(data) {
        try {
            return await prisma.legalAgreement.create({ data });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new AppError('Agreement with this title and version already exists', 409, LegalAgreementErrorCodes.ALREADY_EXISTS);
            }
            throw error;
        }
    }

    async findAll(filters = {}) {
        const { type, isActive } = filters;
        const where = {};

        if (type) where.type = type;
        if (isActive !== undefined) where.isActive = isActive;

        return prisma.legalAgreement.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { signatures: true }
                }
            }
        });
    }

    async findById(id) {
        return prisma.legalAgreement.findUnique({
            where: { id },
            include: {
                signatures: {
                    include: {
                        user: { select: { fullName: true, email: true } }
                    }
                }
            }
        });
    }

    async findActiveByType(type) {
        return prisma.legalAgreement.findFirst({
            where: { type, isActive: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateAgreement(id, data) {
        try {
            return await prisma.legalAgreement.update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            if (error.code === 'P2025') {
                throw new AppError('Legal agreement not found', 404, LegalAgreementErrorCodes.NOT_FOUND);
            }
            throw error;
        }
    }

    async deleteAgreement(id) {
        try {
            return await prisma.legalAgreement.delete({ where: { id } });
        } catch (error) {
            if (error.code === 'P2025') {
                throw new AppError('Legal agreement not found', 404, LegalAgreementErrorCodes.NOT_FOUND);
            }
            throw error;
        }
    }
}

export default new LegalAgreementRepository();
