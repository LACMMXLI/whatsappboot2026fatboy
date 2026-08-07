import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Cliente HTTP para Evolution API (WhatsApp) — envio de mensajes salientes.
 * La URL y la API key global vienen de variables de entorno (nunca se
 * exponen al frontend); el nombre de INSTANCIA es propio de cada negocio
 * (Business.whatsappInstanceId), nunca un valor global compartido — cada
 * negocio tiene su propio numero de WhatsApp.
 */
@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const baseURL = this.configService.get<string>('evolutionApi.url');
    const apiKey = this.configService.get<string>('evolutionApi.apiKey');

    this.client = axios.create({
      baseURL,
      headers: apiKey ? { apikey: apiKey } : undefined,
      timeout: 10_000,
    });
  }

  /**
   * Envia un mensaje de texto a un numero de WhatsApp via Evolution API,
   * usando la instancia del negocio que corresponde a esa conversacion.
   * POST {EVOLUTION_API_URL}/message/sendText/{instance}
   */
  async sendMessage(
    instanceName: string | null | undefined,
    number: string,
    message: string,
  ): Promise<void> {
    if (!instanceName) {
      this.logger.warn(
        `Negocio sin instancia de WhatsApp configurada. Mensaje no enviado (simulado) a ${number}: "${message}"`,
      );
      return;
    }
    try {
      await this.client.post(`/message/sendText/${instanceName}`, {
        number,
        text: message,
      });
      this.logger.log(`Mensaje enviado a ${number} via instancia ${instanceName}`);
    } catch (error) {
      const detail =
        axios.isAxiosError(error) && error.response
          ? JSON.stringify(error.response.data)
          : error instanceof Error
            ? error.message
            : String(error);
      this.logger.error(`Error enviando mensaje a ${number}: ${detail}`);
      throw new HttpException(
        `No fue posible enviar el mensaje via Evolution API: ${detail}`,
        502,
      );
    }
  }
}
