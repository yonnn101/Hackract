import * as service from './legalAgreement.service.js';
import { createAgreementSchema, updateAgreementSchema } from './legalAgreement.schema.js';
import { normalizeAgreementType } from './legalAgreement.constants.js';
import { getS3ObjectText } from '../../utils/s3Upload.js';

export const create = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.file?.key) {
      payload.content = await getS3ObjectText(req.file.key);
    }

    res.status(201).json(await service.createAgreement(createAgreementSchema.parse(payload)));
  } catch (e) { next(e); }
};

export const list = async (req, res, next) => {
  try {
    const hasIsActive = Object.prototype.hasOwnProperty.call(req.query, 'isActive');
    const isActive = hasIsActive
      ? String(req.query.isActive).toLowerCase() === 'true'
      : undefined;

    const filters = {
      type: req.query.type,
      isActive,
    };
    res.json(await service.getAllAgreements(filters));
  } catch (e) { next(e); }
};

export const get = async (req, res, next) => {
  try {
    res.json(await service.getAgreementById(req.params.id));
  } catch (e) { next(e); }
};

export const getActiveByType = async (req, res, next) => {
  try {
    res.json(await service.getActiveAgreementByType(normalizeAgreementType(req.params.type)));
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.file?.key) {
      payload.content = await getS3ObjectText(req.file.key);
    }

    res.json(await service.updateAgreement(req.params.id, updateAgreementSchema.parse(payload)));
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    await service.deleteAgreement(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
};

export const notify = async (req, res, next) => {
  try {
    res.json(await service.notifyUsers(req.params.id));
  } catch (e) { next(e); }
};
