import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Building2, FileText, Bell, Hash, Globe, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Settings as SettingsType } from '@shared/schema';

type SettingsMap = Record<string, string>;

const DEFAULTS: SettingsMap = {
  companyName: '',
  gstin: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  invoiceLogo: 'true',
  bankDetails: 'true',
  digitalSignature: 'false',
  lowStockAlerts: 'true',
  expiryAlerts: 'true',
  orderUpdateAlerts: 'true',
  paymentReminders: 'false',
  orderPrefix: 'ORD-',
  invoicePrefix: 'INV-',
  grnPrefix: 'GRN-',
  transferPrefix: 'TRF-',
  resetNumberingYearly: 'true',
  smsGateway: 'false',
  emailService: 'true',
  whatsappBusiness: 'false',
};

const CATEGORY_MAP: Record<string, string> = {
  companyName: 'company', gstin: 'company', email: 'company', phone: 'company',
  address: 'company', city: 'company', state: 'company', pincode: 'company',
  invoiceLogo: 'documents', bankDetails: 'documents', digitalSignature: 'documents',
  lowStockAlerts: 'notifications', expiryAlerts: 'notifications',
  orderUpdateAlerts: 'notifications', paymentReminders: 'notifications',
  orderPrefix: 'numbering', invoicePrefix: 'numbering', grnPrefix: 'numbering',
  transferPrefix: 'numbering', resetNumberingYearly: 'numbering',
  smsGateway: 'integrations', emailService: 'integrations', whatsappBusiness: 'integrations',
};

export default function Settings() {
  const { toast } = useToast();

  const { data: settings = [], isLoading } = useQuery<SettingsType[]>({
    queryKey: ['/api/settings'],
  });

  const [formData, setFormData] = useState<SettingsMap>({ ...DEFAULTS });
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (settings.length > 0 || !isLoading) {
      const map: SettingsMap = { ...DEFAULTS };
      settings.forEach(s => {
        if (s.value !== null && s.value !== undefined) map[s.key] = s.value;
      });
      setFormData(map);
      setDirtyKeys(new Set());
      setInitialized(true);
    }
  }, [settings, isLoading]);

  const updateField = useCallback((key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setDirtyKeys(prev => new Set(prev).add(key));
  }, []);

  const updateSwitch = useCallback((key: string, checked: boolean) => {
    updateField(key, checked ? 'true' : 'false');
  }, [updateField]);

  const saveMutation = useMutation({
    mutationFn: async (data: { key: string; value: string; category: string }) => {
      return apiRequest('POST', '/api/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
  });

  const handleSaveCategory = async (category: string) => {
    const keysForCategory = Object.keys(CATEGORY_MAP).filter(k => CATEGORY_MAP[k] === category);
    const dirtyInCategory = keysForCategory.filter(k => dirtyKeys.has(k));

    if (dirtyInCategory.length === 0) {
      toast({ title: 'No Changes', description: 'No changes to save in this section.' });
      return;
    }

    try {
      for (const key of dirtyInCategory) {
        await saveMutation.mutateAsync({
          key,
          value: formData[key],
          category: CATEGORY_MAP[key],
        });
      }
      setDirtyKeys(prev => {
        const next = new Set(prev);
        dirtyInCategory.forEach(k => next.delete(k));
        return next;
      });
      toast({ title: 'Settings Saved', description: 'Your changes have been saved successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
    }
  };

  const hasDirtyInCategory = (category: string) => {
    const keysForCategory = Object.keys(CATEGORY_MAP).filter(k => CATEGORY_MAP[k] === category);
    return keysForCategory.some(k => dirtyKeys.has(k));
  };

  if (isLoading && !initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const SaveButton = ({ category }: { category: string }) => (
    <div className="flex justify-end">
      <Button
        onClick={() => handleSaveCategory(category)}
        disabled={saveMutation.isPending || !hasDirtyInCategory(category)}
        data-testid={`button-save-${category}`}
      >
        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Save Changes
      </Button>
    </div>
  );

  const SettingSwitch = ({ settingKey, label, description, testId }: { settingKey: string; label: string; description: string; testId: string }) => (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={formData[settingKey] === 'true'}
        onCheckedChange={(checked) => updateSwitch(settingKey, checked)}
        data-testid={testId}
      />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage application settings and preferences"
      />

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 max-w-2xl">
          <TabsTrigger value="company" data-testid="tab-company">Company</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">Alerts</TabsTrigger>
          <TabsTrigger value="numbering" data-testid="tab-numbering">Numbering</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Profile
              </CardTitle>
              <CardDescription>
                Basic company information for invoices and documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    data-testid="input-company-name"
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    data-testid="input-gstin"
                    value={formData.gstin}
                    onChange={(e) => updateField('gstin', e.target.value)}
                    placeholder="Enter GSTIN"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Support Email</Label>
                  <Input
                    id="email"
                    data-testid="input-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="Enter support email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Support Phone</Label>
                  <Input
                    id="phone"
                    data-testid="input-phone"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  data-testid="input-address"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Enter street address"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                  <Input
                    data-testid="input-city"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="City"
                  />
                  <Input
                    data-testid="input-state"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="State"
                  />
                  <Input
                    data-testid="input-pincode"
                    value={formData.pincode}
                    onChange={(e) => updateField('pincode', e.target.value)}
                    placeholder="Pincode"
                    className="font-mono"
                  />
                </div>
              </div>
              <SaveButton category="company" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Settings
              </CardTitle>
              <CardDescription>
                Configure document templates and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <SettingSwitch settingKey="invoiceLogo" label="Include Logo on Invoices" description="Display company logo on generated invoices" testId="switch-invoice-logo" />
                <Separator />
                <SettingSwitch settingKey="bankDetails" label="Show Bank Details" description="Include bank account details on invoices" testId="switch-bank-details" />
                <Separator />
                <SettingSwitch settingKey="digitalSignature" label="Digital Signature" description="Add digital signature to documents" testId="switch-digital-signature" />
              </div>
              <SaveButton category="documents" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alert Settings
              </CardTitle>
              <CardDescription>
                Configure system alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <SettingSwitch settingKey="lowStockAlerts" label="Low Stock Alerts" description="Notify when inventory falls below threshold" testId="switch-low-stock" />
                <Separator />
                <SettingSwitch settingKey="expiryAlerts" label="Expiry Alerts" description="Notify about products nearing expiry" testId="switch-expiry" />
                <Separator />
                <SettingSwitch settingKey="orderUpdateAlerts" label="Order Updates" description="Notify on order status changes" testId="switch-order-updates" />
                <Separator />
                <SettingSwitch settingKey="paymentReminders" label="Payment Reminders" description="Automatic payment reminder notifications" testId="switch-payment-reminders" />
              </div>
              <SaveButton category="notifications" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="numbering">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Numbering Settings
              </CardTitle>
              <CardDescription>
                Configure automatic numbering for orders, invoices, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Order Number Prefix</Label>
                  <Input
                    value={formData.orderPrefix}
                    onChange={(e) => updateField('orderPrefix', e.target.value)}
                    placeholder="e.g., ORD-"
                    className="font-mono"
                    data-testid="input-order-prefix"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Number Prefix</Label>
                  <Input
                    value={formData.invoicePrefix}
                    onChange={(e) => updateField('invoicePrefix', e.target.value)}
                    placeholder="e.g., INV-"
                    className="font-mono"
                    data-testid="input-invoice-prefix"
                  />
                </div>
                <div className="space-y-2">
                  <Label>GRN Number Prefix</Label>
                  <Input
                    value={formData.grnPrefix}
                    onChange={(e) => updateField('grnPrefix', e.target.value)}
                    placeholder="e.g., GRN-"
                    className="font-mono"
                    data-testid="input-grn-prefix"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transfer Number Prefix</Label>
                  <Input
                    value={formData.transferPrefix}
                    onChange={(e) => updateField('transferPrefix', e.target.value)}
                    placeholder="e.g., TRF-"
                    className="font-mono"
                    data-testid="input-transfer-prefix"
                  />
                </div>
              </div>
              <Separator />
              <SettingSwitch settingKey="resetNumberingYearly" label="Reset Numbering Yearly" description="Start fresh numbering each financial year" testId="switch-reset-yearly" />
              <SaveButton category="numbering" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Integration Settings
              </CardTitle>
              <CardDescription>
                Configure external service integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <SettingSwitch settingKey="smsGateway" label="SMS Gateway" description="Send SMS notifications to customers" testId="switch-sms" />
                <Separator />
                <SettingSwitch settingKey="emailService" label="Email Service" description="Send email notifications" testId="switch-email-service" />
                <Separator />
                <SettingSwitch settingKey="whatsappBusiness" label="WhatsApp Business" description="Send WhatsApp notifications" testId="switch-whatsapp" />
              </div>
              <SaveButton category="integrations" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
