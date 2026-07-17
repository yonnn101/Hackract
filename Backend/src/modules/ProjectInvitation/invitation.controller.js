import * as service from './invitation.service.js';
import { sendInvitationSchema, respondInvitationSchema } from './invitation.schema.js';

/**
 * POST /api/v1/invitations
 * Organization sends an invitation to a hacker.
 */
export const send = async (req, res, next) => {
    try {
        const data = sendInvitationSchema.parse(req.body);
        const invitation = await service.sendInvitation(req.user.id, data, req);
        res.status(201).json({ success: true, data: invitation });
    } catch (e) { next(e); }
};

/**
 * GET /api/v1/invitations/project/:pentestId
 * List all invitations for a project (org-side view).
 */
export const listForProject = async (req, res, next) => {
    try {
        const { pentestId } = req.params;
        const { page, limit, status } = req.query;
        const result = await service.listProjectInvitations(pentestId, { page, limit, status }, req.user);
        res.json({ success: true, ...result });
    } catch (e) { next(e); }
};

/**
 * GET /api/v1/invitations/mine
 * Hacker's invitation inbox.
 */
export const listMine = async (req, res, next) => {
    try {
        const { page, limit, status } = req.query;
        const result = await service.listMyInvitations(req.user.id, { page, limit, status });
        res.json({ success: true, ...result });
    } catch (e) { next(e); }
};

/**
 * GET /api/v1/invitations/mine/count
 * Count of pending invitations for notification badge.
 */
export const countMine = async (req, res, next) => {
    try {
        const count = await service.countPendingInvitations(req.user.id);
        res.json({ success: true, data: { pendingCount: count } });
    } catch (e) { next(e); }
};

/**
 * PATCH /api/v1/invitations/:id/respond
 * Hacker accepts or rejects an invitation.
 */
export const respond = async (req, res, next) => {
    try {
        const { id } = req.params;
        const payload = respondInvitationSchema.parse(req.body);
        const invitation = await service.respondToInvitation(id, req.user.id, payload, req);
        res.json({ success: true, data: invitation });
    } catch (e) { next(e); }
};

/**
 * DELETE /api/v1/invitations/:id
 * Organization revokes a pending invitation.
 */
export const revoke = async (req, res, next) => {
    try {
        const { id } = req.params;
        const invitation = await service.revokeInvitation(id, req.user.id, req);
        res.json({ success: true, data: invitation });
    } catch (e) { next(e); }
};
