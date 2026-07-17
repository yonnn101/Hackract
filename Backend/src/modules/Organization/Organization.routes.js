import express from 'express';
import organizationController from './Organization.controller.js';
import * as organizationMiddleware from './Organization.middleware.js';
import { protect, restrictTo } from '../../middleware/Auth.middleware.js';

const router = express.Router();

// Apply global authentication to all organization routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Organizations
 *   description: Organization management APIs
 */

/**
 * @swagger
 * /api/v1/organization:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: HackRact Security
 *               slug:
 *                 type: string
 *                 example: hackract-security
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', restrictTo('ORG_ADMIN'), organizationController.createOrganization);

/**
 * @swagger
 * /api/v1/organizations:
 *   get:
 *     summary: List organizations
 *     description: ORG_ADMIN can list all organizations; other roles list organizations they are members of.
 *     tags: [Organizations]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by organization name (contains)
 *       - in: query
 *         name: ownerName
 *         schema:
 *           type: string
 *         description: Filter by owner name/handle/email (contains). ORG_ADMIN only.
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully
 *       401:
 *         description: Unauthorized
 */
// List organizations (SUPER_ADMIN => all; others => memberships)
router.get('/', restrictTo('ORG_ADMIN', 'PROJECT_ADMIN', 'PENTESTER'), organizationController.listOrganizations);

/**
 * @swagger
 * /api/v1/organizations/by-name:
 *   get:
 *     summary: Get organizations by name
 *     tags: [Organizations]
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization name (contains)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully
 *       400:
 *         description: Validation error
 */
/**
 * @swagger
 * /api/v1/organizations/by-owner:
 *   get:
 *     summary: Get organizations by owner name
 *     description: ORG_ADMIN only.
 *     tags: [Organizations]
 *     parameters:
 *       - in: query
 *         name: ownerName
 *         required: true
 *         schema:
 *           type: string
 *         description: Owner full name, handle, or email (contains)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully
 *       403:
 *         description: Forbidden
 */
// Search / filter helpers
router.get('/by-name', restrictTo('ORG_ADMIN', 'PROJECT_ADMIN', 'PENTESTER'), organizationController.getOrganizationsByName);
router.get('/by-owner', restrictTo('ORG_ADMIN'), organizationController.getOrganizationsByOwnerName);

/**
 * @swagger
 * /api/v1/organizations:
 *   delete:
 *     summary: Delete all organizations
 *     description: DANGEROUS. ORG_ADMIN only.
 *     tags: [Organizations]
 *     responses:
 *       200:
 *         description: All organizations deleted successfully
 *       403:
 *         description: Forbidden
 */
// Delete all organizations (DANGEROUS) - ORG_ADMIN only
router.delete('/', restrictTo('ORG_ADMIN'), organizationController.deleteAllOrganizations);

/**
 * @swagger
 * /api/v1/organizations/{organizationId}:
 *   get:
 *     summary: Get organization details
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization details
 *       404:
 *         description: Organization not found
 *
 *   patch:
 *     summary: Update organization
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization updated
 *
 *   delete:
 *     summary: Delete organization
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization deleted
 */
router.route('/:organizationId')
  .get(
    organizationMiddleware.isOrganizationMember,
    organizationController.getOrganization
  )
  .patch(
    organizationMiddleware.isOrganizationMember,
    organizationMiddleware.hasOrganizationPermission('manage_settings'),
    organizationController.updateOrganization
  )
  .delete(
    organizationMiddleware.isOrganizationOwner,
    organizationController.deleteOrganization
  );


router.post('/:organizationId/submit-verification',
  organizationMiddleware.isOrganizationOwner,
  organizationController.submitVerification
);

router.post('/:organizationId/validate-domain',
  organizationMiddleware.isOrganizationMember,
  organizationMiddleware.hasOrganizationPermission('manage_settings'),
  organizationController.validateDomain
);

/**
 * @swagger
 * /api/v1/organizations/{organizationId}/members:
 *   get:
 *     summary: Get organization members
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of members
 *
 *   post:
 *     summary: Add member to organization
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@hackract.com
 *               role:
 *                 type: string
 *                 example: member
 *     responses:
 *       201:
 *         description: Member added
 */
router.route('/:organizationId/members')
  .get(
    organizationMiddleware.isOrganizationMember,
    organizationController.getMembers
  )
  .post(
    organizationMiddleware.hasOrganizationPermission('invite_members'),
    organizationController.addMember
  );

/**
 * @swagger
 * /api/v1/organizations/{organizationId}/members/{memberId}:
 *   patch:
 *     summary: Update organization member
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *       - in: path
 *         name: memberId
 *         required: true
 *     responses:
 *       200:
 *         description: Member updated
 *
 *   delete:
 *     summary: Remove organization member
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *       - in: path
 *         name: memberId
 *         required: true
 *     responses:
 *       200:
 *         description: Member removed
 */
router.route('/:organizationId/members/:memberId')
  .patch(
    organizationMiddleware.hasOrganizationPermission('invite_members'),
    organizationController.updateMember
  )
  .delete(
    organizationMiddleware.hasOrganizationPermission('invite_members'),
    organizationController.removeMember
  );

/**
 * @swagger
 * /api/v1/organizations/{organizationId}/leave:
 *   post:
 *     summary: Leave organization
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *     responses:
 *       200:
 *         description: Left organization successfully
 */
// router.post('/:organizationId/leave',
//   organizationMiddleware.isOrganizationMember,
//   organizationController.leaveOrganization
// );

/**
 * @swagger
 * /api/v1/organizations/{organizationId}/transfer-ownership:
 *   post:
 *     summary: Transfer organization ownership
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newOwnerId
 *             properties:
 *               newOwnerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ownership transferred
 */
// router.post('/:organizationId/transfer-ownership',
//   organizationMiddleware.isOrganizationOwner,
//   organizationController.transferOwnership
// );

/**
 * @swagger
 * /api/v1/organizations/{organizationId}/stats:
 *   get:
 *     summary: Get organization statistics
 *     tags: [Organizations]
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *     responses:
 *       200:
 *         description: Organization statistics
 */
// router.get('/:organizationId/stats',
//   organizationMiddleware.isOrganizationMember,
//   organizationController.getStatistics
// );

// Admin Verification Routes
router.post('/:organizationId/approve',
  protect,
  restrictTo('ORG_ADMIN'),
  organizationController.approve
);

router.post('/:organizationId/reject',
  protect,
  restrictTo('ORG_ADMIN'),
  organizationController.reject
);


export default router;
