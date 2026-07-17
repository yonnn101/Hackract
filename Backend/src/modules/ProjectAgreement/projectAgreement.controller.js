import asyncHandler from '../../utils/AsyncHandler.js';
import * as projectAgreementService from './projectAgreement.service.js';

export const getActiveAgreement = asyncHandler(async (req, res) => {
    const { id: pentestId } = req.params;
    const agreement = await projectAgreementService.getActiveAgreement(pentestId);

    let signed = false;
    if (req.user && req.user.role === 'PENTESTER') {
        signed = await projectAgreementService.checkHackerSigned(pentestId, req.user.id);
    }

    res.status(200).json({
        status: 'success',
        data: { agreement, signed }
    });
});

export const createAgreement = asyncHandler(async (req, res) => {
    const { id: pentestId } = req.params;
    const orgId = req.user.organizationId;
    const orgAdminId = req.user.id;

    const agreement = await projectAgreementService.createAgreement(pentestId, orgAdminId, orgId, req.body);

    res.status(201).json({
        status: 'success',
        data: agreement
    });
});

export const signAgreement = asyncHandler(async (req, res) => {
    const { id: pentestId } = req.params;
    const hackerId = req.user.id;
    const { signatureData } = req.body;
    
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const acceptance = await projectAgreementService.signAgreement(pentestId, hackerId, signatureData, ipAddress, userAgent);

    res.status(200).json({
        status: 'success',
        data: acceptance
    });
});
