export const LegalAgreementErrorCodes = {
    NOT_FOUND: 'LEGAL_AGREEMENT_NOT_FOUND',
    ALREADY_EXISTS: 'LEGAL_AGREEMENT_ALREADY_EXISTS'
};

export const AgreementType = {
    TERMS_OF_SERVICE: 'terms_of_service',
    PRIVACY_POLICY: 'privacy_policy',
    NDA: 'nda',
    SLA: 'sla'
};

export const AgreementTypeValues = Object.values(AgreementType);

export const normalizeAgreementType = (input) => {
    if (input === undefined || input === null) return input;
    const value = String(input).trim();
    if (!value) return value;

    // Accept already-normalized values.
    if (AgreementTypeValues.includes(value)) return value;

    // Accept Swagger-style enum keys.
    const upperKey = value.toUpperCase();
    if (AgreementType[upperKey]) return AgreementType[upperKey];

    return value;
};
