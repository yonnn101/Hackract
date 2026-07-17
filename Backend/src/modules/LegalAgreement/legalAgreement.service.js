import legalAgreementRepository from './legalAgreement.repository.js';
import AppError from '../../utils/AppError.js';
import { LegalAgreementErrorCodes } from './legalAgreement.constants.js';

export const createAgreement = async (data) => {
    return await legalAgreementRepository.createAgreement(data);
};

export const getAllAgreements = async (filters) => {
    return await legalAgreementRepository.findAll(filters);
};

export const getAgreementById = async (id) => {
    const agreement = await legalAgreementRepository.findById(id);
    if (!agreement) throw new AppError('Legal agreement not found', 404, LegalAgreementErrorCodes.NOT_FOUND);
    return agreement;
};

export const getActiveAgreementByType = async (type) => {
    const agreement = await legalAgreementRepository.findActiveByType(type);
    if (!agreement) throw new AppError('No active agreement found for this type', 404, LegalAgreementErrorCodes.NOT_FOUND);
    return agreement;
};

export const updateAgreement = async (id, data) => {
    return await legalAgreementRepository.updateAgreement(id, data);
};

export const deleteAgreement = async (id) => {
    return await legalAgreementRepository.deleteAgreement(id);
};

export const notifyUsers = async (id) => {
    const agreement = await getAgreementById(id);
    // In a real implementation this would trigger email/in-app notifications
    console.log(`[Platform Notification]: The legal agreement "${agreement.title}" (v${agreement.version}) has been updated. Please review the new terms.`);
    return { notified: true, agreementId: id };
};
