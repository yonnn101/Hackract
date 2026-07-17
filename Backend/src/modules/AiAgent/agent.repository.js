import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { AgentErrorCodes } from './agent.constants.js';

class AgentRepository {
    async createAgent(data) {
        return prisma.aiAgent.create({
            data,
            include: {
                assistant: { select: { name: true, model: true } }
            }
        });
    }

    async findById(id) {
        return prisma.aiAgent.findUnique({
            where: { id },
            include: {
                assistant: true
            }
        });
    }

    async updateAgent(id, data) {
        try {
            return await prisma.aiAgent.update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            if (error.code === 'P2025') throw new AppError('Agent session not found', 404, AgentErrorCodes.NOT_FOUND);
            throw error;
        }
    }

    async findAll(filters = {}) {
        const { userId, pentestId } = filters;
        const where = {};
        if (userId) where.userId = userId;
        if (pentestId) where.pentestId = pentestId;

        return prisma.aiAgent.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: { assistant: { select: { name: true } } }
        });
    }
}

export default new AgentRepository();
