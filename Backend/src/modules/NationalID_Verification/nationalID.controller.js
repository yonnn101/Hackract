import asyncHandler from '../../utils/AsyncHandler.js';
import nationalIDService from './nationalID.service.js';
import ApiResponse from '../../utils/ApiResponse.js';

export const create = asyncHandler(async (req, res) => {
    const data = req.validatedBody || req.body;
    const result = await nationalIDService.create(data, req.user.id);
    ApiResponse.success(res, result, result.message || 'National ID verification started', result.created ? 201 : 200);
});

export const getAll = asyncHandler(async (req, res) => {
    const query = req.query;
    const result = await nationalIDService.findAll(query);
    ApiResponse.success(res, result, 'Citizen records retrieved');
});

export const getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await nationalIDService.findById(id);
    ApiResponse.success(res, result, 'Citizen record retrieved');
});

export const update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = req.validatedBody || req.body;
    const result = await nationalIDService.update(id, data);
    ApiResponse.success(res, result, 'Citizen record updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await nationalIDService.delete(id);
    ApiResponse.success(res, null, 'Citizen record deleted successfully');
});

export const removeAll = asyncHandler(async (req, res) => {
    await nationalIDService.deleteAll();
    ApiResponse.success(res, null, 'All Citizen records deleted successfully');
});

export const initiateVerification = asyncHandler(async (req, res) => {
    const { fan } = req.body;
    const userId = req.user.id;
    const result = await nationalIDService.initiateVerification(userId, fan);
    ApiResponse.success(res, result, result.message);
});

export const verifyOtp = asyncHandler(async (req, res) => {
    const { fan, otp } = req.body;
    const userId = req.user.id;
    const result = await nationalIDService.verifyOtp(userId, fan, otp);
    ApiResponse.success(res, result, result.message);
});

export const getStatus = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await nationalIDService.getStatus(userId);
    ApiResponse.success(res, result, 'Verification status retrieved');
});
