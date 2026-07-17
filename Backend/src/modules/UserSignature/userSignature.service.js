import userSignatureRepository from './userSignature.repository.js';
import AppError from '../../utils/AppError.js';
import { UserSignatureErrorCodes } from './userSignature.constants.js';

export const signAgreement = async (userId, agreementId, ipAddress, userAgent, signatureData) => {
    // Check if already signed
    const alreadySigned = await userSignatureRepository.checkUserSigned(userId, agreementId);
    if (alreadySigned) {
        throw new AppError('You have already signed this agreement', 409, UserSignatureErrorCodes.ALREADY_SIGNED);
    }

    return await userSignatureRepository.createSignature({
        userId,
        agreementId,
        ipAddress,
        userAgent,
        signatureData
    });
};

export const getUserSignatures = async (userId) => {
    return await userSignatureRepository.findByUserId(userId);
};

export const getAgreementSignatures = async (agreementId) => {
    return await userSignatureRepository.findByAgreementId(agreementId);
};

export const checkIfSigned = async (userId, agreementId) => {
    return await userSignatureRepository.checkUserSigned(userId, agreementId);
};

export const getSignatureById = async (id) => {
    const signature = await userSignatureRepository.findById(id);
    if (!signature) throw new AppError('Signature not found', 404, UserSignatureErrorCodes.NOT_FOUND);
    return signature;
};
