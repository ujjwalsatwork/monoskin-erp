export { RazorpayService, createRazorpayService } from './razorpay';
export { ShiprocketService, createShiprocketService } from './shiprocket';
export { GoogleSheetsService, createGoogleSheetsService } from './google-sheets';
export { WhatsAppBusinessService, createWhatsAppService } from './whatsapp';
export { TallyService, createTallyService } from './tally';

import { db } from '../db';
import { integrations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createRazorpayService, RazorpayService } from './razorpay';
import { createShiprocketService, ShiprocketService } from './shiprocket';
import { createGoogleSheetsService, GoogleSheetsService } from './google-sheets';
import { createWhatsAppService, WhatsAppBusinessService } from './whatsapp';
import { createTallyService, TallyService } from './tally';

type IntegrationConfig = Record<string, string | undefined>;

async function getIntegrationConfig(name: string): Promise<IntegrationConfig | null> {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.name, name));
  
  if (!integration || integration.status !== 'connected') {
    return null;
  }
  
  return (integration.config as IntegrationConfig) || null;
}

export async function getRazorpayService(): Promise<RazorpayService | null> {
  const config = await getIntegrationConfig('Razorpay');
  if (!config) return null;
  return createRazorpayService({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    webhookSecret: config.webhookSecret,
  });
}

export async function getShiprocketService(): Promise<ShiprocketService | null> {
  const config = await getIntegrationConfig('Shiprocket');
  if (!config) return null;
  return createShiprocketService({
    email: config.email,
    password: config.password,
  });
}

export async function getGoogleSheetsService(): Promise<GoogleSheetsService | null> {
  const config = await getIntegrationConfig('Google Sheets');
  if (!config) return null;
  return createGoogleSheetsService({
    clientEmail: config.clientEmail,
    privateKey: config.privateKey,
  });
}

export async function getWhatsAppService(): Promise<WhatsAppBusinessService | null> {
  const config = await getIntegrationConfig('WhatsApp Business');
  if (!config) return null;
  return createWhatsAppService({
    phoneNumberId: config.phoneNumberId,
    accessToken: config.accessToken,
    webhookVerifyToken: config.webhookVerifyToken,
  });
}

export async function getTallyService(): Promise<TallyService | null> {
  const config = await getIntegrationConfig('Tally ERP');
  if (!config) return null;
  return createTallyService({
    serverUrl: config.serverUrl,
    companyName: config.companyName,
    username: config.username,
    password: config.password,
  });
}

export async function testIntegrationConnection(name: string, config: IntegrationConfig): Promise<{ success: boolean; error?: string }> {
  try {
    switch (name) {
      case 'Razorpay': {
        const service = createRazorpayService({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
        });
        if (!service) return { success: false, error: 'Missing API key or secret' };
        return { success: true };
      }
      case 'Shiprocket': {
        const service = createShiprocketService({
          email: config.email,
          password: config.password,
        });
        if (!service) return { success: false, error: 'Missing email or password' };
        return { success: true };
      }
      case 'Google Sheets': {
        const service = createGoogleSheetsService({
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        });
        if (!service) return { success: false, error: 'Missing client email or private key' };
        return { success: true };
      }
      case 'WhatsApp Business': {
        const service = createWhatsAppService({
          phoneNumberId: config.phoneNumberId,
          accessToken: config.accessToken,
        });
        if (!service) return { success: false, error: 'Missing phone number ID or access token' };
        return { success: true };
      }
      case 'Tally ERP': {
        const service = createTallyService({
          serverUrl: config.serverUrl,
          companyName: config.companyName,
        });
        if (!service) return { success: false, error: 'Missing server URL or company name' };
        const connected = await service.testConnection();
        return { success: connected, error: connected ? undefined : 'Could not connect to Tally' };
      }
      default:
        return { success: true };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
