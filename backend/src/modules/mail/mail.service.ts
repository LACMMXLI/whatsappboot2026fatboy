import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Envio de emails transaccionales via SMTP generico (funciona con
 * cualquier proveedor: Gmail, SendGrid, Mailgun, Resend, Amazon SES, un
 * Postfix propio, etc. — solo hace falta la config SMTP estandar).
 *
 * Si SMTP_HOST no esta configurado, no falla: loguea el contenido del
 * email (igual que LoggingPosProvider para el POS) para no romper el
 * flujo de "olvide mi contraseña" en un ambiente que todavia no cargo las
 * variables de SMTP (ej. recien desplegado). En produccion real, configurar
 * SMTP_HOST es obligatorio para que el email efectivamente llegue.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const smtp = this.configService.get('smtp');
    if (smtp?.host) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      });
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const subject = 'Recupera tu contraseña';
    const text =
      `Recibimos una solicitud para restablecer tu contraseña.\n\n` +
      `Abre este enlace para elegir una nueva (valido por tiempo limitado):\n${resetUrl}\n\n` +
      `Si no fuiste vos, ignora este email: tu contraseña actual sigue funcionando.`;
    const html = `
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p><a href="${resetUrl}">Elegir una nueva contraseña</a> (el enlace vence en poco tiempo).</p>
      <p>Si no fuiste vos, ignora este email: tu contraseña actual sigue funcionando.</p>
    `;

    if (!this.transporter) {
      this.logger.warn(
        `SMTP no configurado (SMTP_HOST vacio) — no se envio el email real. ` +
          `Link de recuperacion para ${to}: ${resetUrl}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('smtp.from'),
        to,
        subject,
        text,
        html,
      });
    } catch (error) {
      // No relanzamos: forgot-password siempre responde generico igual, y
      // un fallo de SMTP no debe filtrarse como 500 al usuario ni revelar
      // si el email existia. Queda el log para diagnosticar en el server.
      this.logger.error(
        `Fallo el envio del email de recuperacion a ${to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
