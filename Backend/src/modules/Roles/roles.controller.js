import * as service from './roles.service.js';
import { createRoleSchema, updateRoleSchema } from './roles.schema.js';

export const create = async (req, res, next) => {
    try {
        const role = await service.createRole(createRoleSchema.parse(req.body));
        res.status(201).json(role);
    } catch (e) { next(e); }
};

export const list = async (req, res, next) => {
    try {
        res.json(await service.getAllRoles());
    } catch (e) { next(e); }
};

export const get = async (req, res, next) => {
    try {
        const role = await service.getRoleById(req.params.id);
        if (!role) return res.status(404).json({ message: 'Role not found' });
        res.json(role);
    } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
    try {
        res.json(await service.updateRole(req.params.id, updateRoleSchema.parse(req.body)));
    } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
    try {
        await service.deleteRole(req.params.id);
        res.status(204).send();
    } catch (e) { next(e); }
};
