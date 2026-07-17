import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';

class HackerService {
    async getHackerProfile(userId) {
        let profile = await prisma.hackerProfile.findUnique({
            where: { userId },
            include: { user: true }
        });

        if (!profile) {
            // Create a draft profile if it doesn't exist
            profile = await prisma.hackerProfile.create({
                data: {
                    userId,
                    bio: '',
                    status: 'DRAFT',
                },
                include: { user: true }
            });
        }

        return profile;
    }

    async submitVerification(userId, payload) {
        const { bio, country, yearsOfExperience, primarySkills, certifications, portfolioLinks, idDocumentNumber } = payload;

        // 1. Ensure all mandatory agreements are signed
        const missingAgreements = await this.getMissingAgreements(userId);
        if (missingAgreements.length > 0) {
            throw new AppError(`Mandatory legal agreements must be signed: ${missingAgreements.join(', ')}`, 400);
        }

        // 2. Update and submit profile
        const profile = await prisma.hackerProfile.update({
            where: { userId },
            data: {
                bio,
                country,
                yearsOfExperience: parseInt(yearsOfExperience),
                primarySkills,
                certifications,
                portfolioLinks,
                idDocumentNumber,
                status: 'SUBMITTED',
            }
        });

        return profile;
    }

    async getMissingAgreements(userId) {
        const mandatoryAgreements = ['Mutual Non-Disclosure Agreement (MNDA)', 'Ethical Hacking Code of Conduct'];
        
        const signedAgreements = await prisma.userSignature.findMany({
            where: { userId },
            include: { agreement: true }
        });

        const signedTitles = signedAgreements.map(s => s.agreement.title);
        return mandatoryAgreements.filter(title => !signedTitles.includes(title));
    }

    async signAgreement(userId, agreementTitle, meta = {}) {
        const agreement = await prisma.legalAgreement.findFirst({
            where: { title: agreementTitle, isActive: true },
            orderBy: { version: 'desc' }
        });

        if (!agreement) {
            throw new AppError('Agreement not found or inactive', 404);
        }

        const signature = await prisma.userSignature.upsert({
            where: {
                userId_agreementId: {
                    userId,
                    agreementId: agreement.id
                }
            },
            create: {
                userId,
                agreementId: agreement.id,
                ipAddress: meta.ipAddress,
                userAgent: meta.userAgent,
            },
            update: {
                signedAt: new Date(),
                ipAddress: meta.ipAddress,
                userAgent: meta.userAgent,
            }
        });

        return signature;
    }

    async listPendingReviews() {
        return prisma.hackerProfile.findMany({
            where: { status: 'SUBMITTED' },
            include: { user: true }
        });
    }

    async updateProfileStatus(userId, adminId, status, reviewNotes = '') {
        return prisma.hackerProfile.update({
            where: { userId },
            data: {
                status,
                reviewNotes,
                reviewedById: adminId
            }
        });
    }
}

export default new HackerService();
