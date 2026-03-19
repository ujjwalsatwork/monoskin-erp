import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, Building2, ShoppingCart, Truck, FileText, 
  CreditCard, Package, Users, MapPin, ChevronRight
} from 'lucide-react';

export interface RelatedEntity {
  type: 'lead' | 'doctor' | 'pharmacy' | 'order' | 'shipment' | 'invoice' | 'mr' | 'warehouse' | 'return' | 'credit-note';
  id: string;
  name: string;
  subtitle?: string;
  status?: string;
  path: string;
}

interface RelatedEntitiesCardProps {
  title?: string;
  entities: RelatedEntity[];
  emptyMessage?: string;
}

const entityConfig = {
  lead: { icon: User, color: 'text-blue-500 bg-blue-500/10' },
  doctor: { icon: User, color: 'text-emerald-500 bg-emerald-500/10' },
  pharmacy: { icon: Building2, color: 'text-violet-500 bg-violet-500/10' },
  order: { icon: ShoppingCart, color: 'text-amber-500 bg-amber-500/10' },
  shipment: { icon: Truck, color: 'text-cyan-500 bg-cyan-500/10' },
  invoice: { icon: FileText, color: 'text-rose-500 bg-rose-500/10' },
  mr: { icon: Users, color: 'text-indigo-500 bg-indigo-500/10' },
  warehouse: { icon: Package, color: 'text-orange-500 bg-orange-500/10' },
  return: { icon: Package, color: 'text-red-500 bg-red-500/10' },
  'credit-note': { icon: CreditCard, color: 'text-green-500 bg-green-500/10' },
};

export function RelatedEntitiesCard({ 
  title = 'Related', 
  entities, 
  emptyMessage = 'No related entities' 
}: RelatedEntitiesCardProps) {
  const navigate = useNavigate();

  if (entities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entities.map((entity) => {
          const config = entityConfig[entity.type];
          const Icon = config.icon;

          return (
            <div
              key={`${entity.type}-${entity.id}`}
              onClick={() => navigate(entity.path)}
              className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors group"
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{entity.name}</p>
                  {entity.status && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {entity.status}
                    </Badge>
                  )}
                </div>
                {entity.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{entity.subtitle}</p>
                )}
                <p className="text-xs text-muted-foreground font-mono">{entity.id}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
