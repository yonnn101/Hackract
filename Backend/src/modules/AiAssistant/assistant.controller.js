import * as service from './assistant.service.js';
import { createAssistantSchema, updateAssistantSchema, generateAssistantResponseSchema } from './assistant.schema.js';

export const create = async (req, res, next) => {
    try {
        res.status(201).json(await service.createAssistant(createAssistantSchema.parse(req.body)));
    } catch (e) { next(e); }
};

export const list = async (req, res, next) => {
    try {
        res.json(await service.getAllAssistants());
    } catch (e) { next(e); }
};

export const get = async (req, res, next) => {
    try {
        const assistant = await service.getAssistantById(req.params.id);
        if (!assistant) return res.status(404).json({ message: 'Assistant not found' });
        res.json(assistant);
    } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
    try {
        res.json(await service.updateAssistant(req.params.id, updateAssistantSchema.parse(req.body)));
    } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
    try {
        await service.deleteAssistant(req.params.id);
        res.status(204).send();
    } catch (e) { next(e); }
};

export const generate = async (req, res, next) => {
    try {
        const payload = generateAssistantResponseSchema.parse(req.body);
        const result = await service.generateAssistantResponse(payload);
        res.status(200).json({ success: true, data: result });
    } catch (e) { next(e); }
};
