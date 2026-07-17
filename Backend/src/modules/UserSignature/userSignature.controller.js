import * as service from './userSignature.service.js';
import { signAgreementSchema } from './userSignature.schema.js';

export const sign = async (req, res, next) => {
    try {
        const { agreementId, signatureData } = signAgreementSchema.parse(req.body);
        const userId = req.user.id;
        const ipAddress = req.ip || req.connection?.remoteAddress;
        const userAgent = req.headers?.['user-agent'];

        res.status(201).json(await service.signAgreement(userId, agreementId, ipAddress, userAgent, signatureData));
    } catch (e) { next(e); }
};

export const getMySignatures = async (req, res, next) => {
    try {
        res.json(await service.getUserSignatures(req.user.id));
    } catch (e) { next(e); }
};

export const getSignaturesByAgreement = async (req, res, next) => {
    try {
        res.json(await service.getAgreementSignatures(req.params.agreementId));
    } catch (e) { next(e); }
};

export const checkSigned = async (req, res, next) => {
    try {
        const { agreementId } = req.params;
        const signed = await service.checkIfSigned(req.user.id, agreementId);
        res.json({ signed });
    } catch (e) { next(e); }
};

export const get = async (req, res, next) => {
    try {
        res.json(await service.getSignatureById(req.params.id));
    } catch (e) { next(e); }
};
