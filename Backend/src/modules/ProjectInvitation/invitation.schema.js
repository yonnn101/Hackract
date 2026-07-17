import { z } from 'zod';

const agreementFileSchema = z.object({
    fileUrl: z.string().url(),
    fileName: z.string().max(255),
    fileSize: z.number().int().positive().optional(),
    fileMime: z.string().max(100).optional(),
});

const agreementSchema = agreementFileSchema.extend({
    source: z.enum(['UPLOAD', 'LEGAL_AGREEMENT']),
    legalAgreementId: z.string().uuid().optional(),
    title: z.string().max(255).optional(),
});

export const sendInvitationSchema = z.object({
    pentestId: z.string().uuid('Invalid pentest ID'),
    hackerId: z.string().uuid('Invalid hacker ID'),
    message: z.string().max(1000).optional(),
    expiresAt: z.string().datetime().optional(),
    agreement: agreementSchema.optional(),
});

export const respondInvitationSchema = z.object({
    status: z.enum(['ACCEPTED', 'REJECTED'], {
        errorMap: () => ({ message: 'Status must be ACCEPTED or REJECTED' }),
    }),
    signedFile: agreementFileSchema.optional(),
});
