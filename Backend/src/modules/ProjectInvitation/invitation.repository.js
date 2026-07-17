import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { InvitationErrorCodes } from './invitation.constants.js';

const invitationInclude = {
    pentest: {
        select: {
            id: true,
            name: true,
            status: true,
            organization: { select: { id: true, name: true, slug: true } },
        },
    },
    hacker: {
        select: {
            id: true,
            fullName: true,
            handle: true,
            avatar: true,
            email: true,
        },
    },
    invitedBy: {
        select: {
            id: true,
            fullName: true,
            handle: true,
            avatar: true,
        },
    },
};

class InvitationRepository {
    async create(data) {
        return prisma.projectInvitation.create({
            data,
            include: invitationInclude,
        });
    }

    async findById(id) {
        return prisma.projectInvitation.findUnique({
            where: { id },
            include: invitationInclude,
        });
    }

    /**
     * Find any PENDING invitation for this hacker+pentest combo (for duplicate guard).
     */
    async findPending(pentestId, hackerId) {
        return prisma.projectInvitation.findFirst({
            where: { pentestId, hackerId, status: 'PENDING' },
        });
    }

    async listForPentest(pentestId, { page = 1, limit = 20, status } = {}) {
        const skip = (page - 1) * limit;
        const where = { pentestId };
        if (status) where.status = status;

        const [data, total] = await Promise.all([
            prisma.projectInvitation.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
                include: invitationInclude,
            }),
            prisma.projectInvitation.count({ where }),
        ]);

        return { data, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } };
    }

    async listForHacker(hackerId, { page = 1, limit = 20, status } = {}) {
        const skip = (page - 1) * limit;
        const where = { hackerId };
        if (status) where.status = status;

        const [data, total] = await Promise.all([
            prisma.projectInvitation.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
                include: invitationInclude,
            }),
            prisma.projectInvitation.count({ where }),
        ]);

        return { data, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } };
    }

    async updateStatus(id, status, extra = {}) {
        return prisma.projectInvitation.update({
            where: { id },
            data: { status, ...extra, updatedAt: new Date() },
            include: invitationInclude,
        });
    }

    async countPendingForHacker(hackerId) {
        return prisma.projectInvitation.count({
            where: { hackerId, status: 'PENDING' },
        });
    }
}

export default new InvitationRepository();
