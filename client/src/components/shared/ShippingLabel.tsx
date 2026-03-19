import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, Package, MapPin, Phone, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShippingLabelProps {
  shipmentNumber: string;
  trackingNumber?: string;
  carrier?: string;
  status: string;
  from: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone?: string;
  };
  to: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone?: string;
  };
  orderNumber?: string;
  weight?: string;
  dimensions?: string;
  items?: number;
  showActions?: boolean;
}

export function ShippingLabel({
  shipmentNumber,
  trackingNumber,
  carrier,
  status,
  from,
  to,
  orderNumber,
  weight,
  dimensions,
  items,
  showActions = true,
}: ShippingLabelProps) {
  const { toast } = useToast();

  const handlePrint = () => {
    const printContent = document.getElementById(`shipping-label-${shipmentNumber}`);
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Shipping Label - ${shipmentNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .label { border: 2px solid #000; padding: 20px; max-width: 400px; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                .section { margin-bottom: 15px; }
                .section-title { font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
                .address { font-size: 14px; line-height: 1.4; }
                .barcode { text-align: center; font-family: monospace; font-size: 20px; letter-spacing: 3px; padding: 10px; border: 1px dashed #000; margin-top: 15px; }
                .meta { display: flex; gap: 20px; font-size: 12px; border-top: 1px solid #000; padding-top: 10px; margin-top: 15px; }
              </style>
            </head>
            <body>
              <div class="label">
                <div class="header">
                  <h2 style="margin:0">${carrier || 'SHIPPING LABEL'}</h2>
                  <p style="margin:5px 0">${shipmentNumber}</p>
                </div>
                <div class="section">
                  <div class="section-title">From:</div>
                  <div class="address">
                    <strong>${from.name}</strong><br>
                    ${from.address}<br>
                    ${from.city}, ${from.state} - ${from.pincode}<br>
                    ${from.phone ? `Ph: ${from.phone}` : ''}
                  </div>
                </div>
                <div class="section">
                  <div class="section-title">To:</div>
                  <div class="address">
                    <strong>${to.name}</strong><br>
                    ${to.address}<br>
                    ${to.city}, ${to.state} - ${to.pincode}<br>
                    ${to.phone ? `Ph: ${to.phone}` : ''}
                  </div>
                </div>
                ${trackingNumber ? `<div class="barcode">${trackingNumber}</div>` : ''}
                <div class="meta">
                  ${orderNumber ? `<span>Order: ${orderNumber}</span>` : ''}
                  ${weight ? `<span>Weight: ${weight}</span>` : ''}
                  ${items ? `<span>Items: ${items}</span>` : ''}
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
    toast({ title: 'Printing Label', description: 'Print dialog opened' });
  };

  const handleDownload = () => {
    const labelHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shipping Label - ${shipmentNumber}</title>
          <style>
            @page { size: 4in 6in; margin: 0; }
            body { font-family: Arial, sans-serif; padding: 15px; margin: 0; }
            .label { border: 2px solid #000; padding: 15px; max-width: 360px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
            .header h2 { margin: 0; font-size: 18px; }
            .header p { margin: 5px 0; font-size: 14px; }
            .section { margin-bottom: 12px; }
            .section-title { font-weight: bold; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; color: #666; }
            .address { font-size: 13px; line-height: 1.4; }
            .address strong { font-size: 14px; }
            .barcode { text-align: center; font-family: 'Courier New', monospace; font-size: 18px; letter-spacing: 2px; padding: 10px; border: 1px dashed #000; margin-top: 12px; background: #f9f9f9; }
            .meta { display: flex; flex-wrap: wrap; gap: 15px; font-size: 11px; border-top: 1px solid #000; padding-top: 10px; margin-top: 12px; }
            .qr-placeholder { text-align: center; padding: 20px; border: 1px solid #ccc; margin-top: 10px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <h2>${carrier || 'SHIPPING LABEL'}</h2>
              <p><strong>${shipmentNumber}</strong></p>
            </div>
            <div class="section">
              <div class="section-title">From:</div>
              <div class="address">
                <strong>${from.name}</strong><br>
                ${from.address}<br>
                ${from.city}, ${from.state} - ${from.pincode}<br>
                ${from.phone ? `Ph: ${from.phone}` : ''}
              </div>
            </div>
            <div class="section">
              <div class="section-title">To:</div>
              <div class="address">
                <strong>${to.name}</strong><br>
                ${to.address}<br>
                ${to.city}, ${to.state} - ${to.pincode}<br>
                ${to.phone ? `Ph: ${to.phone}` : ''}
              </div>
            </div>
            ${trackingNumber ? `<div class="barcode">${trackingNumber}</div>` : ''}
            <div class="meta">
              ${orderNumber ? `<span>Order: ${orderNumber}</span>` : ''}
              ${weight ? `<span>Weight: ${weight}</span>` : ''}
              ${items ? `<span>Items: ${items}</span>` : ''}
            </div>
          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob([labelHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shipping-label-${shipmentNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ 
      title: 'Label Downloaded', 
      description: 'Open the file and use Print → Save as PDF for a PDF version' 
    });
  };

  return (
    <Card id={`shipping-label-${shipmentNumber}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <div>
              <p className="font-mono font-semibold">{shipmentNumber}</p>
              {trackingNumber && (
                <p className="text-xs text-muted-foreground">Tracking: {trackingNumber}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            {carrier && <p className="text-sm font-medium">{carrier}</p>}
            <Badge variant={status === 'Delivered' ? 'default' : 'secondary'}>
              {status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase">
              <Building2 className="h-3 w-3" />
              From
            </div>
            <div className="text-sm">
              <p className="font-medium">{from.name}</p>
              <p className="text-muted-foreground">{from.address}</p>
              <p className="text-muted-foreground">{from.city}, {from.state} - {from.pincode}</p>
              {from.phone && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {from.phone}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase">
              <MapPin className="h-3 w-3" />
              To
            </div>
            <div className="text-sm">
              <p className="font-medium">{to.name}</p>
              <p className="text-muted-foreground">{to.address}</p>
              <p className="text-muted-foreground">{to.city}, {to.state} - {to.pincode}</p>
              {to.phone && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {to.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {(orderNumber || weight || dimensions || items) && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-sm text-muted-foreground">
            {orderNumber && <span>Order: <span className="font-mono">{orderNumber}</span></span>}
            {weight && <span>Weight: {weight}</span>}
            {dimensions && <span>Dimensions: {dimensions}</span>}
            {items && <span>Items: {items}</span>}
          </div>
        )}

        {showActions && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1" data-testid="button-print-label">
              <Printer className="h-4 w-4 mr-2" />
              Print Label
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download-label">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
