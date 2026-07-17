import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { MemberErrorCodes } from './member.constants.js';

const memberInclude = {
    user: { select: { id: true, fullName: true, email: true, handle: true } },
    organization: { select: { id: true, name: true } }
};

class MemberRepository {
    async addMember(data) {
        try {
            return await prisma.organizationMember.create({
                data,
                include: memberInclude
            });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new AppError('User already in organization', 409, MemberErrorCodes.ALREADY_EXISTS);
            }
            throw error;
        }
    }

    async listMembers(organizationId) {
        return prisma.organizationMember.findMany({
            where: { organizationId },
            include: memberInclude
        });
    }

    async findMember(organizationId, userId) {
        const member = await prisma.organizationMember.findUnique({
            where: {
                organizationId_userId: {
                    organizationId,
                    userId
                }
            },
            include: memberInclude
        });

        if (!member) {
            throw new AppError('Member not found', 404, MemberErrorCodes.NOT_FOUND);
        }

        return member;
    }

    async removeMember(organizationId, userId) {
        const member = await this.findMember(organizationId, userId);
        await prisma.organizationMember.delete({ where: { id: member.id } });
        return member;
    }

    async updateMember(organizationId, userId, data) {
        const member = await this.findMember(organizationId, userId);

        return prisma.organizationMember.update({
            where: { id: member.id },
            data,
            include: memberInclude
        });
    }
}

export default new MemberRepository();
