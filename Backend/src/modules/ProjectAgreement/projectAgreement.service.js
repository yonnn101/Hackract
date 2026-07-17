import projectAgreementRepository from './projectAgreement.repository.js';
import AppError from '../../utils/AppError.js';
import { ProjectAgreementErrorCodes, ProjectAgreementActions } from './projectAgreement.constants.js';
import * as auditLogService from '../AuditLogs/auditLog.service.js';
import prisma from '../../database/prismaClient.js';

export const getActiveAgreement = async (pentestId) => {
    const agreement = await projectAgreementRepository.findActiveByPentestId(pentestId);
    if (!agreement) {
        throw new AppError('No active legal agreement found for this project.', 404, ProjectAgreementErrorCodes.NOT_FOUND);
    }
    return agreement;
};

export const createAgreement = async (pentestId, orgAdminId, orgId, data) => {
    // Verify project belongs to org
    const project = await prisma.pentest.findFirst({
        where: { id: pentestId, organizationId: orgId }
    });
    if (!project) throw new AppError('Project not found or access denied', 404, ProjectAgreementErrorCodes.PROJECT_NOT_FOUND);

    const agreement = await projectAgreementRepository.createAgreement({
        ...data,
        pentestId,
        createdById: orgAdminId
    });

    await auditLogService.createAuditLog({
        actorId: orgAdminId,
        actorType: 'ORGANIZATION',
        orgId: orgId,
        projectId: pentestId,
        action: ProjectAgreementActions.CREATED,
        targetType: 'projectAgreement',
        targetId: agreement.id,
        payload: { title: agreement.title, version: agreement.version }
    });

    return agreement;
};

export const signAgreement = async (pentestId, hackerId, signatureData, ipAddress, userAgent) => {
    const agreement = await getActiveAgreement(pentestId);

    // Verify hacker is invited and accepted
    const invitation = await prisma.projectInvitation.findUnique({
        where: { project_hacker_unique: { projectId: pentestId, hackerId } } // Actually this unique constraint is Pentest_hacker
    });
    
    // We should just check if PentestCollaborator exists, or check Invitation
    const collaborator = await prisma.pentestCollaborator.findFirst({
        where: { pentestId, hackerId }
    });

    if (!collaborator) {
        throw new AppError('You do not have access to this project to sign its agreement.', 403, ProjectAgreementErrorCodes.NOT_AUTHORIZED);
    }

    const existing = await projectAgreementRepository.findAcceptance(agreement.id, hackerId);
    if (existing && existing.status === 'SIGNED') {
        throw new AppError('You have already signed this agreement.', 409, ProjectAgreementErrorCodes.ALREADY_SIGNED);
    }

    const acceptance = await projectAgreementRepository.createAcceptance({
        agreementId: agreement.id,
        hackerId,
        pentestId,
        version: agreement.version,
        status: 'SIGNED',
        ipAddress,
        userAgent,
        signatureData,
        signedAt: new Date()
    });

    await auditLogService.createAuditLog({
        actorId: hackerId,
        actorType: 'HACKER',
        projectId: pentestId,
        action: ProjectAgreementActions.SIGNED,
        targetType: 'projectAgreementAcceptance',
        targetId: acceptance.id,
        payload: { agreementId: agreement.id, version: agreement.version },
        ipAddress
    });

    return acceptance;
};

export const checkHackerSigned = async (pentestId, hackerId) => {
    const agreement = await projectAgreementRepository.findActiveByPentestId(pentestId);
    if (!agreement) return false; // If there is no agreement, then it's technically fine, but usually there should be one.

    const acceptance = await projectAgreementRepository.findAcceptance(agreement.id, hackerId);
    return acceptance && acceptance.status === 'SIGNED';
};
