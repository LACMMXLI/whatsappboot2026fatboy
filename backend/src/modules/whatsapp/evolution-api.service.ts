import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Cliente HTTP para Evolution API (WhatsApp).
 * Toda la configuracion (URL, API key, instancia) viene de variables de
 * entorno; no hay credenciales reales embebidas.
 */
@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);
  private readonly client: AxiosInstance;
  private readonly instanceName?: string;

  constructor(private readonly configService: ConfigService) {
    const baseURL = this.configService.get<string>('evolutionApi.url');
    const apiKey = this.configService.get<string>('evolutionApi.apiKey');
    this.instanceName = this.configService.get<string>(
      'evolutionApi.instanceName',
    );

    this.client = axios.create({
      baseURL,
      headers: apiKey ? { apikey: apiKey } : undefined,
      timeout: 10_000,
    });
  }

  /**
   * Envia un mensaje de texto a un numero de WhatsApp via Evolution API.
   * POST {EVOLUTION_API_URL}/message/sendText/{instance}
   */
  async sendMessage(number: string, message: string): Promise<void> {
    if (!this.instanceName) {
      this.logger.warn(
        `EVOLUTION_INSTANCE_NAME no configurado. Mensaje no enviado (simulado) a ${number}: "${message}"`,
      );
      return;
    }
    try {
      await this.client.post(`/message/sendText/${this.instanceName}`, {
        number,
        text: message,
      });
      this.logger.log(`Mensaje enviado a ${number}`);
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
