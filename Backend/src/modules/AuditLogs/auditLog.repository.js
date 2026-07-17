import prisma from '../../database/prismaClient.js';

class AuditLogRepository {
    async createLog(data) {
        return prisma.auditLog.create({ data });
    }

    async findAll(filters = {}) {
        const {
            page = 1,
            limit = 50,
            userId,
            organizationId,
            pentestId,
            action,
            startDate,
            endDate
        } = filters;

        const skip = (page - 1) * limit;
        const where = {};

        if (userId) where.userId = userId;
        if (organizationId) where.organizationId = organizationId;
        if (pentestId) where.pentestId = pentestId;
        if (action) where.action = { contains: action, mode: 'insensitive' };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { fullName: true, email: true } },
                    organization: { select: { name: true } },
                    pentest: { select: { name: true } }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        return {
            data: logs,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async findById(id) {
        return prisma.auditLog.findUnique({
            where: { id },
            include: {
                user: true,
                organization: true,
                pentest: true
            }
        });
    }
}

export default new AuditLogRepository();
