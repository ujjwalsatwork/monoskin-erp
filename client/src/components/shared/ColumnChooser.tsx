import { useState } from 'react';
import { Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

export interface ColumnOption {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

interface ColumnChooserProps {
  columns: ColumnOption[];
  visibleColumns: string[];
  onApply: (columns: string[]) => void;
}

export function ColumnChooser({ columns, visibleColumns, onApply }: ColumnChooserProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(visibleColumns);

  const handleToggle = (key: string) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    setSelected(columns.map(c => c.key));
  };

  const handleDeselectAll = () => {
    setSelected([]);
  };

  const handleApply = () => {
    onApply(selected);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns3 className="h-4 w-4" />
          Columns
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose Columns</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
            {columns.map((col) => (
              <div key={col.key} className="flex items-center gap-2">
                <Checkbox
                  id={`col-${col.key}`}
                  checked={selected.includes(col.key)}
                  onCheckedChange={() => handleToggle(col.key)}
                />
                <Label htmlFor={`col-${col.key}`} className="text-sm font-normal cursor-pointer">
                  {col.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
