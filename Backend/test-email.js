import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const testEmail = async () => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        console.log('📧 Testing SMTP connection...');
        console.log('Host:', process.env.SMTP_HOST);
        console.log('Port:', process.env.SMTP_PORT);
        console.log('User:', process.env.SMTP_USER);

        // Test connection
        await transporter.verify();
        console.log('✅ SMTP Connection successful!');

        // Send test email
        const result = await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: process.env.SMTP_USER, // Send to yourself
            subject: 'Test Email - Hackract',
            html: `
                <h2>Email Service Test</h2>
                <p>If you received this, your email is working! ✅</p>
                <p>Host: ${process.env.SMTP_HOST}</p>
                <p>Timestamp: ${new Date().toISOString()}</p>
            `,
        });

        console.log('✅ Email sent successfully!');
        console.log('Message ID:', result.messageId);
    } catch (error) {
        console.error('❌ Email test failed:');
        console.error('Error:', error.message);
        process.exit(1);
    }
};

testEmail();
