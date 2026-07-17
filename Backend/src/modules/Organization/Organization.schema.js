// src/modules/organization/organization.schema.js
import Joi from 'joi';
import { OrganizationRole } from './Organization.constants.js';

export const createOrganizationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z0-9\s\-&.,'()]+$/)
    .required()
    .messages({
      'string.min': 'Organization name must be at least 2 characters',
      'string.max': 'Organization name cannot exceed 100 characters',
      'string.pattern.base': 'Organization name can only contain letters, numbers, spaces, hyphens, ampersands, periods, commas, apostrophes, and parentheses',
      'any.required': 'Organization name is required'
    }),
  slug: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-z0-9\-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.min': 'Slug must be at least 2 characters',
      'string.max': 'Slug cannot exceed 50 characters',
      'string.pattern.base': 'Slug can only contain lowercase letters, numbers, and hyphens'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  industry: Joi.string().max(100).optional().allow('', null),
  size: Joi.string().max(50).optional().allow('', null),
  companySize: Joi.string().max(50).optional().allow('', null),
  website: Joi.string().uri().optional().allow('', null),
  primaryEmail: Joi.string().email().optional().allow('', null),
  phoneNumber: Joi.string().max(20).optional().allow('', null),
  addressLine1: Joi.string().max(255).optional().allow('', null),
  addressLine2: Joi.string().max(255).optional().allow('', null),
  city: Joi.string().max(100).optional().allow('', null),
  state: Joi.string().max(100).optional().allow('', null),
  postalCode: Joi.string().max(20).optional().allow('', null),
  country: Joi.string().max(100).optional().allow('', null),
  timezone: Joi.string().max(100).optional().allow('', null),
  currency: Joi.string().max(10).optional().allow('', null),
  registrationNumber: Joi.string().max(100).optional().allow('', null),
  taxId: Joi.string().max(100).optional().allow('', null),
  signatureData: Joi.string().allow('', null).optional(),
  logoUrl: Joi.string().uri().max(500).optional().allow('', null),
  companyType: Joi.string().max(100).optional().allow('', null),
  foundedYear: Joi.string().max(20).optional().allow('', null),
  subCity: Joi.string().max(100).optional().allow('', null),
  mapsLink: Joi.string().max(500).optional().allow('', null),
  licenseIssueDate: Joi.string().max(50).optional().allow('', null),
  licenseExpiryDate: Joi.string().max(50).optional().allow('', null),
  businessLicenseUrl: Joi.string().max(500).optional().allow('', null),
  contactFirstName: Joi.string().max(100).optional().allow('', null),
  contactLastName: Joi.string().max(100).optional().allow('', null),
  contactJobTitle: Joi.string().max(100).optional().allow('', null),
  contactLinkedin: Joi.string().max(500).optional().allow('', null)
});

export const updateOrganizationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z0-9\s\-&.,'()]+$/)
    .optional()
    .messages({
      'string.min': 'Organization name must be at least 2 characters',
      'string.max': 'Organization name cannot exceed 100 characters',
      'string.pattern.base': 'Organization name can only contain letters, numbers, spaces, hyphens, ampersands, periods, commas, apostrophes, and parentheses'
    }),
  slug: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-z0-9\-]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.min': 'Slug must be at least 2 characters',
      'string.max': 'Slug cannot exceed 50 characters',
      'string.pattern.base': 'Slug can only contain lowercase letters, numbers, and hyphens'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  industry: Joi.string().max(100).optional().allow('', null),
  size: Joi.string().max(50).optional().allow('', null),
  companySize: Joi.string().max(50).optional().allow('', null),
  website: Joi.string().uri().optional().allow('', null),
  primaryEmail: Joi.string().email().optional().allow('', null),
  phoneNumber: Joi.string().max(20).optional().allow('', null),
  addressLine1: Joi.string().max(255).optional().allow('', null),
  addressLine2: Joi.string().max(255).optional().allow('', null),
  city: Joi.string().max(100).optional().allow('', null),
  state: Joi.string().max(100).optional().allow('', null),
  postalCode: Joi.string().max(20).optional().allow('', null),
  country: Joi.string().max(100).optional().allow('', null),
  timezone: Joi.string().max(100).optional().allow('', null),
  currency: Joi.string().max(10).optional().allow('', null),
  registrationNumber: Joi.string().max(100).optional().allow('', null),
  taxId: Joi.string().max(100).optional().allow('', null),
  signatureData: Joi.string().allow('', null).optional(),
  logoUrl: Joi.string().uri().max(500).optional().allow('', null),
  companyType: Joi.string().max(100).optional().allow('', null),
  foundedYear: Joi.string().max(20).optional().allow('', null),
  subCity: Joi.string().max(100).optional().allow('', null),
  mapsLink: Joi.string().max(500).optional().allow('', null),
  licenseIssueDate: Joi.string().max(50).optional().allow('', null),
  licenseExpiryDate: Joi.string().max(50).optional().allow('', null),
  businessLicenseUrl: Joi.string().max(500).optional().allow('', null),
  contactFirstName: Joi.string().max(100).optional().allow('', null),
  contactLastName: Joi.string().max(100).optional().allow('', null),
  contactJobTitle: Joi.string().max(100).optional().allow('', null),
  contactLinkedin: Joi.string().max(500).optional().allow('', null)

}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});


export const submitVerificationSchema = Joi.object({
  taxId: Joi.string().required(),
  industry: Joi.string().required(),
  companySize: Joi.string().required(),
  website: Joi.string().uri().required(),
  address: Joi.string().required(),
});

export const addMemberSchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
      'any.required': 'User ID is required'
    }),

  role: Joi.string()
    .valid(...Object.values(OrganizationRole))
    .default(OrganizationRole.MEMBER)
    .messages({
      'any.only': 'Invalid role'
    }),
  canCreatePentests: Joi.boolean()
    .default(false),
  canInviteMembers: Joi.boolean()
    .default(false)
});

export const updateMemberSchema = Joi.object({
  role: Joi.string()
    .valid(...Object.values(OrganizationRole))
    .optional()
    .messages({
      'any.only': 'Invalid role'
    }),
  canCreatePentests: Joi.boolean()
    .optional(),
  canInviteMembers: Joi.boolean()
    .optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for member update'
});

export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .positive()
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.positive': 'Page must be positive'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  search: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search query cannot exceed 100 characters'
    }),
  sortBy: Joi.string()
    .valid('name', 'createdAt', 'updatedAt', 'memberCount')
    .default('createdAt')
    .messages({
      'any.only': 'Invalid sort field'
    }),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either "asc" or "desc"'
    })
});

export const organizationIdSchema = Joi.object({
  organizationId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid organization ID format',
      'any.required': 'Organization ID is required'
    })
});

export const listOrganizationsQuerySchema = Joi.object({
  name: Joi.string().max(100).optional(),
  ownerName: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

export const organizationNameQuerySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

export const ownerNameQuerySchema = Joi.object({
  ownerName: Joi.string().min(1).max(100).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});
export const memberIdSchema = Joi.object({
  organizationId: Joi.string().uuid().required(),
  memberId: Joi.string().uuid().required()
});
