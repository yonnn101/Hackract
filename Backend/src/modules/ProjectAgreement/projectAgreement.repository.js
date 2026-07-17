import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { ProjectAgreementErrorCodes } from './projectAgreement.constants.js';

class ProjectAgreementRepository {
    async findActiveByPentestId(pentestId) {
        return await prisma.projectAgreement.findFirst({
            where: { pentestId, isActive: true },
            orderBy: { version: 'desc' }
        });
    }

    async findById(id) {
        return await prisma.projectAgreement.findUnique({
            where: { id },
            include: {
                pentest: {
                    select: { name: true, organizationId: true }
                }
            }
        });
    }

    async createAgreement(data) {
        return await prisma.$transaction(async (tx) => {
            // Deactivate existing
            await tx.projectAgreement.updateMany({
                where: { pentestId: data.pentestId, isActive: true },
                data: { isActive: false }
            });

            // Get latest version number
            const latest = await tx.projectAgreement.findFirst({
                where: { pentestId: data.pentestId },
                orderBy: { version: 'desc' }
            });
            const version = latest ? latest.version + 1 : 1;

            return await tx.projectAgreement.create({
                data: {
                    ...data,
                    version,
                    isActive: true
                }
            });
        });
    }

    async findAcceptance(agreementId, hackerId) {
        return await prisma.projectAgreementAcceptance.findUnique({
            where: {
                agreementId_hackerId: { agreementId, hackerId }
            }
        });
    }

    async createAcceptance(data) {
        return await prisma.projectAgreementAcceptance.create({
            data
        });
    }
}

export default new ProjectAgreementRepository();
