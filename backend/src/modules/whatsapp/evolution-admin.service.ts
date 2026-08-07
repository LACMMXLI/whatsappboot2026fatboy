import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface EvolutionQrCode {
  /** Imagen del QR en base64 (data URI o solo el string base64, segun la version). */
  base64?: string;
  /** Codigo de texto del QR, por si el frontend prefiere renderizarlo el mismo. */
  code?: string;
}

export interface EvolutionCreateInstanceResult {
  qrCode?: EvolutionQrCode;
}

export type EvolutionConnectionState = 'open' | 'connecting' | 'close';

/**
 * Cliente HTTP para las operaciones ADMINISTRATIVAS de Evolution API
 * (crear/borrar instancias, QR, estado de conexion, webhook). Distinto de
 * EvolutionApiService, que solo manda mensajes. Solo lo usa SuperAdminModule
 * — la API key global NUNCA sale de este backend hacia el frontend.
 *
 * Cada metodo lanza si Evolution API no responde o responde con error; quien
 * llama (SuperAdminService) decide que hacer con eso (guardar el negocio en
 * estado ERROR y permitir reintentar, nunca perder el alta del tenant).
 */
@Injectable()
export class EvolutionAdminService {
  private readonly logger = new Logger(EvolutionAdminService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const baseURL = this.configService.get<string>('evolutionApi.url');
    const apiKey = this.configService.get<string>('evolutionApi.apiKey');
    this.client = axios.create({
      baseURL,
      headers: apiKey ? { apikey: apiKey } : undefined,
      timeout: 15_000,
    });
  }

  /** POST /instance/create — crea la instancia y devuelve el QR inicial si Evolution lo manda de una. */
  async createInstance(instanceName: string): Promise<EvolutionCreateInstanceResult> {
    const { data } = await this.request('post', '/instance/create', {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });
    return { qrCode: this.extractQrCode(data) };
  }

  /** GET /instance/connect/{instance} — pide un QR nuevo (alta inicial, reconexion, etc). */
  async getQrCode(instanceName: string): Promise<EvolutionQrCode> {
    const { data } = await this.request('get', `/instance/connect/${instanceName}`);
    return this.extractQrCode(data) ?? {};
  }

  /** GET /instance/connectionState/{instance} */
  async getConnectionState(instanceName: string): Promise<EvolutionConnectionState> {
    const { data } = await this.request('get', `/instance/connectionState/${instanceName}`);
    const state = data?.instance?.state ?? data?.state;
    if (state === 'open' || state === 'connecting' || state === 'close') {
      return state;
    }
    return 'close';
  }

  /** DELETE /instance/logout/{instance} — desconecta el numero, la instancia sigue existiendo. */
  async logout(instanceName: string): Promise<void> {
    await this.request('delete', `/instance/logout/${instanceName}`);
  }

  /** PUT /instance/restart/{instance} */
  async restart(instanceName: string): Promise<void> {
    await this.request('put', `/instance/restart/${instanceName}`);
  }

  /** DELETE /instance/delete/{instance} — borra la instancia por completo. */
  async deleteInstance(instanceName: string): Promise<void> {
    await this.request('delete', `/instance/delete/${instanceName}`);
  }

  /**
   * POST /webhook/set/{instance} — apunta la instancia al webhook compartido
   * de este backend (todas las instancias mandan al mismo endpoint; el
   * backend identifica el negocio por el campo "instance" del payload).
   */
  async setWebhook(instanceName: string, webhookUrl: string, webhookSecret: string): Promise<void> {
    await this.request('post', `/webhook/set/${instanceName}`, {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: false,
        headers: webhookSecret ? { 'x-webhook-secret': webhookSecret } : undefined,
        events: ['MESSAGES_UPSERT'],
      },
    });
  }

  private extractQrCode(data: unknown): EvolutionQrCode | undefined {
    const qr = (data as { qrcode?: EvolutionQrCode; base64?: string; code?: string })?.qrcode;
    if (qr?.base64 || qr?.code) {
      return qr;
    }
    const flat = data as { base64?: string; code?: string };
    if (flat?.base64 || flat?.code) {
      return { base64: flat.base64, code: flat.code };
    }
    return undefined;
  }

  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    body?: unknown,
  ) {
    try {
      return await this.client.request({ method, url, data: body });
    } catch (error) {
      const detail =
        axios.isAxiosError(error) && error.response
          ? JSON.stringify(error.response.data)
          : error instanceof Error
            ? error.message
            : String(error);
      this.logger.error(`Evolution API ${method.toUpperCase()} ${url} fallo: ${detail}`);
      throw new Error(`Evolution API: ${detail}`);
    }
  }
}
