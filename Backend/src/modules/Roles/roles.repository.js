import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { RoleErrorCodes, RoleTypes } from './roles.constants.js';

class RoleRepository {
    async createRole(data) {
        try {
            return await prisma.role.create({ data });
        } catch (error) {
            if (error.code === 'P2002') {
                if (error.meta?.target?.includes('name'))
                    throw new AppError('Role name exists', 409, RoleErrorCodes.NAME_ALREADY_EXISTS);
                if (error.meta?.target?.includes('type'))
                    throw new AppError('Role type exists', 409, RoleErrorCodes.TYPE_ALREADY_EXISTS);
            }
            throw error;
        }
    }

    async findAll() {
        return prisma.role.findMany({
            where: {
                type: {
                    in: Object.values(RoleTypes),
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
    }

    async findById(id) {
        return prisma.role.findUnique({ where: { id } });
    }

    async updateRole(id, data) {
        return prisma.role.update({ where: { id }, data });
    }

    async deleteRole(id) {
        return prisma.role.delete({ where: { id } });
    }
}

export default new RoleRepository();
