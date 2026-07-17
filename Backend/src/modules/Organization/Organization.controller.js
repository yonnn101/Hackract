// src/modules/organization/organization.controller.js
import organizationService from './Organization.service.js';
import * as memberService from '../OrgMembers/member.service.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationIdSchema,
  listOrganizationsQuerySchema,
  organizationNameQuerySchema,
  ownerNameQuerySchema,
  submitVerificationSchema,
  addMemberSchema,
  updateMemberSchema,
  paginationSchema,
  memberIdSchema

} from './Organization.schema.js';
import asyncHandler from '../../utils/AsyncHandler.js';

const sendValidationError = (res, joiError) => {
  const errors = joiError.details.map((detail) => ({
    field: detail.path.join('.'),
    message: detail.message
  }));
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors
  });
};

class OrganizationController {
  listOrganizations = asyncHandler(async (req, res) => {
    const { error, value } = listOrganizationsQuerySchema.validate(req.query);
    if (error) {
      return sendValidationError(res, error);
    }

    const result = await organizationService.listOrganizations(value, req.user);

    res.status(200).json({
      success: true,
      message: 'Organizations retrieved successfully',
      data: result
    });
  });

  getOrganizationsByName = asyncHandler(async (req, res) => {
    const { error, value } = organizationNameQuerySchema.validate(req.query);
    if (error) {
      return sendValidationError(res, error);
    }

    const result = await organizationService.getOrganizationsByName(value.name, req.user, value);

    res.status(200).json({
      success: true,
      message: 'Organizations retrieved successfully',
      data: result
    });
  });

  getOrganizationsByOwnerName = asyncHandler(async (req, res) => {
    const { error, value } = ownerNameQuerySchema.validate(req.query);
    if (error) {
      return sendValidationError(res, error);
    }

    const result = await organizationService.getOrganizationsByOwnerName(value.ownerName, req.user, value);

    res.status(200).json({
      success: true,
      message: 'Organizations retrieved successfully',
      data: result
    });
  });

  createOrganization = asyncHandler(async (req, res) => {
    const { error, value } = createOrganizationSchema.validate(req.body);
    if (error) {
      return sendValidationError(res, error);
    }

    const organization = await organizationService.createOrganization(value, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: organization
    });
  });

  getOrganization = asyncHandler(async (req, res) => {
    const { error, value } = organizationIdSchema.validate(req.params);
    if (error) {
      return sendValidationError(res, error);
    }

    const organization = await organizationService.getOrganizationById(value.organizationId, req.user);

    res.status(200).json({
      success: true,
      message: 'Organization retrieved successfully',
      data: organization
    });
  });

  updateOrganization = asyncHandler(async (req, res) => {
    const paramsValidation = organizationIdSchema.validate(req.params);
    if (paramsValidation.error) {
      return sendValidationError(res, paramsValidation.error);
    }

    const bodyValidation = updateOrganizationSchema.validate(req.body);
    if (bodyValidation.error) {
      return sendValidationError(res, bodyValidation.error);
    }

    const organization = await organizationService.updateOrganization(
      paramsValidation.value.organizationId,
      bodyValidation.value,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Organization updated successfully',
      data: organization
    });
  });

  deleteOrganization = asyncHandler(async (req, res) => {
    const { error, value } = organizationIdSchema.validate(req.params);
    if (error) {
      return sendValidationError(res, error);
    }

    await organizationService.deleteOrganization(value.organizationId, req.user);

    res.status(200).json({
      success: true,
      message: 'Organization deleted successfully'
    });
  });

  deleteAllOrganizations = asyncHandler(async (req, res) => {
    const result = await organizationService.deleteAllOrganizations(req.user);
    res.status(200).json({
      success: true,
      message: 'All organizations deleted successfully',
      data: result

    });
  });

  getMembers = asyncHandler(async (req, res) => {
    const { error, value } = organizationIdSchema.validate(req.params);
    if (error) {
      return sendValidationError(res, error);
    }

    const members = await organizationService.getMembers(value.organizationId);

    res.status(200).json({
      success: true,
      message: 'Members retrieved successfully',
      data: members
    });
  });

  addMember = asyncHandler(async (req, res) => {
    const paramsValidation = organizationIdSchema.validate(req.params);
    if (paramsValidation.error) {
      return sendValidationError(res, paramsValidation.error);
    }

    const bodyValidation = addMemberSchema.validate(req.body);
    if (bodyValidation.error) {
      return sendValidationError(res, bodyValidation.error);
    }

    const member = await organizationService.addMember(
      paramsValidation.value.organizationId,
      bodyValidation.value,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      data: member
    });
  });

  updateMember = asyncHandler(async (req, res) => {
    const paramsValidation = memberIdSchema.validate(req.params);
    if (paramsValidation.error) {
      return res.status(400).json({
        success: false,
        error: paramsValidation.error.details[0].message
      });
    }

    const bodyValidation = updateMemberSchema.validate(req.body);
    if (bodyValidation.error) {
      return res.status(400).json({
        success: false,
        error: bodyValidation.error.details[0].message
      });
    }

    const member = await organizationService.updateMember(
      paramsValidation.value.organizationId,
      paramsValidation.value.memberId,
      bodyValidation.value,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: 'Member updated successfully',
      data: member
    });
  });

  removeMember = asyncHandler(async (req, res) => {
    const { error, value } = memberIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    await organizationService.removeMember(
      value.organizationId,
      value.memberId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });
  });


  searchOrganizations = asyncHandler(async (req, res) => {
    const { error, value } = paginationSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const result = await organizationRepository.getAllOrganizations(value);

    res.status(200).json({
      success: true,
      ...result
    });
  });

  submitVerification = asyncHandler(async (req, res) => {
    const paramsValidation = organizationIdSchema.validate(req.params);
    if (paramsValidation.error) {
      return res.status(400).json({
        success: false,
        error: paramsValidation.error.details[0].message
      });
    }

    const bodyValidation = submitVerificationSchema.validate(req.body);
    if (bodyValidation.error) {
      return res.status(400).json({
        success: false,
        error: bodyValidation.error.details[0].message
      });
    }

    const organization = await organizationService.submitVerification(
      paramsValidation.value.organizationId,
      bodyValidation.value,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: 'Organization verification submitted successfully',
      data: organization
    });
  });

  approve = asyncHandler(async (req, res) => {
    const { error, value } = organizationIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const organization = await organizationService.approveOrganization(value.organizationId, req.user.id);
    res.status(200).json({ success: true, message: 'Organization approved', data: organization });
  });

  reject = asyncHandler(async (req, res) => {
    const { error, value } = organizationIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }
    const organization = await organizationService.rejectOrganization(value.organizationId, req.user.id);
    res.status(200).json({ success: true, message: 'Organization rejected', data: organization });
  });

  validateDomain = asyncHandler(async (req, res) => {
    const { error, value } = organizationIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const result = await organizationService.validateDomain(value.organizationId, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Domain validation successful',
      data: result
    });
  });


}


export default new OrganizationController();
