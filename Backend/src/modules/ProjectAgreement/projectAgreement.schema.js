import { z } from 'zod';

export const createProjectAgreementSchema = z.object({
    body: z.object({
        title: z.string().min(3).max(255),
        body: z.string().min(10), // The actual markdown/text of the NDA
        scopeSummary: z.string().optional(),
        allowedActions: z.string().optional(),
        confidentiality: z.string().optional(),
        legalLiability: z.string().optional(),
    }),
    params: z.object({
        id: z.string().uuid('Invalid project ID'), // pentestId
    })
});

export const signProjectAgreementSchema = z.object({
    body: z.object({
        signatureData: z.string().min(10), // Base64 image of the canvas signature
    }),
    params: z.object({
        id: z.string().uuid('Invalid project ID'),
    })
});
