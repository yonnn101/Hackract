import roleRepository from './roles.repository.js';

export const createRole = async (data) => {
    return await roleRepository.createRole(data);
};

export const getAllRoles = async () => {
    return await roleRepository.findAll();
};

export const getRoleById = async (id) => {
    return await roleRepository.findById(id);
};

export const updateRole = async (id, data) => {
    return await roleRepository.updateRole(id, data);
};

export const deleteRole = async (id) => {
    return await roleRepository.deleteRole(id);
};
