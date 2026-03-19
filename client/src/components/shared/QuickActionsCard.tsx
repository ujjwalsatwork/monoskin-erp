import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Phone, Mail, Calendar, Send, FileText, CreditCard, 
  Package, Truck, Printer, Download, Edit, MessageSquare,
  UserPlus, CheckCircle, XCircle, Clock, ArrowRight
} from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  icon: 'phone' | 'email' | 'calendar' | 'send' | 'document' | 'payment' | 
        'package' | 'truck' | 'print' | 'download' | 'edit' | 'message' |
        'assign' | 'approve' | 'reject' | 'schedule' | 'convert';
  onClick: () => void;
  variant?: 'default' | 'outline' | 'destructive';
  disabled?: boolean;
}

interface QuickActionsCardProps {
  title?: string;
  actions: QuickAction[];
  layout?: 'horizontal' | 'grid';
}

const iconMap = {
  phone: Phone,
  email: Mail,
  calendar: Calendar,
  send: Send,
  document: FileText,
  payment: CreditCard,
  package: Package,
  truck: Truck,
  print: Printer,
  download: Download,
  edit: Edit,
  message: MessageSquare,
  assign: UserPlus,
  approve: CheckCircle,
  reject: XCircle,
  schedule: Clock,
  convert: ArrowRight,
};

export function QuickActionsCard({ 
  title = 'Quick Actions', 
  actions, 
  layout = 'horizontal' 
}: QuickActionsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={layout === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'}>
          {actions.map((action) => {
            const Icon = iconMap[action.icon];
            return (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                data-testid={`button-action-${action.id}`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
