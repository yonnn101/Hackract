import { z } from "zod";
import { AgreementType, AgreementTypeValues, normalizeAgreementType } from "./legalAgreement.constants.js";

const coerceBoolean = (value) => {
    if (value === true || value === false) return value;
    if (typeof value !== 'string') return value;
    const v = value.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
    return value;
};

const agreementTypeSchema = z
    .preprocess(normalizeAgreementType, z.string())
    .refine((value) => AgreementTypeValues.includes(value), {
        message: `Invalid agreement type. Must be one of: ${AgreementTypeValues.join(', ')}`,
    });

export const createAgreementSchema = z.object({
    title: z.string().min(3),
    content: z.string().min(10),
    version: z.string().min(1),
    type: agreementTypeSchema.default(AgreementType.TERMS_OF_SERVICE),
    isActive: z.preprocess(coerceBoolean, z.boolean()).default(true)
});

export const updateAgreementSchema = z.object({
    title: z.string().min(3).optional(),
    content: z.string().min(10).optional(),
    version: z.string().min(1).optional(),
    type: agreementTypeSchema.optional(),
    isActive: z.preprocess(coerceBoolean, z.boolean()).optional()
});
