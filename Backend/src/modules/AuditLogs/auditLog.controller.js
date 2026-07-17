import * as service from './auditLog.service.js';
import { createAuditLogSchema } from './auditLog.schema.js';

export const create = async (req, res, next) => {
    try {
        const data = createAuditLogSchema.parse(req.body);
        if (req.user) data.userId = req.user.id;
        if (req.ip) data.ipAddress = req.ip;
        if (req.headers?.['user-agent']) data.userAgent = req.headers['user-agent'];

        res.status(201).json(await service.createAuditLog(data));
    } catch (e) { next(e); }
};

export const list = async (req, res, next) => {
    try {
        const filters = {
            page: req.query.page,
            limit: req.query.limit,
            userId: req.query.userId,
            organizationId: req.query.organizationId,
            pentestId: req.query.pentestId,
            action: req.query.action,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };
        res.json(await service.getAuditLogs(filters));
    } catch (e) { next(e); }
};

export const get = async (req, res, next) => {
    try {
        res.json(await service.getAuditLogById(req.params.id));
    } catch (e) { next(e); }
};

export const generateReport = async (req, res, next) => {
    try {
        const filters = {
            userId: req.query.userId,
            organizationId: req.query.organizationId,
            pentestId: req.query.pentestId,
            action: req.query.action,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };
        const report = await service.generateAuditReport(filters);
        res.json(report);
    } catch (e) { next(e); }
};
