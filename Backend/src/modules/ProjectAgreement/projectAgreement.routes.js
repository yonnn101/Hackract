import express from 'express';
import * as projectAgreementController from './projectAgreement.controller.js';
import { protect, restrictTo } from '../../middleware/auth.middleware.js';
import validateRequest from '../../middleware/validateRequest.js';
import { createProjectAgreementSchema, signProjectAgreementSchema } from './projectAgreement.schema.js';

const router = express.Router();

router.use(protect);

// Hacker route to sign agreement
router.post(
    '/:id/agreements/active/sign',
    restrictTo('PENTESTER'),
    validateRequest(signProjectAgreementSchema),
    projectAgreementController.signAgreement
);

// Get active agreement (Both Org and Hacker need this)
router.get(
    '/:id/agreements/active',
    projectAgreementController.getActiveAgreement
);

// Org route to create/update agreement
router.post(
    '/:id/agreements',
    restrictTo('ORG_ADMIN'),
    validateRequest(createProjectAgreementSchema),
    projectAgreementController.createAgreement
);

export default router;
