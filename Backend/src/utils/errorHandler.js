// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Handle operational errors (AppError)
    if (err.isOperational && err.toJSON) {
        return res.status(err.statusCode).json(err.toJSON());
    }

    // Handle Prisma errors
    if (err.code && err.code.startsWith('P')) {
        let message = 'Database error';
        let statusCode = 500;
        let errorCode = 'DATABASE_ERROR';

        if (err.code === 'P2002') {
            message = 'A record with this value already exists';
            statusCode = 409;
            errorCode = 'DUPLICATE_ENTRY';
        } else if (err.code === 'P2025') {
            message = 'Record not found';
            statusCode = 404;
            errorCode = 'NOT_FOUND';
        }

        return res.status(statusCode).json({
            success: false,
            error: message,
            errorCode,
            ...(process.env.NODE_ENV === 'development' && { details: err.meta }),
            timestamp: new Date().toISOString(),
        });
    }

    // Handle validation errors (Joi/Zod)
    if (err.name === 'ValidationError') {
        return res.status(422).json({
            success: false,
            error: 'Validation failed',
            errorCode: 'VALIDATION_ERROR',
            details: { errors: err.details || err.errors },
            timestamp: new Date().toISOString(),
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token',
            errorCode: 'INVALID_TOKEN',
            timestamp: new Date().toISOString(),
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired',
            errorCode: 'EXPIRED_TOKEN',
            timestamp: new Date().toISOString(),
        });
    }

    // Default error response
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: message,
        errorCode: err.errorCode || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        timestamp: new Date().toISOString(),
    });
});

export default app;
