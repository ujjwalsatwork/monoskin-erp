import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { Package, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface StockItem {
  name: string;
  available: number;
  reserved: number;
  minThreshold: number;
  maxCapacity?: number;
}

interface StockLevelChartProps {
  data: StockItem[];
  title?: string;
  chartType?: 'bar' | 'progress' | 'pie';
  showAlerts?: boolean;
}

export function StockLevelChart({
  data,
  title = 'Stock Levels',
  chartType = 'bar',
  showAlerts = true,
}: StockLevelChartProps) {
  const getStockStatus = (item: StockItem) => {
    const utilization = (item.available / (item.maxCapacity || item.available + item.reserved + 100)) * 100;
    if (item.available <= item.minThreshold) return 'critical';
    if (item.available <= item.minThreshold * 1.5) return 'warning';
    return 'healthy';
  };

  const statusColors = {
    critical: 'hsl(var(--destructive))',
    warning: 'hsl(var(--muted-foreground))',
    healthy: 'hsl(var(--primary))',
  };

  const criticalCount = data.filter(d => getStockStatus(d) === 'critical').length;
  const warningCount = data.filter(d => getStockStatus(d) === 'warning').length;
  const healthyCount = data.filter(d => getStockStatus(d) === 'healthy').length;

  const pieData = [
    { name: 'Critical', value: criticalCount, color: statusColors.critical },
    { name: 'Warning', value: warningCount, color: statusColors.warning },
    { name: 'Healthy', value: healthyCount, color: statusColors.healthy },
  ].filter(d => d.value > 0);

  if (chartType === 'progress') {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            {title}
          </CardTitle>
          {showAlerts && (
            <div className="flex gap-2">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {criticalCount} Critical
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {warningCount} Low
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {data.slice(0, 8).map((item, index) => {
            const status = getStockStatus(item);
            const percentage = (item.available / (item.maxCapacity || item.available + 100)) * 100;
            
            return (
              <div key={index} className="space-y-1" data-testid={`stock-item-${index}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[200px]" data-testid={`text-stock-name-${index}`}>{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {item.available} / {item.maxCapacity || '∞'}
                    </span>
                    {status === 'critical' && <XCircle className="h-4 w-4 text-destructive" />}
                    {status === 'warning' && <AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                    {status === 'healthy' && <CheckCircle className="h-4 w-4 text-primary" />}
                  </div>
                </div>
                <Progress 
                  value={Math.min(percentage, 100)} 
                  className={`h-2 ${
                    status === 'critical' ? '[&>div]:bg-destructive' : 
                    status === 'warning' ? '[&>div]:bg-muted-foreground' : '[&>div]:bg-primary'
                  }`}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  if (chartType === 'pie') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1 text-sm" data-testid={`legend-${entry.name.toLowerCase()}`}>
                <div className={`w-3 h-3 rounded-full ${
                  entry.name === 'Critical' ? 'bg-destructive' : 
                  entry.name === 'Healthy' ? 'bg-primary' : 'bg-muted-foreground'
                }`} />
                <span>{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          {title}
        </CardTitle>
        {showAlerts && criticalCount > 0 && (
          <Badge variant="destructive">{criticalCount} below threshold</Badge>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" tick={{ fill: 'currentColor' }} />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={100} 
              tick={{ fill: 'currentColor', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              formatter={(value: number, name: string) => [value, name === 'available' ? 'Available' : 'Reserved']}
            />
            <Bar dataKey="available" stackId="a" name="Available" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={statusColors[getStockStatus(entry)]} />
              ))}
            </Bar>
            <Bar dataKey="reserved" stackId="a" name="Reserved" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
