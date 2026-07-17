import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import invitationRepository from './invitation.repository.js';
import { InvitationErrorCodes, InvitationActions } from './invitation.constants.js';
import { logAction } from '../AuditLogs/auditLog.service.js';
import * as chatService from '../Chat/chat.service.js';

// ─── Guards ──────────────────────────────────────────────────────────────────

const checkProjectManagePermission = async (pentestId, user) => {
    // 1. Global ORG_ADMIN
    if (user.roles.some(r => r.type === 'ORG_ADMIN')) return true;

    const pentest = await prisma.pentest.findUnique({
        where: { id: pentestId },
        select: { id: true, organizationId: true, leadPentesterId: true }
    });
    if (!pentest) throw new AppError('Project not found', 404, InvitationErrorCodes.PROJECT_NOT_FOUND);

    // 2. Org Member (Owner/Admin)
    if (pentest.organizationId) {
        const orgMember = await prisma.organizationMember.findFirst({
            where: { organizationId: pentest.organizationId, userId: user.id, role: { in: ['owner', 'admin'] } }
        });
        if (orgMember) return true;
    }

    // 3. Project Lead
    if (pentest.leadPentesterId === user.id) return true;

    // 4. Project Admin Collaborator
    const isProjectAdmin = await prisma.pentestCollaborator.findFirst({
        where: { pentestId, userId: user.id, role: 'PROJECT_ADMIN' }
    });
    if (isProjectAdmin) return true;

    throw new AppError('You do not have permission to manage this project', 403);
};

const ensurePentestExists = async (pentestId) => {
    const pentest = await prisma.pentest.findUnique({
        where: { id: pentestId },
        select: { id: true, organizationId: true },
    });
    if (!pentest) throw new AppError('Project not found', 404, InvitationErrorCodes.PROJECT_NOT_FOUND);
    return pentest;
};

const ensureHackerExists = async (hackerId) => {
    const user = await prisma.user.findUnique({
        where: { id: hackerId },
        select: { id: true, fullName: true, handle: true },
    });
    if (!user) throw new AppError('Hacker not found', 404, InvitationErrorCodes.HACKER_NOT_FOUND);
    return user;
};

const ensureHackerApproved = async (hackerId) => {
    const profile = await prisma.hackerProfile.findUnique({
        where: { userId: hackerId },
        select: { status: true },
    });
    if (!profile || profile.status !== 'APPROVED') {
        throw new AppError(
            'This hacker\'s profile has not been approved yet',
            403,
            InvitationErrorCodes.HACKER_NOT_APPROVED
        );
    }
};

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Organization sends an invitation to a hacker for a specific pentest.
 */
export const sendInvitation = async (inviterId, { pentestId, hackerId, message, expiresAt, agreement }, req) => {
    const user = req.user; // We assume controller passes user or attaches to req
    await checkProjectManagePermission(pentestId, user);
    await ensureHackerExists(hackerId);

    // Block duplicate PENDING invitation
    const existing = await invitationRepository.findPending(pentestId, hackerId);
    if (existing) {
        throw new AppError(
            'This hacker already has a pending invitation for this project',
            409,
            InvitationErrorCodes.ALREADY_PENDING
        );
    }

    if (!agreement?.fileUrl) {
        throw new AppError(
            'A legal agreement document is required to send an invitation',
            400,
            InvitationErrorCodes.AGREEMENT_REQUIRED
        );
    }

    const agreementData = agreement ? {
        agreementSource: agreement.source || null,
        agreementLegalId: agreement.legalAgreementId || null,
        agreementTitle: agreement.title || null,
        agreementFileUrl: agreement.fileUrl || null,
        agreementFileName: agreement.fileName || null,
        agreementFileSize: agreement.fileSize || null,
        agreementFileMime: agreement.fileMime || null,
        agreementSentAt: agreement.fileUrl ? new Date() : null,
    } : {};

    const invitation = await invitationRepository.create({
        pentestId,
        hackerId,
        invitedById: inviterId,
        message: message || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'PENDING',
        ...agreementData,
    });

    await logAction(InvitationActions.SENT, inviterId, {
        invitationId: invitation.id,
        pentestId,
        hackerId,
        organizationId: invitation.pentest?.organization?.id,
    }, req);

    if (req?.app?.locals?.sendNotification) {
        console.log(`📡 Service: Dispatching INVITE_RECEIVED to ${hackerId}`);
        const projectName = invitation.pentest?.name || 'a new project';
        req.app.locals.sendNotification(hackerId, {
            type: 'INVITE_RECEIVED',
            title: 'New Mission Directive',
            message: `You have been assigned to project: ${projectName}.`,
            pentestId,
            timestamp: new Date().toISOString()
        });
    } else {
        console.warn('⚠️ Service: req.app.locals.sendNotification is NOT defined!');
    }

    if (agreement?.fileUrl) {
        const projectName = invitation.pentest?.name || 'a new project';
        const conversation = await chatService.getOrCreateDirectConversation(inviterId, hackerId);
        const agreementMessage = await chatService.sendMessage(conversation.id, inviterId, {
            content: `Legal agreement attached for ${projectName}.`,
            type: 'FILE',
            fileUrl: agreement.fileUrl,
            fileName: agreement.fileName,
            fileSize: agreement.fileSize,
            fileMime: agreement.fileMime,
        });

        req.app.locals.broadcastChatMessage?.(conversation.id, agreementMessage);
    }

    return invitation;
};

/**
 * Hacker accepts or rejects an invitation. On ACCEPTED, also creates a PentestCollaborator record.
 */
export const respondToInvitation = async (invitationId, hackerId, { status, signedFile }, req) => {
    const invitation = await invitationRepository.findById(invitationId);

    if (!invitation) {
        throw new AppError('Invitation not found', 404, InvitationErrorCodes.NOT_FOUND);
    }

    // Ensure this invitation belongs to this hacker
    if (invitation.hackerId !== hackerId) {
        throw new AppError('You are not authorized to respond to this invitation', 403, InvitationErrorCodes.NOT_AUTHORIZED);
    }

    // Must still be PENDING
    if (invitation.status !== 'PENDING') {
        throw new AppError(
            `Invitation has already been ${invitation.status.toLowerCase()}`,
            409,
            InvitationErrorCodes.ALREADY_RESPONDED
        );
    }

    // Check expiry
    if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
        await invitationRepository.updateStatus(invitationId, 'EXPIRED', { respondedAt: new Date() });
        throw new AppError('This invitation has expired', 410, InvitationErrorCodes.EXPIRED);
    }

    const requiresSignedFile = Boolean(invitation.agreementFileUrl);
    if (status === 'ACCEPTED' && requiresSignedFile && !signedFile?.fileUrl) {
        throw new AppError(
            'Signed agreement document is required to accept this invitation',
            400,
            InvitationErrorCodes.SIGNED_DOCUMENT_REQUIRED
        );
    }

    const updatePayload = {
        respondedAt: new Date(),
    };

    if (status === 'ACCEPTED' && signedFile?.fileUrl) {
        updatePayload.signedFileUrl = signedFile.fileUrl;
        updatePayload.signedFileName = signedFile.fileName || null;
        updatePayload.signedFileSize = signedFile.fileSize || null;
        updatePayload.signedFileMime = signedFile.fileMime || null;
        updatePayload.signedAt = new Date();
    }

    const updated = await invitationRepository.updateStatus(invitationId, status, updatePayload);

    // On acceptance → add to pentest as collaborator (if not already there)
    if (status === 'ACCEPTED') {
        const alreadyCollaborator = await prisma.pentestCollaborator.findUnique({
            where: { pentestId_userId: { pentestId: invitation.pentestId, userId: hackerId } },
        });

        if (!alreadyCollaborator) {
            await prisma.pentestCollaborator.create({
                data: {
                    pentestId: invitation.pentestId,
                    userId: hackerId,
                    role: 'HACKER',
                },
            });
        }

        // Auto-create PENDING ProjectAgreementAcceptance for the hacker
        const activeAgreement = await prisma.projectAgreement.findFirst({
            where: { pentestId: invitation.pentestId, isActive: true },
            orderBy: { version: 'desc' }
        });

        if (activeAgreement) {
            const alreadyAccepted = await prisma.projectAgreementAcceptance.findUnique({
                where: { agreementId_hackerId: { agreementId: activeAgreement.id, hackerId } }
            });

            if (!alreadyAccepted) {
                await prisma.projectAgreementAcceptance.create({
                    data: {
                        agreementId: activeAgreement.id,
                        hackerId,
                        pentestId: invitation.pentestId,
                        version: activeAgreement.version,
                        status: 'PENDING'
                    }
                });
            }
        }
    }

    if (status === 'ACCEPTED' && signedFile?.fileUrl && invitation.invitedById) {
        const projectName = invitation.pentest?.name || 'Assigned';
        const conversation = await chatService.getOrCreateDirectConversation(hackerId, invitation.invitedById);
        const signedMessage = await chatService.sendMessage(conversation.id, hackerId, {
            content: `Signed agreement for ${projectName}.`,
            type: 'FILE',
            fileUrl: signedFile.fileUrl,
            fileName: signedFile.fileName,
            fileSize: signedFile.fileSize,
            fileMime: signedFile.fileMime,
        });

        req.app.locals.broadcastChatMessage?.(conversation.id, signedMessage);
    }

    const actionKey = status === 'ACCEPTED' ? InvitationActions.ACCEPTED : InvitationActions.REJECTED;
    await logAction(actionKey, hackerId, {
        invitationId,
        pentestId: invitation.pentestId,
    }, req);

    if (req?.app?.locals?.sendNotification && invitation.invitedById) {
        console.log(`📡 Service: Dispatching response notification to ${invitation.invitedById}`);
        const hackerName = invitation.hacker?.fullName || 'An operative';
        req.app.locals.sendNotification(invitation.invitedById, {
            type: status === 'ACCEPTED' ? 'INVITE_ACCEPTED' : 'INVITE_REJECTED',
            title: status === 'ACCEPTED' ? 'Mission Accepted' : 'Mission Declined',
            message: `${hackerName} has ${status.toLowerCase()} the invitation for project ${invitation.pentest?.name || 'Assigned'}.`,
            pentestId: invitation.pentestId,
            timestamp: new Date().toISOString()
        });
    } else {
        console.warn('⚠️ Service: Notification skipped (missing helper or invitedById)');
    }

    return updated;
};

/**
 * Organization revokes a PENDING invitation.
 */
export const revokeInvitation = async (invitationId, userId, req) => {
    const invitation = await invitationRepository.findById(invitationId);

    if (!invitation) {
        throw new AppError('Invitation not found', 404, InvitationErrorCodes.NOT_FOUND);
    }

    await checkProjectManagePermission(invitation.pentestId, req.user);

    if (invitation.status !== 'PENDING') {
        throw new AppError(
            `Cannot revoke an invitation that is already ${invitation.status.toLowerCase()}`,
            409,
            InvitationErrorCodes.CANNOT_REVOKE
        );
    }

    const updated = await invitationRepository.updateStatus(invitationId, 'REVOKED');

    await logAction(InvitationActions.REVOKED, userId, {
        invitationId,
        pentestId: invitation.pentestId,
        hackerId: invitation.hackerId,
    }, req);

    return updated;
};

/**
 * List all invitations for a project (org view).
 */
export const listProjectInvitations = async (pentestId, filters, user) => {
    await checkProjectManagePermission(pentestId, user);
    return invitationRepository.listForPentest(pentestId, filters);
};

/**
 * List invitations received by the authenticated hacker.
 */
export const listMyInvitations = async (hackerId, filters) => {
    return invitationRepository.listForHacker(hackerId, filters);
};

/**
 * Count pending invitations for a hacker (used for notification badge).
 */
export const countPendingInvitations = async (hackerId) => {
    return invitationRepository.countPendingForHacker(hackerId);
};
