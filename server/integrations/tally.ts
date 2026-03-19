interface TallyConfig {
  serverUrl: string;
  companyName: string;
  username?: string;
  password?: string;
}

interface LedgerEntry {
  name: string;
  parent: string;
  openingBalance?: number;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
}

interface VoucherEntry {
  voucherType: 'Sales' | 'Purchase' | 'Receipt' | 'Payment' | 'Journal' | 'Credit Note' | 'Debit Note';
  date: string;
  voucherNumber: string;
  partyLedger: string;
  ledgerEntries: Array<{
    ledgerName: string;
    amount: number;
    isDr: boolean;
  }>;
  narration?: string;
  reference?: string;
  billAllocations?: Array<{
    name: string;
    amount: number;
    billType: 'New Ref' | 'Agst Ref' | 'Advance';
  }>;
}

interface StockItem {
  name: string;
  group?: string;
  category?: string;
  unit?: string;
  hsnCode?: string;
  gstRate?: number;
  openingBalance?: number;
  openingRate?: number;
}

export class TallyService {
  private config: TallyConfig;

  constructor(config: TallyConfig) {
    this.config = config;
  }

  private buildXML(request: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.config.companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      ${request}
    </DATA>
  </BODY>
</ENVELOPE>`;
  }

  private buildExportXML(collection: string, fields: string[]): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>${collection}</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.config.companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No" NAME="${collection}">
            <TYPE>Ledger</TYPE>
            <NATIVEMETHOD>${fields.join('</NATIVEMETHOD><NATIVEMETHOD>')}</NATIVEMETHOD>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
  }

  private async request(xmlBody: string): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/xml',
    };

    if (this.config.username && this.config.password) {
      const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const response = await fetch(this.config.serverUrl, {
      method: 'POST',
      headers,
      body: xmlBody,
    });

    if (!response.ok) {
      throw new Error(`Tally API error: ${response.statusText}`);
    }

    return response.text();
  }

  async createLedger(ledger: LedgerEntry): Promise<string> {
    const xml = this.buildXML(`
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <LEDGER NAME="${ledger.name}" ACTION="Create">
          <NAME>${ledger.name}</NAME>
          <PARENT>${ledger.parent}</PARENT>
          ${ledger.openingBalance ? `<OPENINGBALANCE>${ledger.openingBalance}</OPENINGBALANCE>` : ''}
          ${ledger.address ? `<ADDRESS>${ledger.address}</ADDRESS>` : ''}
          ${ledger.phone ? `<LEDGERPHONE>${ledger.phone}</LEDGERPHONE>` : ''}
          ${ledger.email ? `<EMAIL>${ledger.email}</EMAIL>` : ''}
          ${ledger.gstin ? `<PARTYGSTIN>${ledger.gstin}</PARTYGSTIN>` : ''}
        </LEDGER>
      </TALLYMESSAGE>
    `);

    return this.request(xml);
  }

  async createVoucher(voucher: VoucherEntry): Promise<string> {
    const ledgerEntriesXml = voucher.ledgerEntries.map(entry => `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${entry.ledgerName}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${entry.isDr ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
        <AMOUNT>${entry.isDr ? -Math.abs(entry.amount) : Math.abs(entry.amount)}</AMOUNT>
        ${voucher.billAllocations ? voucher.billAllocations.map(bill => `
          <BILLALLOCATIONS.LIST>
            <NAME>${bill.name}</NAME>
            <BILLTYPE>${bill.billType}</BILLTYPE>
            <AMOUNT>${bill.amount}</AMOUNT>
          </BILLALLOCATIONS.LIST>
        `).join('') : ''}
      </ALLLEDGERENTRIES.LIST>
    `).join('');

    const xml = this.buildXML(`
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="${voucher.voucherType}" ACTION="Create">
          <DATE>${voucher.date.replace(/-/g, '')}</DATE>
          <VOUCHERTYPENAME>${voucher.voucherType}</VOUCHERTYPENAME>
          <VOUCHERNUMBER>${voucher.voucherNumber}</VOUCHERNUMBER>
          <PARTYLEDGERNAME>${voucher.partyLedger}</PARTYLEDGERNAME>
          ${voucher.reference ? `<REFERENCE>${voucher.reference}</REFERENCE>` : ''}
          ${voucher.narration ? `<NARRATION>${voucher.narration}</NARRATION>` : ''}
          ${ledgerEntriesXml}
        </VOUCHER>
      </TALLYMESSAGE>
    `);

    return this.request(xml);
  }

  async createStockItem(item: StockItem): Promise<string> {
    const xml = this.buildXML(`
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <STOCKITEM NAME="${item.name}" ACTION="Create">
          <NAME>${item.name}</NAME>
          ${item.group ? `<PARENT>${item.group}</PARENT>` : ''}
          ${item.category ? `<CATEGORY>${item.category}</CATEGORY>` : ''}
          ${item.unit ? `<BASEUNITS>${item.unit}</BASEUNITS>` : ''}
          ${item.hsnCode ? `<GSTDETAILS.LIST><HSNCODE>${item.hsnCode}</HSNCODE></GSTDETAILS.LIST>` : ''}
          ${item.openingBalance && item.openingRate ? `
            <OPENINGBALANCE>${item.openingBalance} ${item.unit || 'Nos'}</OPENINGBALANCE>
            <OPENINGRATE>${item.openingRate}/${item.unit || 'Nos'}</OPENINGRATE>
            <OPENINGVALUE>${item.openingBalance * item.openingRate}</OPENINGVALUE>
          ` : ''}
        </STOCKITEM>
      </TALLYMESSAGE>
    `);

    return this.request(xml);
  }

  async syncInvoice(invoice: {
    invoiceNumber: string;
    date: string;
    customerName: string;
    items: Array<{ name: string; quantity: number; rate: number; amount: number; taxAmount: number }>;
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    narration?: string;
  }): Promise<string> {
    const itemEntries = invoice.items.map(item => ({
      ledgerName: 'Sales',
      amount: item.amount,
      isDr: false,
    }));

    if (invoice.taxTotal > 0) {
      itemEntries.push({
        ledgerName: 'GST Payable',
        amount: invoice.taxTotal,
        isDr: false,
      });
    }

    itemEntries.push({
      ledgerName: invoice.customerName,
      amount: invoice.grandTotal,
      isDr: true,
    });

    return this.createVoucher({
      voucherType: 'Sales',
      date: invoice.date,
      voucherNumber: invoice.invoiceNumber,
      partyLedger: invoice.customerName,
      ledgerEntries: itemEntries,
      narration: invoice.narration,
      billAllocations: [{
        name: invoice.invoiceNumber,
        amount: invoice.grandTotal,
        billType: 'New Ref',
      }],
    });
  }

  async syncPayment(payment: {
    receiptNumber: string;
    date: string;
    customerName: string;
    amount: number;
    invoiceNumber: string;
    paymentMode: string;
    narration?: string;
  }): Promise<string> {
    return this.createVoucher({
      voucherType: 'Receipt',
      date: payment.date,
      voucherNumber: payment.receiptNumber,
      partyLedger: payment.customerName,
      ledgerEntries: [
        { ledgerName: payment.paymentMode, amount: payment.amount, isDr: true },
        { ledgerName: payment.customerName, amount: payment.amount, isDr: false },
      ],
      narration: payment.narration,
      billAllocations: [{
        name: payment.invoiceNumber,
        amount: payment.amount,
        billType: 'Agst Ref',
      }],
    });
  }

  async getLedgers(): Promise<string> {
    const xml = this.buildExportXML('LedgerCollection', ['Name', 'Parent', 'ClosingBalance']);
    return this.request(xml);
  }

  async getOutstandingBills(): Promise<string> {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Object</TYPE>
    <ID>List of Bills</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.config.companyName}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    return this.request(xml);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getLedgers();
      return true;
    } catch {
      return false;
    }
  }
}

export function createTallyService(config: { serverUrl?: string; companyName?: string; username?: string; password?: string }): TallyService | null {
  if (!config.serverUrl || !config.companyName) {
    return null;
  }
  return new TallyService({
    serverUrl: config.serverUrl,
    companyName: config.companyName,
    username: config.username,
    password: config.password,
  });
}
