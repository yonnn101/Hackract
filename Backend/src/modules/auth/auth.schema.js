import Joi from 'joi';
import { PASSWORD_REGEX } from './auth.constants.js';

const ACCOUNT_TYPES = ['HACKER', 'ORGANIZATION'];

const handleSchema = Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(3)
    .max(30)
    .messages({
        'string.pattern.base': 'Handle may contain letters, numbers, underscores, or hyphens',
        'string.min': 'Handle must be at least 3 characters long',
        'string.max': 'Handle must not exceed 30 characters',
    });

const organizationSchema = Joi.object({
    name: Joi.string().min(2).max(150).required().messages({
        'string.min': 'Organization name must be at least 2 characters long',
        'string.max': 'Organization name must not exceed 150 characters',
        'any.required': 'Organization name is required',
    }),
    description: Joi.string().max(500).optional().allow('', null),
    website: Joi.string().uri().optional().allow('', null),
    industry: Joi.string().max(100).optional().allow('', null),
    size: Joi.string().max(50).optional().allow('', null),
    phoneNumber: Joi.string().max(50).optional().allow('', null),
    country: Joi.string().max(80).optional().allow('', null),
    city: Joi.string().max(80).optional().allow('', null),
    addressLine1: Joi.string().max(200).optional().allow('', null),
    addressLine2: Joi.string().max(200).optional().allow('', null),
    state: Joi.string().max(80).optional().allow('', null),
    postalCode: Joi.string().max(30).optional().allow('', null),
    registrationNumber: Joi.string().max(80).optional().allow('', null),
    taxId: Joi.string().max(80).optional().allow('', null),
}).required();

/**
 * Registration validation schema
 */
export const registerSchema = Joi.object({
    accountType: Joi.string()
        .valid(...ACCOUNT_TYPES)
        .default('HACKER')
        .messages({
            'any.only': 'Invalid account type. Choose Hacker or Organization.',
        }),

    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
        }),

    password: Joi.string()
        .pattern(PASSWORD_REGEX)
        .required()
        .messages({
            'string.pattern.base': 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            'any.required': 'Password is required',
        }),

    confirmPassword: Joi.any()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': 'Passwords must match',
            'any.required': 'Confirm password is required',
        }),

    fullName: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Full name must be at least 2 characters long',
            'string.max': 'Full name must not exceed 100 characters',
            'any.required': 'Full name is required',
        }),

    // Preferred field name used across the backend
    handle: handleSchema.optional().allow('', null),

    // Legacy alias for handle (kept for backward compatibility)
    userName: handleSchema.optional().allow('', null),

    // Organization details only apply when accountType=ORGANIZATION
    organization: Joi.when('accountType', {
        is: 'ORGANIZATION',
        then: organizationSchema,
        otherwise: Joi.forbidden().messages({
            'any.unknown': 'Organization details are only allowed for Organization accounts',
        }),
    }),
});

/**
 * Validate that an email looks like a company email (non-public domain)
 */
export const validateOrgEmailSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
    }),
});

/**
 * Login validation schema
 */
export const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
        }),

    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required',
        }),
});

/**
 * Email verification schema
 */
export const verifyEmailSchema = Joi.object({
    token: Joi.string()
        .pattern(/^\d{6}$/)
        .required()
        .messages({
            'string.pattern.base': 'Verification code must be a 6-digit number',
            'any.required': 'Verification code is required',
        }),

    email: Joi.string()
        .email()
        .optional()
        .allow(null)
        .messages({
            'string.email': 'Please provide a valid email address',
        }),
});

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
        }),
});

/**
 * Reset password schema
 */
export const resetPasswordSchema = Joi.object({
    token: Joi.string()
        .required()
        .messages({
            'any.required': 'Reset token is required',
        }),

    newPassword: Joi.string()
        .pattern(PASSWORD_REGEX)
        .required()
        .messages({
            'string.pattern.base': 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            'any.required': 'New password is required',
        }),

    confirmPassword: Joi.any()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': 'Passwords must match',
            'any.required': 'Confirm password is required',
        }),
});

/**
 * Refresh token schema
 */
export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string()
        .optional()
        .messages({
            'string.base': 'Refresh token must be a string',
        }),
});

/**
 * Assign initial role schema (onboarding)
 */
export const assignInitialRoleSchema = Joi.object({
    role: Joi.string().valid('PENTESTER').required().messages({
        'any.only': 'Invalid role selection',
        'any.required': 'Role selection is required',
    }),
});

/**
 * Validation middleware factory
 */
export const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));

            return res.status(422).json({
                success: false,
                error: 'Validation failed',
                errorCode: 'VALIDATION_ERROR',
                details: { errors },
                timestamp: new Date().toISOString(),
            });
        }

        req.validatedBody = value;
        next();
    };
};
