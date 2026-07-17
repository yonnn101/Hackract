import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { AiAssistantErrorCodes } from './assistant.constants.js';

class AiAssistantRepository {
    async createAssistant(data) {
        try {
            return await prisma.aiAssistant.create({ data });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new AppError('Assistant name already exists', 409, AiAssistantErrorCodes.NAME_ALREADY_EXISTS);
            }
            throw error;
        }
    }

    async findById(id) {
        return prisma.aiAssistant.findUnique({ where: { id } });
    }

    async findAll() {
        return prisma.aiAssistant.findMany({
            where: { isActive: true }
        });
    }

    async updateAssistant(id, data) {
        try {
            return await prisma.aiAssistant.update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            if (error.code === 'P2025') throw new AppError('Assistant not found', 404, AiAssistantErrorCodes.NOT_FOUND);
            throw error;
        }
    }

    async deleteAssistant(id) {
        return prisma.aiAssistant.delete({ where: { id } });
    }
}

export default new AiAssistantRepository();
