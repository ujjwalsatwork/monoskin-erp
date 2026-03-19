import { useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, FileText, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeGeneratorProps {
  code: string;
  doctorName?: string;
  clinicName?: string;
  discount?: number;
  size?: number;
  showActions?: boolean;
}

export function QRCodeGenerator({ 
  code, 
  doctorName, 
  clinicName, 
  discount,
  size = 200,
  showActions = true 
}: QRCodeGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const qrValue = `https://monoskin.app/redeem?code=${code}`;

  const downloadQRPng = useCallback(async () => {
    if (!qrRef.current) return;
    
    try {
      const dataUrl = await toPng(qrRef.current, { 
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 3
      });
      
      const link = document.createElement('a');
      link.download = `${code}-qr-code.png`;
      link.href = dataUrl;
      link.click();
      
      toast({ title: 'QR Code Downloaded', description: 'PNG file saved to downloads' });
    } catch (error) {
      console.error('Error generating QR PNG:', error);
      toast({ title: 'Download Failed', variant: 'destructive' });
    }
  }, [code, toast]);

  const downloadPDF = useCallback(async () => {
    if (!printRef.current) return;
    
    try {
      const dataUrl = await toPng(printRef.current, { 
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 3
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [90, 55] // Business card size
      });
      
      // Add QR card to PDF
      pdf.addImage(dataUrl, 'PNG', 0, 0, 90, 55);
      
      pdf.save(`${code}-print-card.pdf`);
      
      toast({ title: 'PDF Downloaded', description: 'Print-ready PDF saved to downloads' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Download Failed', variant: 'destructive' });
    }
  }, [code, toast]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !printRef.current) return;

    const printContent = printRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Card - ${code}</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: system-ui, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .print-card {
              width: 90mm;
              height: 55mm;
              border: 1px solid #e5e5e5;
              border-radius: 8px;
              padding: 12px;
              box-sizing: border-box;
              display: flex;
              gap: 12px;
              background: white;
            }
            .qr-section { flex-shrink: 0; }
            .info-section { 
              flex: 1; 
              display: flex; 
              flex-direction: column; 
              justify-content: center;
            }
            .brand { 
              font-weight: 700; 
              font-size: 14px; 
              color: #1a1a1a;
              margin-bottom: 4px;
            }
            .doctor { 
              font-size: 11px; 
              color: #666;
              margin-bottom: 2px;
            }
            .clinic { 
              font-size: 10px; 
              color: #888;
              margin-bottom: 8px;
            }
            .discount { 
              font-size: 18px; 
              font-weight: 700; 
              color: #7c3aed;
            }
            .code { 
              font-family: monospace; 
              font-size: 9px; 
              color: #888;
              margin-top: 6px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [code]);

  return (
    <div className="space-y-4">
      {/* QR Code Display */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <div 
              ref={qrRef}
              className="p-4 bg-white rounded-lg"
            >
              <QRCodeSVG
                value={qrValue}
                size={size}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: '/favicon.ico',
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>
            <p className="font-mono text-sm text-muted-foreground">{code}</p>
          </div>
        </CardContent>
      </Card>

      {/* Print Preview Card (Hidden but used for PDF/Print) */}
      <div className="sr-only" aria-hidden="true">
        <div 
          ref={printRef}
          className="print-card"
          style={{
            width: '90mm',
            height: '55mm',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            padding: '12px',
            boxSizing: 'border-box',
            display: 'flex',
            gap: '12px',
            background: 'white',
          }}
        >
          <div className="qr-section">
            <QRCodeSVG
              value={qrValue}
              size={80}
              level="H"
              includeMargin={false}
            />
          </div>
          <div 
            className="info-section"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a', marginBottom: '4px' }}>
              Monoskin
            </div>
            {doctorName && (
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>
                {doctorName}
              </div>
            )}
            {clinicName && (
              <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>
                {clinicName}
              </div>
            )}
            {discount && (
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#7c3aed' }}>
                {discount}% OFF
              </div>
            )}
            <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#888', marginTop: '6px' }}>
              {code}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadQRPng}>
            <Download className="h-4 w-4 mr-2" />
            Download QR (PNG)
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Card
          </Button>
        </div>
      )}
    </div>
  );
}
