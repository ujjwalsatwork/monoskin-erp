import { useState } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'text' | 'date' | 'daterange';
  options?: { value: string; label: string }[];
}

interface FilterDrawerProps {
  filters: FilterOption[];
  activeFilters: Record<string, any>;
  onApply: (filters: Record<string, any>) => void;
  onReset: () => void;
}

export function FilterDrawer({ filters, activeFilters, onApply, onReset }: FilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(activeFilters);

  const activeCount = Object.values(activeFilters).filter(v => v && (Array.isArray(v) ? v.length > 0 : true)).length;

  const handleApply = () => {
    onApply(localFilters);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalFilters({});
    onReset();
    setOpen(false);
  };

  const updateFilter = (key: string, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          More Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[400px] md:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {filters.map((filter) => (
            <div key={filter.key} className="space-y-2">
              <Label className="text-sm font-medium">{filter.label}</Label>
              
              {filter.type === 'select' && filter.options && (
                <Select
                  value={localFilters[filter.key] || ''}
                  onValueChange={(value) => updateFilter(filter.key, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filter.type === 'multiselect' && filter.options && (
                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                  {filter.options.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${filter.key}-${opt.value}`}
                        checked={(localFilters[filter.key] || []).includes(opt.value)}
                        onCheckedChange={(checked) => {
                          const current = localFilters[filter.key] || [];
                          if (checked) {
                            updateFilter(filter.key, [...current, opt.value]);
                          } else {
                            updateFilter(filter.key, current.filter((v: string) => v !== opt.value));
                          }
                        }}
                      />
                      <Label htmlFor={`${filter.key}-${opt.value}`} className="text-sm font-normal cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {filter.type === 'text' && (
                <Input
                  value={localFilters[filter.key] || ''}
                  onChange={(e) => updateFilter(filter.key, e.target.value)}
                  placeholder={`Enter ${filter.label.toLowerCase()}`}
                />
              )}

              {filter.type === 'date' && (
                <Input
                  type="date"
                  value={localFilters[filter.key] || ''}
                  onChange={(e) => updateFilter(filter.key, e.target.value)}
                />
              )}

              {filter.type === 'daterange' && (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={localFilters[`${filter.key}_from`] || ''}
                    onChange={(e) => updateFilter(`${filter.key}_from`, e.target.value)}
                    placeholder="From"
                  />
                  <Input
                    type="date"
                    value={localFilters[`${filter.key}_to`] || ''}
                    onChange={(e) => updateFilter(`${filter.key}_to`, e.target.value)}
                    placeholder="To"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
