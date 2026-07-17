/**
 * Standardized API Response Utility
 * Provides consistent response format across all API endpoints
 */

class ApiResponse {
    /**
     * Send success response
     */
    static success(res, data = null, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Send error response
     */
    static error(res, message = 'Error', statusCode = 500, errorCode = null, details = null) {
        const response = {
            success: false,
            error: message,
            errorCode,
            timestamp: new Date().toISOString(),
        };

        if (details) {
            response.details = details;
        }

        if (process.env.NODE_ENV === 'development' && details?.stack) {
            response.stack = details.stack;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Send created response (201)
     */
    static created(res, data = null, message = 'Resource created successfully') {
        return this.success(res, data, message, 201);
    }

    /**
     * Send no content response (204)
     */
    static noContent(res) {
        return res.status(204).send();
    }

    /**
     * Send bad request response (400)
     */
    static badRequest(res, message = 'Bad request', errorCode = 'BAD_REQUEST', details = null) {
        return this.error(res, message, 400, errorCode, details);
    }

    /**
     * Send unauthorized response (401)
     */
    static unauthorized(res, message = 'Unauthorized', errorCode = 'UNAUTHORIZED') {
        return this.error(res, message, 401, errorCode);
    }

    /**
     * Send forbidden response (403)
     */
    static forbidden(res, message = 'Forbidden', errorCode = 'FORBIDDEN', details = null) {
        return this.error(res, message, 403, errorCode, details);
    }

    /**
     * Send not found response (404)
     */
    static notFound(res, message = 'Resource not found', errorCode = 'NOT_FOUND') {
        return this.error(res, message, 404, errorCode);
    }

    /**
     * Send conflict response (409)
     */
    static conflict(res, message = 'Resource already exists', errorCode = 'CONFLICT') {
        return this.error(res, message, 409, errorCode);
    }

    /**
     * Send validation error response (422)
     */
    static validationError(res, errors, message = 'Validation failed') {
        return this.error(res, message, 422, 'VALIDATION_ERROR', { errors });
    }

    /**
     * Send internal server error response (500)
     */
    static serverError(res, message = 'Internal server error', errorCode = 'INTERNAL_ERROR') {
        return this.error(res, message, 500, errorCode);
    }

    /**
     * Send paginated response
     */
    static paginated(res, data, pagination, message = 'Success') {
        return res.status(200).json({
            success: true,
            message,
            data,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                totalPages: pagination.totalPages,
                hasNextPage: pagination.hasNextPage,
                hasPrevPage: pagination.hasPrevPage,
            },
            timestamp: new Date().toISOString(),
        });
    }
}

export default ApiResponse;
