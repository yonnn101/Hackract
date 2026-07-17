import Joi from 'joi';
import { VerificationStatus } from './hackerProfile.constants.js';

export const upsertHackerProfileSchema = Joi.object({
  bio: Joi.alternatives().try(
    Joi.string().min(10).max(2000),
    Joi.string().allow('', null),
  ).optional().messages({
    'string.min': 'Bio must be at least 10 characters long',
  }),
  country: Joi.string().max(100).optional().allow('', null),
  yearsOfExperience: Joi.number().integer().min(0).max(60).optional().allow(null, ''),
  primarySkills: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().max(50)),
      Joi.string().allow('', null),
    )
    .optional()
    .default([]),
  certifications: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().max(2000)),
      Joi.string().allow('', null),
    )
    .optional()
    .default([]),
  portfolioLinks: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().max(300)),
      Joi.string().allow('', null),
    )
    .optional()
    .default([]),
  education: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.string().allow('', null),
    )
    .optional()
    .default([]),
  employment: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.string().allow('', null),
    )
    .optional()
    .default([]),
  otherExperiences: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.string().allow('', null),
    )
    .optional()
    .default([]),

  // Professional fields
  specialization: Joi.string().max(150).optional().allow('', null),
  githubUsername: Joi.string().max(100).optional().allow('', null),
  linkedinProfile: Joi.string().max(300).optional().allow('', null),
  twitter: Joi.string().max(100).optional().allow('', null),
  idDocumentNumber: Joi.string().max(50).optional().allow('', null),
  fullName: Joi.string().max(100).optional().allow('', null),

  avatar: Joi.string().uri().max(500).optional().allow('', null),

  status: Joi.string()
    .valid(VerificationStatus.DRAFT, VerificationStatus.SUBMITTED)
    .optional(),
});
