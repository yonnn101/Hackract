import Joi from 'joi';

export const createSchema = Joi.object({
    fan: Joi.string().length(16).pattern(/^\d+$/).required().messages({
        'string.length': 'FAN must be exactly 16 digits',
        'string.pattern.base': 'FAN must contain only numbers'
    }),
    email: Joi.string().email().required(),
    firstName: Joi.string().optional(),
    middleName: Joi.string().optional(),
    lastName: Joi.string().optional(),
});

export const readSchema = Joi.object({
    fan: Joi.string().length(16).pattern(/^\d+$/).optional(),
    email: Joi.string().email().optional(),
});

export const paramIdSchema = Joi.object({
    id: Joi.string().uuid().required()
});

export const updateSchema = Joi.object({
    fan: Joi.string().length(16).pattern(/^\d+$/).optional(),
    email: Joi.string().email().optional(),
    firstName: Joi.string().optional(),
    middleName: Joi.string().optional(),
    lastName: Joi.string().optional(),
});
