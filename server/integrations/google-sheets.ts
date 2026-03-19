interface GoogleSheetsConfig {
  clientEmail: string;
  privateKey: string;
}

interface SpreadsheetData {
  spreadsheetId: string;
  sheetName: string;
  range?: string;
}

interface AppendOptions extends SpreadsheetData {
  values: any[][];
}

interface UpdateOptions extends SpreadsheetData {
  values: any[][];
}

interface CreateOptions {
  title: string;
  sheetNames?: string[];
}

export class GoogleSheetsService {
  private config: GoogleSheetsConfig;
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: this.config.clientEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const unsigned = `${headerBase64}.${payloadBase64}`;

    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsigned);
    const signature = sign.sign(this.config.privateKey, 'base64url');

    const jwt = `${unsigned}.${signature}`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google OAuth error: ${error.error_description || 'Authentication failed'}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken!;
  }

  private async request(url: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google Sheets API error: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  async createSpreadsheet(options: CreateOptions): Promise<any> {
    const payload: any = {
      properties: {
        title: options.title,
      },
    };

    if (options.sheetNames && options.sheetNames.length > 0) {
      payload.sheets = options.sheetNames.map(name => ({
        properties: { title: name },
      }));
    }

    return this.request(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getSpreadsheet(spreadsheetId: string): Promise<any> {
    return this.request(`${this.baseUrl}/${spreadsheetId}`);
  }

  async getValues(options: SpreadsheetData): Promise<any[][]> {
    const range = options.range || `${options.sheetName}!A:Z`;
    const response = await this.request(
      `${this.baseUrl}/${options.spreadsheetId}/values/${encodeURIComponent(range)}`
    );
    return response.values || [];
  }

  async appendValues(options: AppendOptions): Promise<any> {
    const range = options.range || `${options.sheetName}!A:A`;
    return this.request(
      `${this.baseUrl}/${options.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        body: JSON.stringify({
          values: options.values,
        }),
      }
    );
  }

  async updateValues(options: UpdateOptions): Promise<any> {
    const range = options.range || `${options.sheetName}!A1`;
    return this.request(
      `${this.baseUrl}/${options.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({
          values: options.values,
        }),
      }
    );
  }

  async clearValues(options: SpreadsheetData): Promise<any> {
    const range = options.range || `${options.sheetName}!A:Z`;
    return this.request(
      `${this.baseUrl}/${options.spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
      { method: 'POST', body: JSON.stringify({}) }
    );
  }

  async addSheet(spreadsheetId: string, sheetName: string): Promise<any> {
    return this.request(`${this.baseUrl}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          addSheet: {
            properties: { title: sheetName },
          },
        }],
      }),
    });
  }

  async exportToSheet(
    spreadsheetId: string,
    sheetName: string,
    headers: string[],
    data: Record<string, any>[]
  ): Promise<any> {
    const values = [
      headers,
      ...data.map(row => headers.map(h => {
        const value = row[h];
        if (value === null || value === undefined) return '';
        if (value instanceof Date) return value.toISOString();
        return String(value);
      })),
    ];

    await this.clearValues({ spreadsheetId, sheetName });
    return this.updateValues({
      spreadsheetId,
      sheetName,
      range: `${sheetName}!A1`,
      values,
    });
  }
}

export function createGoogleSheetsService(config: { clientEmail?: string; privateKey?: string }): GoogleSheetsService | null {
  if (!config.clientEmail || !config.privateKey) {
    return null;
  }
  return new GoogleSheetsService({
    clientEmail: config.clientEmail,
    privateKey: config.privateKey.replace(/\\n/g, '\n'),
  });
}
