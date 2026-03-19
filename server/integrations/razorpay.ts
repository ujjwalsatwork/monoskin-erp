import crypto from 'crypto';

interface RazorpayConfig {
  apiKey: string;
  apiSecret: string;
  webhookSecret?: string;
}

interface PaymentLinkOptions {
  amount: number;
  currency?: string;
  description: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  invoiceId: string;
  callbackUrl?: string;
  expireBy?: number;
}

interface PaymentLinkResponse {
  id: string;
  short_url: string;
  status: string;
  amount: number;
  currency: string;
  created_at: number;
  expire_by?: number;
}

interface PaymentVerification {
  razorpay_payment_id: string;
  razorpay_payment_link_id: string;
  razorpay_signature: string;
}

export class RazorpayService {
  private config: RazorpayConfig;
  private baseUrl = 'https://api.razorpay.com/v1';

  constructor(config: RazorpayConfig) {
    this.config = config;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async createPaymentLink(options: PaymentLinkOptions): Promise<PaymentLinkResponse> {
    const payload = {
      amount: options.amount * 100,
      currency: options.currency || 'INR',
      accept_partial: false,
      description: options.description,
      customer: {
        name: options.customerName,
        email: options.customerEmail,
        contact: options.customerPhone,
      },
      notify: {
        sms: !!options.customerPhone,
        email: !!options.customerEmail,
      },
      reminder_enable: true,
      notes: {
        invoice_id: options.invoiceId,
      },
      callback_url: options.callbackUrl,
      callback_method: 'get',
      expire_by: options.expireBy,
    };

    const response = await fetch(`${this.baseUrl}/payment_links`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }

  async getPaymentLink(linkId: string): Promise<PaymentLinkResponse> {
    const response = await fetch(`${this.baseUrl}/payment_links/${linkId}`, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }

  async cancelPaymentLink(linkId: string): Promise<PaymentLinkResponse> {
    const response = await fetch(`${this.baseUrl}/payment_links/${linkId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }

  async getPayment(paymentId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }

  verifyPaymentSignature(verification: PaymentVerification): boolean {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const body = `${verification.razorpay_payment_link_id}|${verification.razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(body)
      .digest('hex');

    return expectedSignature === verification.razorpay_signature;
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  async createRefund(paymentId: string, amount?: number): Promise<any> {
    const payload: any = {};
    if (amount) {
      payload.amount = amount * 100;
    }

    const response = await fetch(`${this.baseUrl}/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay API error: ${error.error?.description || 'Unknown error'}`);
    }

    return response.json();
  }
}

export function createRazorpayService(config: { apiKey?: string; apiSecret?: string; webhookSecret?: string }): RazorpayService | null {
  if (!config.apiKey || !config.apiSecret) {
    return null;
  }
  return new RazorpayService({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    webhookSecret: config.webhookSecret,
  });
}
