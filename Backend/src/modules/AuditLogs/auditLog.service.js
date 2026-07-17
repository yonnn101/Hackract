import auditLogRepository from './auditLog.repository.js';
import AppError from '../../utils/AppError.js';
import { AuditLogErrorCodes } from './auditLog.constants.js';

export const createAuditLog = async (data) => {
    return await auditLogRepository.createLog(data);
};

export const getAuditLogs = async (filters) => {
    return await auditLogRepository.findAll(filters);
};

export const getAuditLogById = async (id) => {
    const log = await auditLogRepository.findById(id);
    if (!log) throw new AppError('Audit log not found', 404, AuditLogErrorCodes.NOT_FOUND);
    return log;
};

// Helper function to log actions
export const logAction = async (action, userId, details = {}, req = null) => {
    const logData = {
        action,
        userId,
        details,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.headers?.['user-agent']
    };

    if (details.organizationId) logData.organizationId = details.organizationId;
    if (details.pentestId) logData.pentestId = details.pentestId;

    return await createAuditLog(logData);
};

export const generateAuditReport = async (filters) => {
    const logs = await getAuditLogs(filters);
    return {
        reportType: 'Compliance Audit',
        generatedAt: new Date(),
        totalEntries: logs.length,
        entries: logs.map(log => ({
            id: log.id,
            timestamp: log.createdAt,
            action: log.action,
            metadata: log.details
        }))
    };
};
