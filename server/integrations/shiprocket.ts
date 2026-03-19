interface ShiprocketConfig {
  email: string;
  password: string;
}

interface ShiprocketToken {
  token: string;
  expiresAt: number;
}

interface CreateOrderOptions {
  orderId: string;
  orderDate: string;
  pickupLocation: string;
  billingCustomerName: string;
  billingAddress: string;
  billingCity: string;
  billingPincode: string;
  billingState: string;
  billingCountry?: string;
  billingEmail?: string;
  billingPhone: string;
  shippingIsBilling?: boolean;
  shippingCustomerName?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingPincode?: string;
  shippingState?: string;
  shippingCountry?: string;
  shippingPhone?: string;
  orderItems: Array<{
    name: string;
    sku: string;
    units: number;
    sellingPrice: number;
    hsn?: string;
  }>;
  paymentMethod: 'prepaid' | 'cod';
  subTotal: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

interface CreateShipmentOptions {
  orderId: string;
  courierId?: number;
}

interface TrackingResponse {
  tracking_data: {
    shipment_track: Array<{
      current_status: string;
      origin: string;
      destination: string;
      awb_code: string;
      courier_name: string;
      shipment_track_activities: Array<{
        date: string;
        status: string;
        activity: string;
        location: string;
      }>;
    }>;
  };
}

export class ShiprocketService {
  private config: ShiprocketConfig;
  private baseUrl = 'https://apiv2.shiprocket.in/v1/external';
  private token: ShiprocketToken | null = null;

  constructor(config: ShiprocketConfig) {
    this.config = config;
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) {
      return this.token.token;
    }

    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: this.config.email,
        password: this.config.password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Shiprocket auth error: ${error.message || 'Authentication failed'}`);
    }

    const data = await response.json();
    this.token = {
      token: data.token,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000),
    };

    return this.token.token;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Shiprocket API error: ${error.message || 'Unknown error'}`);
    }

    return response.json();
  }

  async createOrder(options: CreateOrderOptions): Promise<any> {
    const payload = {
      order_id: options.orderId,
      order_date: options.orderDate,
      pickup_location: options.pickupLocation,
      billing_customer_name: options.billingCustomerName,
      billing_address: options.billingAddress,
      billing_city: options.billingCity,
      billing_pincode: options.billingPincode,
      billing_state: options.billingState,
      billing_country: options.billingCountry || 'India',
      billing_email: options.billingEmail,
      billing_phone: options.billingPhone,
      shipping_is_billing: options.shippingIsBilling ?? true,
      shipping_customer_name: options.shippingCustomerName,
      shipping_address: options.shippingAddress,
      shipping_city: options.shippingCity,
      shipping_pincode: options.shippingPincode,
      shipping_state: options.shippingState,
      shipping_country: options.shippingCountry || 'India',
      shipping_phone: options.shippingPhone,
      order_items: options.orderItems.map(item => ({
        name: item.name,
        sku: item.sku,
        units: item.units,
        selling_price: item.sellingPrice,
        hsn: item.hsn,
      })),
      payment_method: options.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      sub_total: options.subTotal,
      length: options.length,
      breadth: options.breadth,
      height: options.height,
      weight: options.weight,
    };

    return this.request('/orders/create/adhoc', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getServiceability(pickupPincode: string, deliveryPincode: string, weight: number, cod: boolean = false): Promise<any> {
    const params = new URLSearchParams({
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight: weight.toString(),
      cod: cod ? '1' : '0',
    });

    return this.request(`/courier/serviceability?${params}`);
  }

  async generateAWB(options: CreateShipmentOptions): Promise<any> {
    const payload: any = {
      shipment_id: options.orderId,
    };
    if (options.courierId) {
      payload.courier_id = options.courierId;
    }

    return this.request('/courier/assign/awb', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async schedulePickup(shipmentId: string): Promise<any> {
    return this.request('/courier/generate/pickup', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: [shipmentId] }),
    });
  }

  async trackShipment(awbCode: string): Promise<TrackingResponse> {
    return this.request(`/courier/track/awb/${awbCode}`);
  }

  async trackByOrderId(orderId: string): Promise<TrackingResponse> {
    return this.request(`/courier/track?order_id=${orderId}`);
  }

  async cancelShipment(awbCodes: string[]): Promise<any> {
    return this.request('/orders/cancel', {
      method: 'POST',
      body: JSON.stringify({ awbs: awbCodes }),
    });
  }

  async generateLabel(shipmentId: string): Promise<any> {
    return this.request('/courier/generate/label', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: [shipmentId] }),
    });
  }

  async generateManifest(shipmentIds: string[]): Promise<any> {
    return this.request('/manifests/generate', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: shipmentIds }),
    });
  }

  async getPickupLocations(): Promise<any> {
    return this.request('/settings/company/pickup');
  }

  async getChannels(): Promise<any> {
    return this.request('/channels');
  }
}

export function createShiprocketService(config: { email?: string; password?: string }): ShiprocketService | null {
  if (!config.email || !config.password) {
    return null;
  }
  return new ShiprocketService({
    email: config.email,
    password: config.password,
  });
}
