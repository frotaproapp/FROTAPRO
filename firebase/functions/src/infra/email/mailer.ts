
import * as nodemailer from 'nodemailer';

// Configuração segura usando variáveis de ambiente do Firebase
const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || 'user',
    pass: process.env.SMTP_PASS || 'pass'
};

export const mailer = nodemailer.createTransport({
  host: smtpConfig.host,
  port: smtpConfig.port,
  secure: false, // true para 465, false para outras portas
  auth: {
    user: smtpConfig.user,
    pass: smtpConfig.pass,
  },
});
