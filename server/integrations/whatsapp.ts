interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken?: string;
}

interface TextMessageOptions {
  to: string;
  message: string;
}

interface TemplateMessageOptions {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{
      type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
      text?: string;
      currency?: { fallback_value: string; code: string; amount_1000: number };
      date_time?: { fallback_value: string };
      image?: { link: string };
      document?: { link: string; filename?: string };
    }>;
  }>;
}

interface MediaMessageOptions {
  to: string;
  type: 'image' | 'document' | 'video' | 'audio';
  mediaUrl: string;
  caption?: string;
  filename?: string;
}

interface MessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export class WhatsAppBusinessService {
  private config: WhatsAppConfig;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API error: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    return cleaned;
  }

  async sendTextMessage(options: TextMessageOptions): Promise<MessageResponse> {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(options.to),
        type: 'text',
        text: {
          preview_url: false,
          body: options.message,
        },
      }),
    });
  }

  async sendTemplateMessage(options: TemplateMessageOptions): Promise<MessageResponse> {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(options.to),
      type: 'template',
      template: {
        name: options.templateName,
        language: {
          code: options.languageCode || 'en',
        },
      },
    };

    if (options.components) {
      payload.template.components = options.components;
    }

    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async sendMediaMessage(options: MediaMessageOptions): Promise<MessageResponse> {
    const mediaPayload: any = {
      link: options.mediaUrl,
    };

    if (options.caption) {
      mediaPayload.caption = options.caption;
    }
    if (options.filename && options.type === 'document') {
      mediaPayload.filename = options.filename;
    }

    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.formatPhoneNumber(options.to),
        type: options.type,
        [options.type]: mediaPayload,
      }),
    });
  }

  async sendOrderConfirmation(to: string, orderNumber: string, items: string[], total: string): Promise<MessageResponse> {
    return this.sendTemplateMessage({
      to,
      templateName: 'order_confirmation',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: orderNumber },
            { type: 'text', text: items.join(', ') },
            { type: 'text', text: total },
          ],
        },
      ],
    });
  }

  async sendDeliveryUpdate(to: string, orderNumber: string, status: string, trackingUrl?: string): Promise<MessageResponse> {
    const message = trackingUrl
      ? `Your order #${orderNumber} is now ${status}. Track your shipment: ${trackingUrl}`
      : `Your order #${orderNumber} is now ${status}.`;

    return this.sendTextMessage({ to, message });
  }

  async sendInvoice(to: string, invoiceNumber: string, amount: string, dueDate: string, paymentLink?: string): Promise<MessageResponse> {
    let message = `Invoice #${invoiceNumber} for ${amount} is due on ${dueDate}.`;
    if (paymentLink) {
      message += ` Pay now: ${paymentLink}`;
    }
    return this.sendTextMessage({ to, message });
  }

  async sendPaymentReceipt(to: string, receiptNumber: string, amount: string, invoiceNumber: string): Promise<MessageResponse> {
    return this.sendTextMessage({
      to,
      message: `Payment received! Receipt #${receiptNumber} for ${amount} against Invoice #${invoiceNumber}. Thank you for your payment.`,
    });
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  parseWebhookPayload(body: any): Array<{
    from: string;
    messageId: string;
    timestamp: string;
    type: string;
    text?: string;
    image?: { id: string };
    document?: { id: string; filename: string };
  }> {
    const messages: any[] = [];
    
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.value?.messages) {
            for (const message of change.value.messages) {
              messages.push({
                from: message.from,
                messageId: message.id,
                timestamp: message.timestamp,
                type: message.type,
                text: message.text?.body,
                image: message.image,
                document: message.document,
              });
            }
          }
        }
      }
    }

    return messages;
  }
}

export function createWhatsAppService(config: { phoneNumberId?: string; accessToken?: string; webhookVerifyToken?: string }): WhatsAppBusinessService | null {
  if (!config.phoneNumberId || !config.accessToken) {
    return null;
  }
  return new WhatsAppBusinessService({
    phoneNumberId: config.phoneNumberId,
    accessToken: config.accessToken,
    webhookVerifyToken: config.webhookVerifyToken,
  });
}
