import { ZodError } from 'zod';

const validateRequest = (schema) => async (req, res, next) => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        return next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.errors,
            });
        }
        return res.status(400).json({
            success: false,
            message: 'Invalid request',
        });
    }
};

export default validateRequest;
