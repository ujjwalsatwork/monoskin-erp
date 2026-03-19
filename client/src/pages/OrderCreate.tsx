import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Minus, Plus, ShoppingCart, Truck, CreditCard, FileText, Search, X, User, Building2, ChevronsUpDown, TrendingUp, TrendingDown, AlertTriangle, Clock, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { Doctor, Product, Warehouse, Inventory, PromoCode, Pharmacy, Order } from '@shared/schema';

interface CustomerOption {
  id: string;
  type: 'doctor' | 'pharmacy';
  name: string;
  location: string;
  creditLimit: number;
  outstanding: number;
  entityId: number;
}

interface CartItem {
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  mrp: number;
  price: number;
  available: number;
}

const steps = [
  { id: 1, title: 'Select Customer', icon: Search },
  { id: 2, title: 'Add Products', icon: ShoppingCart },
  { id: 3, title: 'Apply Discounts', icon: CreditCard },
  { id: 4, title: 'Routing Preview', icon: Truck },
  { id: 5, title: 'Review & Submit', icon: FileText },
];

export default function OrderCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(0);
  const [productSearch, setProductSearch] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Credit' | 'Prepaid'>('Credit');
  const [remarks, setRemarks] = useState('');

  const { data: doctors = [], isLoading: doctorsLoading } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
  });

  const { data: pharmacies = [], isLoading: pharmaciesLoading } = useQuery<Pharmacy[]>({
    queryKey: ['/api/pharmacies'],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: inventory = [] } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory'],
  });

  const { data: promoCodes = [] } = useQuery<PromoCode[]>({
    queryKey: ['/api/promo-codes'],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const customerOptions = useMemo<CustomerOption[]>(() => {
    const docOptions: CustomerOption[] = doctors.map((d: Doctor) => ({
      id: `doctor-${d.id}`,
      type: 'doctor' as const,
      name: d.name,
      location: d.clinic || d.city || '',
      creditLimit: Number(d.creditLimit || 0),
      outstanding: Number(d.outstanding || 0),
      entityId: d.id,
    }));
    const phOptions: CustomerOption[] = pharmacies.map((p: Pharmacy) => ({
      id: `pharmacy-${p.id}`,
      type: 'pharmacy' as const,
      name: p.name,
      location: p.city || '',
      creditLimit: Number(p.creditLimit || 0),
      outstanding: Number(p.outstanding || 0),
      entityId: p.id,
    }));
    return [...docOptions, ...phOptions];
  }, [doctors, pharmacies]);

  const customerOrderHistory = useMemo(() => {
    if (!selectedCustomer) return { totalOrders: 0, deliveredOrders: 0, avgOrderValue: 0, lastOrderDate: null };
    const customerOrders = orders.filter((o: Order) => {
      if (selectedCustomer.type === 'doctor') return o.doctorId === selectedCustomer.entityId;
      return o.pharmacyId === selectedCustomer.entityId;
    });
    const delivered = customerOrders.filter((o: Order) => o.status === 'Delivered');
    const totalValue = customerOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const lastOrder = customerOrders.length > 0 ? customerOrders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0] : null;
    return {
      totalOrders: customerOrders.length,
      deliveredOrders: delivered.length,
      avgOrderValue: customerOrders.length > 0 ? totalValue / customerOrders.length : 0,
      lastOrderDate: lastOrder ? new Date(lastOrder.createdAt) : null,
    };
  }, [selectedCustomer, orders]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: {
      doctorId?: number;
      pharmacyId?: number;
      warehouseId: number;
      subtotal: string;
      discount: string;
      tax: string;
      total: string;
      status: string;
      notes?: string;
    }) => {
      const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
      const res = await apiRequest('POST', '/api/orders', {
        ...orderData,
        orderNumber,
      });
      const order = await res.json();
      
      const itemPromises = cart.map(item => 
        apiRequest('POST', `/api/orders/${order.id}/items`, {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: String(item.price),
          discount: '0',
          tax: '0',
          total: String(item.price * item.quantity),
        })
      );
      
      await Promise.all(itemPromises);
      return order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({ title: 'Order Created', description: `Order ${order.orderNumber} has been created successfully` });
      navigate('/orders');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create order', variant: 'destructive' });
    },
  });

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = subtotal * (appliedDiscount / 100);
  const tax = (subtotal - discountAmount) * 0.18;
  const total = subtotal - discountAmount + tax;
  const creditAvailable = selectedCustomer ? selectedCustomer.creditLimit - selectedCustomer.outstanding : 0;
  const creditExceeded = selectedCustomer && paymentMode === 'Credit' && (selectedCustomer.outstanding + total > selectedCustomer.creditLimit);
  const creditUtilization = selectedCustomer && selectedCustomer.creditLimit > 0 ? Math.round((selectedCustomer.outstanding / selectedCustomer.creditLimit) * 100) : 0;

  const filteredProducts = products.filter((p: Product) => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const getProductStock = (productId: number) => {
    const inv = inventory.filter((i: Inventory) => i.productId === productId);
    return inv.reduce((sum, i) => sum + (i.available || 0), 0);
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(c => c.productId === product.id);
    const available = getProductStock(product.id);
    if (existing) {
      if (existing.quantity < available) {
        setCart(cart.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        mrp: Number(product.mrp),
        price: Number(product.mrp) * 0.7,
        available,
      }]);
    }
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(cart.map(c => {
      if (c.productId === productId) {
        const newQty = Math.max(0, Math.min(c.available, c.quantity + delta));
        return { ...c, quantity: newQty };
      }
      return c;
    }).filter(c => c.quantity > 0));
  };

  const applyPromoCode = () => {
    const code = promoCodes.find((pc: PromoCode) => pc.code.toUpperCase() === promoCode.toUpperCase() && pc.status === 'Active');
    if (code) {
      setAppliedDiscount(Number(code.discount));
      toast({ title: 'Promo Applied', description: `${code.discount}% discount applied to your order` });
    } else {
      toast({ title: 'Invalid Code', description: 'This promo code is not valid', variant: 'destructive' });
    }
  };

  const handleSubmit = () => {
    if (!selectedCustomer || !selectedWarehouseId || cart.length === 0) {
      toast({ title: 'Missing Information', description: 'Please complete all required fields', variant: 'destructive' });
      return;
    }
    
    const orderData: Parameters<typeof createOrderMutation.mutate>[0] = {
      warehouseId: selectedWarehouseId,
      subtotal: String(subtotal),
      discount: String(discountAmount),
      tax: String(tax),
      total: String(total),
      status: creditExceeded ? 'Pending Approval' : 'Draft',
      notes: remarks || undefined,
    };
    
    if (selectedCustomer.type === 'doctor') {
      orderData.doctorId = selectedCustomer.entityId;
    } else {
      orderData.pharmacyId = selectedCustomer.entityId;
    }
    
    createOrderMutation.mutate(orderData);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return selectedCustomer !== null;
      case 2: return cart.length > 0;
      case 3: return true;
      case 4: return selectedWarehouseId > 0;
      case 5: return true;
      default: return true;
    }
  };

  if (doctorsLoading || productsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Create Order" description="Create a new sales order" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 md:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Create Order" 
        description="Create a new sales order"
        actions={<Button variant="outline" onClick={() => navigate('/orders')} data-testid="button-cancel"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders</Button>}
      />

      <div className="flex items-center justify-between mb-4">
        <Progress value={(currentStep / steps.length) * 100} className="w-full max-w-2xl" />
        <span className="text-sm text-muted-foreground ml-4">Step {currentStep} of {steps.length}</span>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Button
              key={step.id}
              variant={currentStep === step.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentStep(step.id)}
              disabled={step.id > currentStep + 1}
              className="whitespace-nowrap"
              data-testid={`button-step-${step.id}`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {step.title}
              {step.id < currentStep && <Check className="h-4 w-4 ml-2 text-green-500" />}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Customer</CardTitle>
                <CardDescription>Search for a doctor or pharmacy by name</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerSearchOpen}
                      className="w-full justify-between"
                      data-testid="button-select-customer"
                    >
                      {selectedCustomer ? (
                        <span className="flex items-center gap-2">
                          {selectedCustomer.type === 'doctor' ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                          {selectedCustomer.name} - {selectedCustomer.location}
                        </span>
                      ) : (
                        "Search customer..."
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search doctors or pharmacies..." data-testid="input-customer-search" />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup heading="Doctors">
                          {customerOptions.filter(c => c.type === 'doctor').map(customer => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.name} ${customer.location}`}
                              onSelect={() => {
                                setSelectedCustomer(customer);
                                setCustomerSearchOpen(false);
                              }}
                              data-testid={`option-customer-${customer.id}`}
                            >
                              <User className="mr-2 h-4 w-4" />
                              <div className="flex-1">
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-xs text-muted-foreground">{customer.location}</p>
                              </div>
                              {selectedCustomer?.id === customer.id && <Check className="h-4 w-4" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup heading="Pharmacies">
                          {customerOptions.filter(c => c.type === 'pharmacy').map(customer => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.name} ${customer.location}`}
                              onSelect={() => {
                                setSelectedCustomer(customer);
                                setCustomerSearchOpen(false);
                              }}
                              data-testid={`option-customer-${customer.id}`}
                            >
                              <Building2 className="mr-2 h-4 w-4" />
                              <div className="flex-1">
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-xs text-muted-foreground">{customer.location}</p>
                              </div>
                              {selectedCustomer?.id === customer.id && <Check className="h-4 w-4" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedCustomer && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedCustomer.type === 'doctor' ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                          <div>
                            <p className="font-semibold">{selectedCustomer.name}</p>
                            <p className="text-sm text-muted-foreground">{selectedCustomer.location}</p>
                          </div>
                        </div>
                        <Badge variant={selectedCustomer.type === 'doctor' ? 'default' : 'secondary'}>
                          {selectedCustomer.type === 'doctor' ? 'Doctor' : 'Pharmacy'}
                        </Badge>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Credit Limit</Label>
                          <p className="font-semibold" data-testid="text-credit-limit">₹{selectedCustomer.creditLimit.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Outstanding</Label>
                          <p className={cn("font-semibold", creditUtilization >= 80 ? "text-destructive" : "")} data-testid="text-outstanding">
                            ₹{selectedCustomer.outstanding.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Available Credit</Label>
                          <p className={cn("font-semibold", creditAvailable < 0 ? "text-destructive" : "text-green-600")} data-testid="text-available-credit">
                            ₹{creditAvailable.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Utilization</Label>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(creditUtilization, 100)} className="h-2 flex-1" />
                            <span className={cn("text-sm font-medium", creditUtilization >= 80 ? "text-destructive" : "")}>{creditUtilization}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Order History Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div className="space-y-1">
                            <p className="text-2xl font-bold" data-testid="text-total-orders">{customerOrderHistory.totalOrders}</p>
                            <p className="text-xs text-muted-foreground">Total Orders</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-2xl font-bold text-green-600" data-testid="text-delivered-orders">{customerOrderHistory.deliveredOrders}</p>
                            <p className="text-xs text-muted-foreground">Delivered</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-2xl font-bold" data-testid="text-avg-value">₹{Math.round(customerOrderHistory.avgOrderValue).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Avg. Order Value</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium" data-testid="text-last-order">
                              {customerOrderHistory.lastOrderDate 
                                ? customerOrderHistory.lastOrderDate.toLocaleDateString()
                                : 'No orders yet'}
                            </p>
                            <p className="text-xs text-muted-foreground">Last Order</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {creditUtilization >= 80 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          High credit utilization ({creditUtilization}%). Consider prepaid payment or requesting additional credit limit.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Add Products</CardTitle>
                <CardDescription>Search and add products to the order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search products..." 
                    value={productSearch} 
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-product-search"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredProducts.slice(0, 10).map((product: Product) => {
                    const stock = getProductStock(product.id);
                    const inCart = cart.find(c => c.productId === product.id);
                    return (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.sku} | MRP: ₹{Number(product.mrp).toLocaleString()}</p>
                          <Badge variant={stock > 0 ? 'outline' : 'destructive'}>{stock} in stock</Badge>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => addToCart(product)} 
                          disabled={stock === 0}
                          data-testid={`button-add-product-${product.id}`}
                        >
                          {inCart ? `Add (${inCart.quantity})` : 'Add'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Apply Discounts</CardTitle>
                <CardDescription>Enter promo code or apply scheme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter promo code" 
                    value={promoCode} 
                    onChange={(e) => setPromoCode(e.target.value)}
                    data-testid="input-promo-code"
                  />
                  <Button onClick={applyPromoCode} data-testid="button-apply-promo">Apply</Button>
                </div>
                {appliedDiscount > 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-between">
                    <span className="text-green-700 dark:text-green-400">{appliedDiscount}% discount applied</span>
                    <Button variant="ghost" size="sm" onClick={() => setAppliedDiscount(0)}><X className="h-4 w-4" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Warehouse</CardTitle>
                <CardDescription>Choose fulfillment warehouse</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={String(selectedWarehouseId)} onValueChange={(v) => setSelectedWarehouseId(Number(v))}>
                  <SelectTrigger data-testid="select-warehouse"><SelectValue placeholder="Select warehouse..." /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w: Warehouse) => (
                      <SelectItem key={w.id} value={String(w.id)}>{w.name} - {w.city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Review Order</CardTitle>
                <CardDescription>Confirm order details before submission</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Customer</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedCustomer?.type === 'doctor' ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                      <p className="font-medium" data-testid="review-customer">{selectedCustomer?.name || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Warehouse</Label>
                    <p className="font-medium mt-1" data-testid="review-warehouse">{warehouses.find((w: Warehouse) => w.id === selectedWarehouseId)?.name || '-'}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground text-xs">Products ({cart.length} items)</Label>
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">₹{item.price.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">₹{(item.price * item.quantity).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span data-testid="review-subtotal">₹{subtotal.toLocaleString()}</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({appliedDiscount}%)</span>
                      <span data-testid="review-discount">-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Tax (GST 18%)</span>
                    <span data-testid="review-tax">₹{tax.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span data-testid="review-total">₹{total.toLocaleString()}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm">Payment Mode</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant={paymentMode === 'Credit' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMode('Credit')}
                        data-testid="button-payment-credit"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Credit
                      </Button>
                      <Button
                        variant={paymentMode === 'Prepaid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMode('Prepaid')}
                        data-testid="button-payment-prepaid"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Prepaid
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Remarks (Optional)</Label>
                    <Input
                      placeholder="Add any notes for this order..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="mt-2"
                      data-testid="input-remarks"
                    />
                  </div>
                </div>

                {paymentMode === 'Credit' && selectedCustomer && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Credit Check</span>
                      {creditExceeded ? (
                        <Badge variant="destructive">Exceeds Limit</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Credit Limit</p>
                        <p className="font-medium">₹{selectedCustomer.creditLimit.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Outstanding</p>
                        <p className="font-medium">₹{selectedCustomer.outstanding.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">After This Order</p>
                        <p className={cn("font-medium", creditExceeded ? "text-destructive" : "")}>
                          ₹{(selectedCustomer.outstanding + total).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {creditExceeded && paymentMode === 'Credit' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This order exceeds the customer's credit limit by ₹{Math.abs(creditAvailable - total).toLocaleString()}. 
                      Switch to Prepaid or request credit limit increase to proceed.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No items in cart</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-muted-foreground">₹{item.price.toLocaleString()} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => updateQuantity(item.productId, -1)} data-testid={`button-minus-${item.productId}`}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <Button variant="ghost" size="sm" onClick={() => updateQuantity(item.productId, 1)} data-testid={`button-plus-${item.productId}`}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                {appliedDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({appliedDiscount}%)</span><span>-₹{discountAmount.toLocaleString()}</span></div>}
                <div className="flex justify-between"><span>Tax (18%)</span><span>₹{tax.toLocaleString()}</span></div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} className="flex-1" data-testid="button-prev">
                <ArrowLeft className="h-4 w-4 mr-2" /> Previous
              </Button>
            )}
            {currentStep < 5 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()} className="flex-1" data-testid="button-next">
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed() || createOrderMutation.isPending} className="flex-1" data-testid="button-submit">
                {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
