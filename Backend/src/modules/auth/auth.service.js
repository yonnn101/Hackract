import bcrypt from 'bcrypt';
import dayjs from 'dayjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { sendVerificationEmail } from '../../utils/email.js';
import { sendPasswordResetEmail } from '../../utils/email.js';
import { AuthErrorCodes, TOKEN_EXPIRY } from '../auth/auth.constants.js';

const SALT_ROUNDS = 12;

const durationToMs = (input) => {
    if (typeof input === 'number') return input;
    const match = String(input).match(/^(\d+)([smhd])$/i);
    if (!match) return 0;
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return value * (multipliers[unit] || 0);
};

const REFRESH_EXPIRY_MS = durationToMs(TOKEN_EXPIRY.REFRESH_TOKEN) || 7 * 24 * 60 * 60 * 1000;

const USER_PROFILE_INCLUDE = {
    roles: true,
    hackerProfile: {
        select: {
            id: true,
            bio: true,
            country: true,
            yearsOfExperience: true,
            primarySkills: true,
            certifications: true,
            portfolioLinks: true,
            // Exclude `specialization` until DB is migrated to include it
            idDocumentNumber: true,
            githubUsername: true,
            linkedinProfile: true,
            twitter: true,
            status: true,
            reviewNotes: true,
            reviewedById: true,
            createdAt: true,
            updatedAt: true,
        },
    },
    organizations: {
        include: { organization: true },
    },
};

const DEFAULT_PUBLIC_EMAIL_DOMAINS = new Set([
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk',
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
    'icloud.com', 'aol.com', 'proton.me', 'protonmail.com',
    'zoho.com', 'gmx.com',
]);

const getEmailDomain = (email) => {
    if (!email || typeof email !== 'string') return null;
    const atIndex = email.lastIndexOf('@');
    if (atIndex === -1) return null;
    return email.slice(atIndex + 1).trim().toLowerCase();
};

const getPublicEmailDomains = () => {
    const raw = process.env.PUBLIC_EMAIL_DOMAINS;
    if (!raw) return DEFAULT_PUBLIC_EMAIL_DOMAINS;
    return new Set(
        raw.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
    );
};

const isCompanyEmail = (email) => {
    const domain = getEmailDomain(email);
    if (!domain) return { ok: false, domain: null };
    const publicDomains = getPublicEmailDomains();
    return { ok: !publicDomains.has(domain), domain };
};

const slugify = (value) =>
    String(value || '').toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();


class AuthService {
    validateOrganizationEmail(email) {
        const { ok, domain } = isCompanyEmail(email);
        if (!domain) {
            return { isValid: false, domain: null, reason: 'Invalid email format' };
        }
        if (!ok) {
            return {
                isValid: false,
                domain,
                reason: 'Public email domains are not allowed for Organization accounts',
            };
        }
        return { isValid: true, domain, reason: null };
    }

    async assignInitialRole(userId, roleType) {
        // Validate role type
        if (!['PENTESTER', 'PROJECT_ADMIN'].includes(roleType)) {
            throw new AppError('Invalid role selection', 400);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { roles: true },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Prevent reassignment if user already has roles
        if (user.roles?.length > 0) {
            throw new AppError('Role already assigned to this account', 409);
        }

        const roleMeta = {
            PENTESTER: { name: 'Pentester', description: 'Ethical hacking and security research' },
            PROJECT_ADMIN: { name: 'Project Admin', description: 'Project/pentest lead with management permissions' },
        };

        const meta = roleMeta[roleType];

        const role = await prisma.role.upsert({
            where: { type: roleType },
            update: {},
            create: {
                name: meta.name,
                type: roleType,
                description: meta.description,
                permissions: [],
            },
        });

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                roles: { connect: { id: role.id } },
            },
            include: { roles: true },
        });

        return this.sanitizeUser(updatedUser);
    }

    sanitizeUser(user) {
        const { passwordHash, ...safeUser } = user;
        return safeUser;
    }

    async getUserProfile(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: USER_PROFILE_INCLUDE,
        });

        if (!user) return null;

        if (user.hackerProfile) {
            const ratingAggregate = await prisma.review.aggregate({
                where: { subjectId: userId },
                _avg: { rating: true },
                _count: { rating: true },
            });
            user.averageRating = ratingAggregate._avg.rating || 0;
            user.totalReviews = ratingAggregate._count.rating || 0;
        }

        return this.sanitizeUser(user);
    }

    async findUserByEmail(email) {
        if (!email) return null;
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: USER_PROFILE_INCLUDE,
        });
        if (!user) return null;

        if (user.hackerProfile) {
            const ratingAggregate = await prisma.review.aggregate({
                where: { subjectId: user.id },
                _avg: { rating: true },
                _count: { rating: true },
            });
            user.averageRating = ratingAggregate._avg.rating || 0;
            user.totalReviews = ratingAggregate._count.rating || 0;
        }

        return this.sanitizeUser(user);
    }

    generateAccessToken(user) {
        if (!process.env.JWT_ACCESS_SECRET) {
            throw new AppError('Server misconfiguration: missing JWT secret', 500);
        }

        return jwt.sign(
            {
                sub: user.id,
                email: user.email,
                roles: user.roles?.map((role) => role.type) || [],
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN }
        );
    }

    async createRefreshToken(userId, meta) {
        const token = uuidv4();
        const expiresAt = dayjs().add(REFRESH_EXPIRY_MS, 'millisecond').toDate();

        await prisma.refreshToken.create({
            data: {
                token,
                userId,
                expiresAt,
                userAgent: meta?.userAgent,
                ipAddress: meta?.ipAddress,
            },
        });

        return { token, expiresAt };
    }

    async issueTokens(user, meta) {
        const accessToken = this.generateAccessToken(user);
        const refresh = await this.createRefreshToken(user.id, meta);

        return {
            user: this.sanitizeUser(user),
            tokens: {
                accessToken,
                refreshToken: refresh.token,
                accessTokenExpiresIn: TOKEN_EXPIRY.ACCESS_TOKEN,
                refreshTokenExpiresAt: refresh.expiresAt,
            },
        };
    }

    async createEmailVerificationToken(userId) {
        const expiresAt = dayjs().add(durationToMs(TOKEN_EXPIRY.EMAIL_VERIFICATION), 'millisecond').toDate();

        await prisma.emailVerificationToken.deleteMany({ where: { userId } });

        let token = null;
        for (let i = 0; i < 5; i++) {
            const candidate = String(Math.floor(100000 + Math.random() * 900000));
            try {
                await prisma.emailVerificationToken.create({
                    data: {
                        token: candidate,
                        userId,
                        expiresAt,
                    },
                });
                token = candidate;
                break;
            } catch (err) {
                // collision, try again
            }
        }

        if (!token) {
            throw new AppError('Could not create verification code', 500, AuthErrorCodes.EMAIL_DELIVERY_FAILED);
        }

        return { token, expiresAt };
    }

    async sendVerification(user, meta) {
        const verification = await this.createEmailVerificationToken(user.id);
        const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        const verifyUrl = `${frontendBase}/verify-email?email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(verification.token)}`;

        try {
            // Log for dev/debugging
            console.log(`[DEV] Verification token for ${user.email}: ${verification.token}`);
            console.log(`[DEV] Verify URL: ${verifyUrl}`);

            await sendVerificationEmail({
                to: user.email,
                name: user.fullName || user.handle,
                verifyUrl,
                code: verification.token,
                expiresAt: verification.expiresAt,
                ipAddress: meta?.ipAddress,
                userAgent: meta?.userAgent,
            });
            return { ...verification, delivered: true };
        } catch (error) {
            console.error('Failed to send verification email:', error.message);
            // In dev mode, we don't want to block registration if email fails
            // as we already logged the token to the console above.
            return { ...verification, delivered: false };
        }
    }

    async resendVerification(email, meta) {
        if (!email) {
            throw new AppError('Email is required', 400);
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            // Throwing success structure to avoid email enumeration
            return { message: 'If an account exists, a new verification code has been sent.' };
        }

        if (user.isVerified) {
            return { message: 'Account is already verified.' };
        }

        const verification = await this.sendVerification(user, meta);
        return {
            delivered: verification.delivered,
            message: verification.delivered
                ? 'A new verification code has been sent.'
                : 'Could not send verification code. Please try again later.'
        };
    }

    async verifyEmail(token, email) {
        if (!token) {
            throw new AppError('Verification code is required', 400, AuthErrorCodes.VERIFICATION_TOKEN_INVALID);
        }

        const record = await prisma.emailVerificationToken.findFirst({
            where: { token, user: { email: email?.toLowerCase() } },
            include: { user: { include: USER_PROFILE_INCLUDE } },
        });


        if (!record) {
            throw new AppError('Invalid or expired verification token', 400, AuthErrorCodes.VERIFICATION_TOKEN_INVALID);
        }

        if (dayjs(record.expiresAt).isBefore(dayjs())) {
            await prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } });
            throw new AppError('Verification token expired', 410, AuthErrorCodes.VERIFICATION_TOKEN_EXPIRED);
        }

        const user = record.user;
        if (!user) {
            await prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } });
            throw new AppError('User not found', 404, AuthErrorCodes.USER_NOT_FOUND);
        }

        if (user.isVerified) {
            await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
            return { user: this.sanitizeUser(user), message: 'Email already verified' };
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                status: 'ACTIVE',
                emailVerifiedAt: new Date(),
            },
            include: USER_PROFILE_INCLUDE,
        });

        await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

        return {
            user: this.sanitizeUser(updatedUser),
            message: 'Email verified successfully',
        };
    }

    async createPasswordResetToken(userId) {
        const token = uuidv4();
        const expiresAt = dayjs().add(durationToMs(TOKEN_EXPIRY.PASSWORD_RESET), 'millisecond').toDate();

        await prisma.passwordResetToken.deleteMany({ where: { userId } });
        await prisma.passwordResetToken.create({
            data: {
                token,
                userId,
                expiresAt,
            },
        });

        return { token, expiresAt };
    }

    async forgotPassword(email, meta) {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) {
            return { message: 'If an account exists, a reset link has been sent.' };
        }

        const reset = await this.createPasswordResetToken(user.id);
        const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
        const resetUrl = `${frontendBase}/reset-password?token=${reset.token}`;

        await sendPasswordResetEmail({
            to: user.email,
            name: user.fullName || user.handle,
            resetUrl,
            expiresAt: reset.expiresAt,
            ipAddress: meta?.ipAddress,
            userAgent: meta?.userAgent,
        });

        return { message: 'If an account exists, a reset link has been sent.' };
    }

    async resetPassword(token, newPassword) {
        if (!token) {
            throw new AppError('Reset token is required', 400, AuthErrorCodes.RESET_TOKEN_INVALID);
        }

        const record = await prisma.passwordResetToken.findUnique({ where: { token } });
        if (!record) {
            throw new AppError('Invalid or expired reset token', 400, AuthErrorCodes.RESET_TOKEN_INVALID);
        }

        if (dayjs(record.expiresAt).isBefore(dayjs()) || record.used) {
            throw new AppError('Reset token expired', 410, AuthErrorCodes.RESET_TOKEN_EXPIRED);
        }

        const user = await prisma.user.findUnique({ where: { id: record.userId } });
        if (!user) {
            throw new AppError('User not found', 404, AuthErrorCodes.USER_NOT_FOUND);
        }

        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
            prisma.passwordResetToken.update({ where: { token }, data: { used: true, usedAt: new Date() } }),
            prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
        ]);

        return { message: 'Password reset successful. You can now log in.' };
    }

    async registerLocal(payload, meta) {
        const email = payload.email.toLowerCase();
        const rawHandle = (payload.handle || payload.userName || '').trim();
        const handle = (rawHandle ? rawHandle : email.split('@')[0]).toLowerCase();
        const accountType = payload.accountType === 'ORGANIZATION' ? 'ORGANIZATION' : 'HACKER';
        const requestedRoleType = accountType === 'ORGANIZATION' ? 'ORG_ADMIN' : 'PENTESTER';

        if (accountType === 'ORGANIZATION') {
            const domainCheck = this.validateOrganizationEmail(email);
            if (!domainCheck.isValid) {
                throw new AppError(
                    'Organization registration requires a company email address (no public email domains).',
                    422,
                    AuthErrorCodes.ORG_EMAIL_REQUIRED,
                    { domain: domainCheck.domain, reason: domainCheck.reason }
                );
            }

            if (!payload.organization || !payload.organization.name) {
                throw new AppError(
                    'Organization details are required for Organization accounts.',
                    422,
                    AuthErrorCodes.ORG_DETAILS_REQUIRED
                );
            }
        }

        const existingByEmail = await prisma.user.findUnique({ where: { email } });
        if (existingByEmail) {
            throw new AppError('Email already exists', 409, AuthErrorCodes.EMAIL_ALREADY_EXISTS);
        }

        const existingByHandle = await prisma.user.findUnique({ where: { handle } });
        if (existingByHandle) {
            throw new AppError('Handle already exists', 409, AuthErrorCodes.HANDLE_ALREADY_EXISTS);
        }

        const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);



        const { user, organization } = await prisma.$transaction(async (tx) => {
            const selectedRole = await tx.role.upsert({
                where: { type: requestedRoleType },
                update: {},
                create: {
                    name: requestedRoleType === 'ORG_ADMIN' ? 'Organization Admin' : 'Pentester',
                    type: requestedRoleType,
                    description: requestedRoleType === 'ORG_ADMIN'
                        ? 'Full access within their organization'
                        : 'Default pentester role for new users',
                    permissions: [],
                },
            });

            const createdUser = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    fullName: payload.fullName,
                    handle,
                    provider: 'local',
                    status: 'PENDING',
                    isVerified: false,
                    roles: { connect: { id: selectedRole.id } },

                },
                include: USER_PROFILE_INCLUDE,
            });

            let createdOrganization = null;
            if (accountType === 'ORGANIZATION') {
                const orgInput = payload.organization || {};
                const baseSlug = slugify(orgInput.name);
                let slug = baseSlug;
                let counter = 1;

                while (true) {
                    const existing = await tx.organization.findUnique({ where: { slug } });
                    if (!existing) break;
                    slug = `${baseSlug}-${counter}`;
                    counter++;
                }

                createdOrganization = await tx.organization.create({
                    data: {
                        name: orgInput.name,
                        slug,
                        description: orgInput.description,
                        industry: orgInput.industry,
                        size: orgInput.size,
                        website: orgInput.website,
                        primaryEmail: email,
                        phoneNumber: orgInput.phoneNumber,
                        addressLine1: orgInput.addressLine1,
                        addressLine2: orgInput.addressLine2,
                        city: orgInput.city,
                        state: orgInput.state,
                        postalCode: orgInput.postalCode,
                        country: orgInput.country,
                        registrationNumber: orgInput.registrationNumber,
                        taxId: orgInput.taxId,
                    },
                });

                await tx.organizationMember.create({
                    data: {
                        organizationId: createdOrganization.id,
                        userId: createdUser.id,
                        role: 'owner',
                        canCreatePentests: true,
                        canInviteMembers: true,
                    },
                });
            }

            return { user: createdUser, organization: createdOrganization };


        });

        const verification = await this.sendVerification(user, meta);

        // Always issue tokens on registration (even if email verification is pending)
        const auth = await this.issueTokens(user, meta);

        return {
            ...auth,
            requiresEmailVerification: !user.isVerified,
            user: this.sanitizeUser(user),
            verification: {
                delivered: verification.delivered,
                expiresAt: verification.expiresAt,
            },
            organization,
            message: user.isVerified
                ? 'Registration successful.'
                : (verification.delivered
                    ? 'Registration successful. Please check your email for the 6-digit verification code.'
                    : 'Registration successful, but we could not send the verification code. Please request a new one or contact support.'),
        };
    }

    async loginLocal(payload, meta) {
        const email = payload.email.toLowerCase();
        const user = await prisma.user.findUnique({
            where: { email },
            include: USER_PROFILE_INCLUDE,
        });

        if (!user || !user.passwordHash) {
            throw new AppError('Invalid credentials', 401, AuthErrorCodes.INVALID_CREDENTIALS);
        }

        if (user.status === 'SUSPENDED') {
            throw new AppError('Account is suspended', 403, AuthErrorCodes.ACCOUNT_SUSPENDED);
        }

        if (user.status === 'BANNED') {
            throw new AppError('Account is banned', 403, AuthErrorCodes.ACCOUNT_BANNED);
        }

        const isValid = await bcrypt.compare(payload.password, user.passwordHash);
        if (!isValid) {
            throw new AppError('Invalid credentials', 401, AuthErrorCodes.INVALID_CREDENTIALS);
        }

        // Enforce email verification before login
        if (!user.isVerified) {
            // Re-send verification email
            const verification = await this.sendVerification(user, meta);
            throw new AppError(
                'Please verify your email before logging in. We have sent a new verification code to your email.',
                403,
                AuthErrorCodes.EMAIL_NOT_VERIFIED,
                { requiresEmailVerification: true, email: user.email }
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        return {
            ...(await this.issueTokens(user, meta)),
            requiresEmailVerification: false,
        };
    }

    async refresh(refreshToken, meta) {
        if (!refreshToken) {
            throw new AppError('Refresh token is required', 400, AuthErrorCodes.REFRESH_TOKEN_INVALID);
        }

        const stored = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: { include: USER_PROFILE_INCLUDE } },
        });

        if (!stored || stored.revoked) {
            throw new AppError('Invalid refresh token', 401, AuthErrorCodes.REFRESH_TOKEN_INVALID);
        }

        if (dayjs(stored.expiresAt).isBefore(dayjs())) {
            await prisma.refreshToken.update({
                where: { token: refreshToken },
                data: { revoked: true, revokedAt: new Date() },
            });
            throw new AppError('Refresh token expired', 401, AuthErrorCodes.REFRESH_TOKEN_EXPIRED);
        }

        const user = stored.user;
        if (!user) {
            throw new AppError('User not found', 404, AuthErrorCodes.USER_NOT_FOUND);
        }

        await prisma.refreshToken.update({
            where: { token: refreshToken },
            data: { revoked: true, revokedAt: new Date() },
        });

        return this.issueTokens(user, meta);
    }

    async logout(refreshToken) {
        if (!refreshToken) return;
        try {
            await prisma.refreshToken.update({
                where: { token: refreshToken },
                data: { revoked: true, revokedAt: new Date() },
            });
        } catch (error) {
            // Ignore if token is already revoked or not found
        }
    }

    async logoutAll(userId) {
        await prisma.refreshToken.deleteMany({ where: { userId } });
        return { message: 'Local session cleared. Please also log out from Auth0.' };
    }
}

export default new AuthService();
