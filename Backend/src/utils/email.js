import nodemailer from 'nodemailer';
import dayjs from 'dayjs';
import AppError from './AppError.js';
import { AuthErrorCodes } from '../modules/auth/auth.constants.js';

const BRAND = {
        name: 'Hackract',
        headerBg: '#111827',
        headerText: '#ffffff',
        accent: '#10b981',
        bodyText: '#0f172a',
        mutedText: '#6b7280',
        border: '#e5e7eb',
        surface: '#ffffff',
        surfaceMuted: '#f9fafb',
        pageBg: '#0f172a',
};

const escapeHtml = (value) =>
        String(value ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');

const buildEmailTemplate = ({
        preheader,
        title,
        greeting,
        intro,
        codeLabel,
        code,
        ctaLabel,
        ctaUrl,
        fallbackLabel,
        fallbackUrl,
        expiresLabel,
        metaDetails,
        securityNote,
}) => {
        const safeGreeting = escapeHtml(greeting);
        const safeTitle = escapeHtml(title);
        const safeIntro = escapeHtml(intro);
        const safePreheader = escapeHtml(preheader);

        const safeCodeLabel = codeLabel ? escapeHtml(codeLabel) : null;
        const safeCode = code ? escapeHtml(code) : null;

        const safeCtaLabel = ctaLabel ? escapeHtml(ctaLabel) : null;
        const safeCtaUrl = ctaUrl ? escapeHtml(ctaUrl) : null;
        const safeFallbackLabel = fallbackLabel ? escapeHtml(fallbackLabel) : null;
        const safeFallbackUrl = fallbackUrl ? escapeHtml(fallbackUrl) : null;

        const safeExpiresLabel = expiresLabel ? escapeHtml(expiresLabel) : null;
        const safeMetaDetails = metaDetails ? escapeHtml(metaDetails) : null;
        const safeSecurityNote = securityNote ? escapeHtml(securityNote) : null;

        const textLines = [
                `Hi ${greeting},`,
                '',
                intro,
                safeCode ? `${codeLabel || 'Code'}: ${code}` : null,
                ctaUrl ? `${ctaLabel || 'Open link'}: ${ctaUrl}` : null,
                '',
                expiresLabel ? `Expires: ${expiresLabel}` : null,
                '',
                securityNote || null,
                '',
                metaDetails ? `Request details: ${metaDetails}` : null,
                'If you did not request this, you can ignore this email.',
                '',
                `— ${BRAND.name}`,
        ]
                .filter(Boolean)
                .join('\n');

        const html = `
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>${safeTitle}</title>
    </head>
    <body style="margin:0;padding:0;background:${BRAND.pageBg};">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
            ${safePreheader}
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.pageBg};width:100%;">
            <tr>
                <td align="center" style="padding:24px 12px;">
                    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;">
                        <tr>
                            <td style="padding:18px 22px;background:${BRAND.headerBg};color:${BRAND.headerText};font-family:Arial,sans-serif;">
                                <div style="font-size:18px;font-weight:700;letter-spacing:0.2px;">${BRAND.name}</div>
                                <div style="font-size:12px;opacity:0.85;margin-top:2px;">${safeTitle}</div>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:22px;font-family:Arial,sans-serif;color:${BRAND.bodyText};line-height:1.55;">
                                <p style="margin:0 0 12px 0;">Hi ${safeGreeting},</p>
                                <p style="margin:0 0 18px 0;">${safeIntro}</p>

                                ${safeCode ? `
                                <div style="margin:0 0 18px 0;padding:14px 16px;border:1px solid ${BRAND.border};background:${BRAND.surfaceMuted};border-radius:12px;">
                                    <div style="font-size:12px;color:${BRAND.mutedText};margin-bottom:6px;">${safeCodeLabel || 'Code'}</div>
                                    <div style="font-size:28px;font-weight:800;letter-spacing:8px;color:${BRAND.bodyText};">${safeCode}</div>
                                </div>
                                ` : ''}

                                ${safeCtaUrl ? `
                                <div style="margin:0 0 16px 0;">
                                    <a href="${safeCtaUrl}" style="display:inline-block;background:${BRAND.headerBg};color:${BRAND.accent};text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;">
                                        ${safeCtaLabel || 'Open'}
                                    </a>
                                </div>
                                ` : ''}

                                ${safeFallbackUrl ? `
                                <p style="margin:0 0 14px 0;font-size:13px;color:${BRAND.mutedText};">
                                    ${safeFallbackLabel || 'If the button does not work, copy and paste this link:'}<br />
                                    <span style="word-break:break-all;">${safeFallbackUrl}</span>
                                </p>
                                ` : ''}

                                ${safeExpiresLabel ? `
                                <p style="margin:0 0 14px 0;font-size:13px;color:${BRAND.mutedText};">Expires: ${safeExpiresLabel}</p>
                                ` : ''}

                                ${safeSecurityNote ? `
                                <p style="margin:0 0 14px 0;font-size:13px;color:${BRAND.mutedText};">${safeSecurityNote}</p>
                                ` : ''}

                                ${safeMetaDetails ? `
                                <p style="margin:0;font-size:12px;color:${BRAND.mutedText};">Request details: ${safeMetaDetails}</p>
                                ` : ''}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:16px 22px;background:${BRAND.surfaceMuted};border-top:1px solid ${BRAND.border};font-family:Arial,sans-serif;color:${BRAND.mutedText};font-size:12px;line-height:1.5;">
                                <p style="margin:0;">If you did not request this, you can ignore this email.</p>
                            </td>
                        </tr>
                    </table>

                    <div style="max-width:600px;width:100%;font-family:Arial,sans-serif;color:${BRAND.mutedText};font-size:12px;line-height:1.4;padding:12px 6px 0 6px;">
                        <div>${BRAND.name} • Security workflows & pentest collaboration</div>
                    </div>
                </td>
            </tr>
        </table>
    </body>
</html>
`;

        return { text: textLines, html };
};

const buildVerificationContent = ({ friendlyName, verifyUrl, expiresLabel, metaDetails, code }) => {
        return buildEmailTemplate({
                preheader: 'Your Hackract verification code is inside.',
                title: 'Verify your email',
                greeting: friendlyName,
                intro: 'Use the 6-digit code below to verify your email and activate your Hackract account.',
                codeLabel: 'Verification code',
                code,
                ctaLabel: 'Verify email',
                ctaUrl: verifyUrl,
                fallbackLabel: 'If the button does not work, copy and paste this link:',
                fallbackUrl: verifyUrl,
                expiresLabel: expiresLabel || null,
                metaDetails,
                securityNote: 'Never share this code with anyone — Hackract support will never ask for it.',
        });
};

const buildPasswordResetContent = ({ friendlyName, resetUrl, expiresLabel, metaDetails }) => {
        return buildEmailTemplate({
                preheader: 'Reset your Hackract password securely.',
                title: 'Reset your password',
                greeting: friendlyName,
                intro: 'We received a request to reset your Hackract password. Use the button below to continue.',
                ctaLabel: 'Reset password',
                ctaUrl: resetUrl,
                fallbackLabel: 'If the button does not work, copy and paste this link:',
                fallbackUrl: resetUrl,
                expiresLabel: expiresLabel || null,
                metaDetails,
                securityNote: 'If you did not request a reset, you can ignore this email. Your password will not change.',
        });
};

const buildNationalIdOtpContent = ({ friendlyName, code, verifyUrl, expiresLabel, metaDetails }) => {
        return buildEmailTemplate({
                preheader: 'Your National ID (Fayda) verification code is inside.',
                title: 'Verify your National ID',
                greeting: friendlyName,
                intro: 'You recently added or linked your National ID to your Hackract profile. Use the 6-digit code below to confirm this action and verify your identity.',
                codeLabel: 'Fayda Verification Code',
                code,
                ctaLabel: 'Verify National ID',
                ctaUrl: verifyUrl,
                fallbackLabel: 'If the button does not work, copy and paste this link:',
                fallbackUrl: verifyUrl,
                expiresLabel: expiresLabel || null,
                metaDetails,
                securityNote: 'This code is meant strictly to verify your National ID. Never share this code with anyone.',
        });
};

let cachedTransport = null;

const parseBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const parsePositiveInt = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeSmtpHost = (host) =>
    String(host || '')
        .trim()
        .replace(/^smtp:\/\//i, '')
        .replace(/^smtps:\/\//i, '')
        .replace(/^https?:\/\//i, '')
        .replace(/\/+$/, '');

const getSmtpErrorMessage = (error) => {
    const code = error?.code || error?.command;
    const reason = error?.message || 'Unknown SMTP error';

    if (['ECONNABORTED', 'ETIMEDOUT', 'ESOCKET'].includes(error?.code)) {
        return `SMTP connection timed out (${reason}). Verify SMTP_HOST, SMTP_PORT, network/firewall access, and provider SMTP status.`;
    }

    if (['EAUTH', '535', '534'].includes(String(code))) {
        return 'SMTP authentication failed. Verify SMTP_USER and SMTP_PASS from your email provider.';
    }

    if (error?.code === 'ENOTFOUND') {
        return `SMTP host was not found (${reason}). Verify SMTP_HOST.`;
    }

    if (error?.code === 'ECONNREFUSED') {
        return `SMTP connection was refused (${reason}). Verify SMTP_PORT and SMTP_SECURE.`;
    }

    return `Email delivery failed: ${reason}. Please check your SMTP configuration.`;
};

const getSmtpTransport = () => {
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missing = requiredVars.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new AppError(
            'Email is not configured: missing SMTP settings',
            500,
            AuthErrorCodes.EMAIL_DELIVERY_FAILED,
            { missing }
        );
    }

    const host = normalizeSmtpHost(process.env.SMTP_HOST);
    if (!host) {
        throw new AppError(
            'Email is not configured: invalid SMTP_HOST',
            500,
            AuthErrorCodes.EMAIL_DELIVERY_FAILED
        );
    }

    const port = Number(process.env.SMTP_PORT);
    if (!Number.isFinite(port) || port <= 0) {
        throw new AppError(
            'Email is not configured: invalid SMTP_PORT',
            500,
            AuthErrorCodes.EMAIL_DELIVERY_FAILED,
            { SMTP_PORT: process.env.SMTP_PORT }
        );
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) {
        throw new AppError(
            'Email is not configured: missing SMTP_FROM',
            500,
            AuthErrorCodes.EMAIL_DELIVERY_FAILED
        );
    }

    if (cachedTransport) {
        return cachedTransport;
    }

    const secure = parseBool(process.env.SMTP_SECURE, port === 465);
    const requireTLS = parseBool(process.env.SMTP_REQUIRE_TLS, port === 587);
    const connectionTimeout = parsePositiveInt(process.env.SMTP_CONNECTION_TIMEOUT_MS, 30000);
    const greetingTimeout = parsePositiveInt(process.env.SMTP_GREETING_TIMEOUT_MS, 30000);
    const socketTimeout = parsePositiveInt(process.env.SMTP_SOCKET_TIMEOUT_MS, 60000);

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        requireTLS,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
        logger: parseBool(process.env.SMTP_DEBUG, false),
        debug: parseBool(process.env.SMTP_DEBUG, false),
        tls: {
            servername: host,
            rejectUnauthorized: !parseBool(process.env.SMTP_ALLOW_SELF_SIGNED, false),
        },
    });

    cachedTransport = { transporter, from };
    return { transporter, from };
};

export const verifyEmailConfiguration = async () => {
    const { transporter } = getSmtpTransport();

    try {
        await transporter.verify();
        return { ok: true };
    } catch (error) {
        console.error('SMTP verify error', error);
        throw new AppError(
            getSmtpErrorMessage(error),
            500,
            AuthErrorCodes.EMAIL_DELIVERY_FAILED
        );
    }
};

export const sendVerificationEmail = async ({ to, name, verifyUrl, code, expiresAt, ipAddress, userAgent }) => {
    const { transporter, from } = getSmtpTransport();

    const friendlyName = name || 'there';
    const expiresLabel = expiresAt ? dayjs(expiresAt).format('MMM D, YYYY h:mm A Z') : null;
    const metaDetails = [ipAddress && `IP: ${ipAddress}`, userAgent && `Client: ${userAgent}`]
        .filter(Boolean)
        .join(' | ');

    const { text, html } = buildVerificationContent({ friendlyName, verifyUrl, expiresLabel, metaDetails, code });

    try {
        const resolvedTo = Array.isArray(to) ? to.join(',') : to;
        await transporter.sendMail({
            from,
            to: resolvedTo,
            subject: 'Verify your email',
            text,
            html,
        });
        return;
    } catch (error) {
        console.error('SMTP error', error);
        throw new AppError(
            getSmtpErrorMessage(error),
            500,
            AuthErrorCodes.EMAIL_DELIVERY_FAILED
        );
    }
};

export const sendPasswordResetEmail = async ({ to, name, resetUrl, expiresAt, ipAddress, userAgent }) => {
    const { transporter, from } = getSmtpTransport();

    const friendlyName = name || 'there';
    const expiresLabel = expiresAt ? dayjs(expiresAt).format('MMM D, YYYY h:mm A Z') : null;
    const metaDetails = [ipAddress && `IP: ${ipAddress}`, userAgent && `Client: ${userAgent}`]
        .filter(Boolean)
        .join(' | ');

    const { text, html } = buildPasswordResetContent({ friendlyName, resetUrl, expiresLabel, metaDetails });

    try {
        const resolvedTo = Array.isArray(to) ? to.join(',') : to;
        await transporter.sendMail({
            from,
            to: resolvedTo,
            subject: 'Reset your password',
            text,
            html,
        });
        return;
    } catch (error) {
        console.error('SMTP error', error);
        throw new AppError(
            getSmtpErrorMessage(error),
            500,
            AuthErrorCodes.EMAIL_DELIVERY_FAILED
        );
    }
};

export const sendNationalIdOtpEmail = async ({ to, name, code, verifyUrl, expiresAt, ipAddress, userAgent }) => {
    const { transporter, from } = getSmtpTransport();

    const friendlyName = name || 'Citizen';
    const expiresLabel = expiresAt ? dayjs(expiresAt).format('MMM D, YYYY h:mm A Z') : null;
    const metaDetails = [ipAddress && `IP: ${ipAddress}`, userAgent && `Client: ${userAgent}`]
        .filter(Boolean)
        .join(' | ');

    const { text, html } = buildNationalIdOtpContent({ friendlyName, code, verifyUrl, expiresLabel, metaDetails });

    try {
        const resolvedTo = Array.isArray(to) ? to.join(',') : to;
        await transporter.sendMail({
            from,
            to: resolvedTo,
            subject: 'Verify your National ID (Fayda)',
            text,
            html,
        });
        return;
    } catch (error) {
        console.error('SMTP error', error);
        throw new AppError(
            getSmtpErrorMessage(error),
            500,
            AuthErrorCodes.EMAIL_DELIVERY_FAILED
        );
    }
};

export const sendEmail = async ({ to, subject, html, text }) => {
    const { transporter, from } = getSmtpTransport();

    try {
        const resolvedTo = Array.isArray(to) ? to.join(',') : to;
        await transporter.sendMail({
            from,
            to: resolvedTo,
            subject,
            text,
            html,
        });
        return;
    } catch (error) {
        console.error('SMTP error', error);
        throw new AppError(
            getSmtpErrorMessage(error),
            500,
            AuthErrorCodes.EMAIL_DELIVERY_FAILED
        );
    }
};
