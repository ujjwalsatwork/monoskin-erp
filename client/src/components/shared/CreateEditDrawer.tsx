import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'switch' | 'date' | 'currency';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  validation?: (value: any) => string | null;
  helpText?: string;
  disabled?: boolean;
  prefix?: string;
}

export interface CreateEditDrawerProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  fields: FormField[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function CreateEditDrawer({
  open,
  onClose,
  onOpenChange,
  title,
  description,
  fields,
  initialData,
  onSubmit,
  submitLabel = 'Save',
  isLoading = false,
}: CreateEditDrawerProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const baselineRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (open) {
      const defaults: Record<string, any> = {};
      fields.forEach(field => {
        defaults[field.name] = initialData?.[field.name] ?? field.defaultValue ?? '';
      });
      setFormData(defaults);
      baselineRef.current = defaults;
      setErrors({});
    }
  }, [open, initialData, fields]);

  const isDirty = useMemo(() => {
    return fields.some(field => {
      const current = formData[field.name];
      const baseline = baselineRef.current[field.name];
      return String(current ?? '') !== String(baseline ?? '');
    });
  }, [formData, fields]);

  useEffect(() => {
    if (!open || !isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [open, isDirty]);

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    fields.forEach(field => {
      const value = formData[field.name];
      if (field.required && (value === '' || value === null || value === undefined)) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (field.validation) {
        const error = field.validation(value);
        if (error) newErrors[field.name] = error;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before submitting.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(formData);
      baselineRef.current = { ...formData };
      onClose?.();
      onOpenChange?.(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const requestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      forceClose();
    }
  };

  const forceClose = () => {
    setShowDiscardConfirm(false);
    onClose?.();
    onOpenChange?.(false);
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name];
    const error = errors[field.name];

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              className={error ? 'border-destructive' : ''}
              rows={3}
            />
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value || ''}
              onValueChange={(v) => handleChange(field.name, v)}
              disabled={field.disabled}
            >
              <SelectTrigger className={error ? 'border-destructive' : ''}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      case 'switch':
        return (
          <div key={field.name} className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
            </div>
            <Switch
              id={field.name}
              checked={!!value}
              onCheckedChange={(v) => handleChange(field.name, v)}
              disabled={field.disabled}
            />
          </div>
        );

      case 'currency':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id={field.name}
                type="number"
                value={value || ''}
                onChange={(e) => handleChange(field.name, parseFloat(e.target.value) || '')}
                placeholder={field.placeholder}
                disabled={field.disabled}
                className={`pl-7 font-mono ${error ? 'border-destructive' : ''}`}
              />
            </div>
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );

      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              value={value || ''}
              onChange={(e) => handleChange(field.name, field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              className={error ? 'border-destructive' : ''}
            />
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) requestClose(); else onOpenChange?.(true); }}>
        <SheetContent className="w-full sm:w-[500px] md:w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-lg font-display">{title}</SheetTitle>
            {description && <div className="text-sm text-muted-foreground mt-1" data-testid="drawer-description">{description}</div>}
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="space-y-4 py-6 flex-1">
              {fields.map(renderField)}
            </div>

            <SheetFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={requestClose} disabled={submitting} data-testid="button-cancel-drawer">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || isLoading} data-testid="button-submit-drawer">
                {submitting ? 'Saving...' : submitLabel}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent data-testid="dialog-discard-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you leave now, your entered data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-discard-cancel">
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={forceClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-discard-confirm"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
