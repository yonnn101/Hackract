import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import bcrypt from 'bcrypt';
import dayjs from 'dayjs';
import { sendNationalIdOtpEmail } from '../../utils/email.js';

class NationalIDService {
    /**
     * Helper to format citizen response with ordered full name
     */
    formatResponse(citizen) {
        if (!citizen) return null;
        const { firstName, middleName, lastName, nationalIDVerification, ...rest } = citizen;
        const fullName = [firstName, middleName, lastName]
            .filter(Boolean)
            .join(' ');
        
        return {
            ...rest,
            firstName,
            middleName,
            lastName,
            fullName: fullName || 'N/A',
            nationalIDVerification: nationalIDVerification || null
        };
    }

    /**
     * Create a new National ID record in the registry
     */
    async create(data, userId) {
        const { fan, email, firstName, middleName, lastName } = data;
        
        if (!fan || !email) {
            throw new AppError('FAN and Email are required', 400);
        }

        const normalizedEmail = email.toLowerCase();
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user.email.toLowerCase() !== normalizedEmail) {
            throw new AppError(
                'The email on your Hackract account does not match the government-registered email for this FAN.',
                400,
                'FAN_EMAIL_MISMATCH',
                { fanExists: false, emailMatched: false, delivered: false }
            );
        }

        const exists = await prisma.citizen.findFirst({
            where: {
                OR: [
                    { fan },
                    { email: normalizedEmail }
                ]
            }
        });

        if (exists) {
            if (exists.fan === fan) {
                if (exists.email.toLowerCase() !== normalizedEmail) {
                    throw new AppError(
                        'This FAN already exists, but the submitted email does not match the government-registered email.',
                        400,
                        'FAN_EMAIL_MISMATCH',
                        { fanExists: true, emailMatched: false, delivered: false }
                    );
                }

                const result = await this.initiateVerification(userId, fan);
                return {
                    ...result,
                    created: false,
                    fanAlreadyExists: true,
                    message: result.delivered
                        ? 'FAN already exists and email matched. OTP sent successfully to the email registered on National ID.'
                        : result.message
                };
            }
            if (exists.email === normalizedEmail) {
                throw new AppError(
                    'This email is already registered to a different FAN in the Government Registry.',
                    400,
                    'FAN_EMAIL_ALREADY_REGISTERED',
                    { fanExists: false, emailMatched: true, delivered: false }
                );
            }
        }

        const citizen = await prisma.citizen.create({
            data: {
                fan,
                email: normalizedEmail,
                firstName,
                middleName,
                lastName
            }
        });

        let verificationRecord = null;
        let isSameEmail = false;

        if (userId) {
            verificationRecord = await prisma.nationalIDVerification.upsert({
                where: { userId },
                update: { citizenId: citizen.id, verificationStatus: 'DRAFT' },
                create: { userId, citizenId: citizen.id, verificationStatus: 'DRAFT' }
            });

            isSameEmail = true;

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpHash = await bcrypt.hash(otp, 12);
            const expiresAt = dayjs().add(10, 'minute').toDate();

            await prisma.otpVerification.create({
                data: {
                    citizenId: citizen.id,
                    otpHash,
                    expiresAt
                }
            });

            const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
            const verifyUrl = `${frontendBase}/national-id-verification?fan=${encodeURIComponent(citizen.fan)}`;

            let emailError = null;
            try {
                await sendNationalIdOtpEmail({
                    to: citizen.email,
                    name: citizen.firstName ? `${citizen.firstName} ${citizen.lastName || ''}`.trim() : 'Citizen',
                    code: otp,
                    verifyUrl,
                    expiresAt
                });
            } catch (error) {
                emailError = error.message;
            }

            const formatted = this.formatResponse({ ...citizen, nationalIDVerification: verificationRecord });
            
            formatted.message = emailError 
                ? 'Citizen record created, but we could not send the verification OTP.'
                : 'Citizen record created and verification OTP sent successfully to the email registered on National ID';
            
            if (emailError) {
                formatted.error = emailError;
            }
            
            formatted.isSameEmail = isSameEmail;
            formatted.fanExists = true;
            formatted.emailMatched = true;
            formatted.delivered = !emailError;
            formatted.created = true;
            return formatted;
        }

        return this.formatResponse({ ...citizen, nationalIDVerification: verificationRecord });
    }

    /**
     * Retrieve all National ID records
     */
    async findAll(query = {}) {
        const where = {};
        if (query.fan) where.fan = query.fan;
        if (query.email) where.email = query.email.toLowerCase();

        const citizens = await prisma.citizen.findMany({ 
            where,
            include: { nationalIDVerification: true }
        });
        return citizens.map(c => this.formatResponse(c));
    }

    /**
     * Retrieve a National ID record by ID
     */
    async findById(id) {
        const citizen = await prisma.citizen.findUnique({ 
            where: { id },
            include: { nationalIDVerification: true }
        });
        if (!citizen) throw new AppError('Citizen not found', 404);
        return this.formatResponse(citizen);
    }

    /**
     * Update an existing National ID record by ID
     */
    async update(id, data, userId) {
        const existing = await prisma.citizen.findUnique({ where: { id } });
        if (!existing) throw new AppError('Citizen not found', 404);

        const { fan, email, firstName, middleName, lastName } = data;

        // Check if new fan or email already exists in another record
        if (fan || email) {
            const normalizedEmail = email ? email.toLowerCase() : undefined;
            const conflict = await prisma.citizen.findFirst({
                where: {
                    AND: [
                        { id: { not: id } },
                        {
                            OR: [
                                ...(fan ? [{ fan }] : []),
                                ...(normalizedEmail ? [{ email: normalizedEmail }] : [])
                            ]
                        }
                    ]
                }
            });

            if (conflict) {
                if (conflict.fan === fan) throw new AppError('FAN already exists', 400);
                if (conflict.email === normalizedEmail) throw new AppError('Email already exists', 400);
            }
        }

        const citizen = await prisma.citizen.update({
            where: { id },
            data: { 
                fan: fan || undefined,
                email: email?.toLowerCase() || undefined,
                firstName: firstName !== undefined ? firstName : undefined,
                middleName: middleName !== undefined ? middleName : undefined,
                lastName: lastName !== undefined ? lastName : undefined
            },
            include: { nationalIDVerification: true }
        });

        if (userId) {
            const verificationRecord = await prisma.nationalIDVerification.upsert({
                where: { userId },
                update: { citizenId: citizen.id },
                create: { userId, citizenId: citizen.id, verificationStatus: 'DRAFT' }
            });
            citizen.nationalIDVerification = verificationRecord;
        }

        return this.formatResponse(citizen);
    }

    /**
     * Delete a National ID record by ID
     */
    async delete(id) {
        const existing = await prisma.citizen.findUnique({ where: { id } });
        if (!existing) throw new AppError('Citizen not found', 404);

        await prisma.nationalIDVerification.updateMany({
            where: { citizenId: id },
            data: { citizenId: null, verificationStatus: 'DRAFT' }
        });
        await prisma.otpVerification.deleteMany({
            where: { citizenId: id }
        });

        return prisma.citizen.delete({
            where: { id }
        });
    }

    /**
     * Delete all National ID records
     */
    async deleteAll() {
        await prisma.nationalIDVerification.updateMany({
            data: { citizenId: null, verificationStatus: 'DRAFT' }
        });
        await prisma.otpVerification.deleteMany({});
        return prisma.citizen.deleteMany({});
    }

    /**
     * Initiate National ID Verification
     */
    async initiateVerification(userId, fan) {
        if (!fan) throw new AppError('FAN is required', 400);

        const citizen = await prisma.citizen.findUnique({ where: { fan } });
        if (!citizen) {
            throw new AppError(
                'This FAN does not exist in the Government Registry.',
                404,
                'FAN_NOT_FOUND',
                { fanExists: false, emailMatched: false, delivered: false }
            );
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const isSameEmail = user.email.toLowerCase() === citizen.email.toLowerCase();
        if (!isSameEmail) {
            throw new AppError(
                'The email on your Hackract account does not match the government-registered email for this FAN.',
                400,
                'FAN_EMAIL_MISMATCH',
                { fanExists: true, emailMatched: false, delivered: false }
            );
        }

        await prisma.nationalIDVerification.upsert({
            where: { userId },
            update: { citizenId: citizen.id, verificationStatus: 'DRAFT', verifiedAt: null },
            create: { userId, citizenId: citizen.id, verificationStatus: 'DRAFT' }
        });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 12);
        const expiresAt = dayjs().add(10, 'minute').toDate();

        await prisma.otpVerification.create({
            data: {
                citizenId: citizen.id,
                otpHash,
                expiresAt
            }
        });

        const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        const verifyUrl = `${frontendBase}/national-id-verification?fan=${encodeURIComponent(citizen.fan)}`;

        let emailError = null;
        try {
            await sendNationalIdOtpEmail({
                to: citizen.email,
                name: citizen.firstName ? `${citizen.firstName} ${citizen.lastName || ''}`.trim() : 'Citizen',
                code: otp,
                verifyUrl,
                expiresAt
            });
        } catch (error) {
            emailError = error.message;
        }

        return {
            message: emailError
                ? 'OTP created, but we could not send the verification email.'
                : 'OTP sent successfully to the email registered on National ID',
            fanExists: true,
            isSameEmail,
            emailMatched: true,
            delivered: !emailError
        };
    }

    /**
     * Verify National ID OTP
     */
    async verifyOtp(userId, fan, otp) {
        if (!fan || !otp) throw new AppError('FAN and OTP are required', 400);

        const citizen = await prisma.citizen.findUnique({ where: { fan } });
        if (!citizen) {
            throw new AppError(
                'This FAN does not exist in the Government Registry.',
                404,
                'FAN_NOT_FOUND',
                { fanExists: false, emailMatched: false }
            );
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const isSameEmail = user.email.toLowerCase() === citizen.email.toLowerCase();
        if (!isSameEmail) {
            throw new AppError(
                'The email on your Hackract account does not match the government-registered email for this FAN.',
                400,
                'FAN_EMAIL_MISMATCH',
                { fanExists: true, emailMatched: false }
            );
        }

        const otpRecord = await prisma.otpVerification.findFirst({
            where: { citizenId: citizen.id, verified: false },
            orderBy: { createdAt: 'desc' }
        });

        if (!otpRecord) throw new AppError('No pending OTP found', 400);

        if (dayjs(otpRecord.expiresAt).isBefore(dayjs())) {
            throw new AppError('OTP expired', 400);
        }

        const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
        if (!isValid) throw new AppError('Invalid OTP', 400);

        await prisma.otpVerification.update({
            where: { id: otpRecord.id },
            data: { verified: true }
        });

        await prisma.nationalIDVerification.update({
            where: { userId },
            data: { verificationStatus: 'APPROVED', verifiedAt: new Date() }
        });

        return {
            message: 'National ID verified successfully',
            fanExists: true,
            emailMatched: true,
            verified: true
        };
    }

    async getStatus(userId) {
        const verification = await prisma.nationalIDVerification.findUnique({
            where: { userId },
            include: { citizen: true }
        });

        return {
            verificationStatus: verification?.verificationStatus || 'NOT_STARTED',
            verifiedAt: verification?.verifiedAt,
            isVerified: verification?.verificationStatus === 'APPROVED' || verification?.verificationStatus === 'VERIFIED',
            citizen: verification?.citizen
        };
    }
}

export default new NationalIDService();
