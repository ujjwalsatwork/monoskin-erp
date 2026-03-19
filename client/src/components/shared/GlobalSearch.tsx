import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, Building2, ShoppingCart, Package, Truck, FileText, Users, Warehouse, ArrowLeftRight, PackagePlus, Briefcase, Loader2 } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import type { Doctor, Lead, Order, Product, Warehouse as WarehouseType, Shipment, Invoice, Pharmacy, Transfer, GRN, MR } from '@shared/schema';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: leads = [], isLoading: leadsLoading, isError: leadsError } = useQuery<Lead[]>({
    queryKey: ['/api/leads'],
    enabled: open,
  });

  const { data: doctors = [], isLoading: doctorsLoading, isError: doctorsError } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
    enabled: open,
  });

  const { data: pharmacies = [], isLoading: pharmaciesLoading, isError: pharmaciesError } = useQuery<Pharmacy[]>({
    queryKey: ['/api/pharmacies'],
    enabled: open,
  });

  const { data: orders = [], isLoading: ordersLoading, isError: ordersError } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    enabled: open,
  });

  const { data: products = [], isLoading: productsLoading, isError: productsError } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: open,
  });

  const { data: warehouses = [], isLoading: warehousesLoading, isError: warehousesError } = useQuery<WarehouseType[]>({
    queryKey: ['/api/warehouses'],
    enabled: open,
  });

  const { data: shipments = [], isLoading: shipmentsLoading, isError: shipmentsError } = useQuery<Shipment[]>({
    queryKey: ['/api/shipments'],
    enabled: open,
  });

  const { data: invoices = [], isLoading: invoicesLoading, isError: invoicesError } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
    enabled: open,
  });

  const { data: transfers = [], isLoading: transfersLoading, isError: transfersError } = useQuery<Transfer[]>({
    queryKey: ['/api/transfers'],
    enabled: open,
  });

  const { data: grns = [], isLoading: grnsLoading, isError: grnsError } = useQuery<GRN[]>({
    queryKey: ['/api/grns'],
    enabled: open,
  });

  const { data: mrs = [], isLoading: mrsLoading, isError: mrsError } = useQuery<MR[]>({
    queryKey: ['/api/mrs'],
    enabled: open,
  });

  const isLoading = leadsLoading || doctorsLoading || pharmaciesLoading || ordersLoading || 
    productsLoading || warehousesLoading || shipmentsLoading || invoicesLoading || 
    transfersLoading || grnsLoading || mrsLoading;
  
  const hasError = leadsError || doctorsError || pharmaciesError || ordersError ||
    productsError || warehousesError || shipmentsError || invoicesError ||
    transfersError || grnsError || mrsError;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const filterByNameOrId = <T extends { id: number; name?: string }>(items: T[], query: string) => {
    if (!query) return items.slice(0, 5);
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.id.toString().includes(lowerQuery) ||
      (item.name && item.name.toLowerCase().includes(lowerQuery))
    ).slice(0, 5);
  };

  const filterOrders = (items: Order[], query: string) => {
    if (!query) return items.slice(0, 5);
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.id.toString().includes(lowerQuery) ||
      item.orderNumber.toLowerCase().includes(lowerQuery)
    ).slice(0, 5);
  };

  const filterInvoices = (items: Invoice[], query: string) => {
    if (!query) return items.slice(0, 5);
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.id.toString().includes(lowerQuery) ||
      item.invoiceNumber.toLowerCase().includes(lowerQuery)
    ).slice(0, 5);
  };

  const filterShipments = (items: Shipment[], query: string) => {
    if (!query) return items.slice(0, 5);
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.id.toString().includes(lowerQuery) ||
      (item.trackingId && item.trackingId.toLowerCase().includes(lowerQuery))
    ).slice(0, 5);
  };

  const filterTransfers = (items: Transfer[], query: string) => {
    if (!query) return items.slice(0, 5);
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.id.toString().includes(lowerQuery) ||
      item.transferNumber.toLowerCase().includes(lowerQuery)
    ).slice(0, 5);
  };

  const filterGRNs = (items: GRN[], query: string) => {
    if (!query) return items.slice(0, 5);
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.id.toString().includes(lowerQuery) ||
      item.grnNumber.toLowerCase().includes(lowerQuery)
    ).slice(0, 5);
  };

  const filterWarehouses = (items: WarehouseType[], query: string) => {
    if (!query) return items.slice(0, 5);
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.id.toString().includes(lowerQuery) ||
      item.name.toLowerCase().includes(lowerQuery) ||
      item.code.toLowerCase().includes(lowerQuery)
    ).slice(0, 5);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search leads, doctors, orders, products, MRs..." 
        value={search}
        onValueChange={setSearch}
        data-testid="input-global-search"
      />
      <CommandList>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : hasError ? (
          <div className="flex items-center justify-center py-6 text-destructive">
            <span className="text-sm">Failed to load search results. Please try again.</span>
          </div>
        ) : null}
        <CommandEmpty>{isLoading ? 'Loading...' : hasError ? 'Error loading results' : 'No results found.'}</CommandEmpty>

        <CommandGroup heading="Leads">
          {filterByNameOrId(leads, search).map((lead) => (
            <CommandItem
              key={lead.id}
              value={`lead-${lead.id}`}
              onSelect={() => handleSelect(`/leads/${lead.id}`)}
              data-testid={`search-result-lead-${lead.id}`}
            >
              <Users className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{lead.name}</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{lead.id}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Doctors">
          {filterByNameOrId(doctors, search).map((doctor) => (
            <CommandItem
              key={doctor.id}
              value={`doctor-${doctor.id}`}
              onSelect={() => handleSelect(`/doctors/${doctor.id}`)}
              data-testid={`search-result-doctor-${doctor.id}`}
            >
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{doctor.name}</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{doctor.id}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Pharmacies">
          {filterByNameOrId(pharmacies, search).map((pharmacy) => (
            <CommandItem
              key={pharmacy.id}
              value={`pharmacy-${pharmacy.id}`}
              onSelect={() => handleSelect(`/pharmacies/${pharmacy.id}`)}
              data-testid={`search-result-pharmacy-${pharmacy.id}`}
            >
              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{pharmacy.name}</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{pharmacy.id}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="MRs">
          {filterByNameOrId(mrs, search).map((mr) => (
            <CommandItem
              key={mr.id}
              value={`mr-${mr.id}`}
              onSelect={() => handleSelect(`/mr/${mr.id}`)}
              data-testid={`search-result-mr-${mr.id}`}
            >
              <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{mr.name}</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{mr.id}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Orders">
          {filterOrders(orders, search).map((order) => (
            <CommandItem
              key={order.id}
              value={`order-${order.id}`}
              onSelect={() => handleSelect(`/orders/${order.id}`)}
              data-testid={`search-result-order-${order.id}`}
            >
              <ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{order.orderNumber}</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{order.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Products">
          {filterByNameOrId(products, search).map((product) => (
            <CommandItem
              key={product.id}
              value={`product-${product.id}`}
              onSelect={() => handleSelect(`/products/${product.id}`)}
              data-testid={`search-result-product-${product.id}`}
            >
              <Package className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{product.name}</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{product.sku}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Warehouses">
          {filterWarehouses(warehouses, search).map((warehouse) => (
            <CommandItem
              key={warehouse.id}
              value={`warehouse-${warehouse.id}`}
              onSelect={() => handleSelect(`/warehouses/${warehouse.id}`)}
              data-testid={`search-result-warehouse-${warehouse.id}`}
            >
              <Warehouse className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{warehouse.name}</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{warehouse.code}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Shipments">
          {filterShipments(shipments, search).map((shipment) => (
            <CommandItem
              key={shipment.id}
              value={`shipment-${shipment.id}`}
              onSelect={() => handleSelect(`/shipments/${shipment.id}`)}
              data-testid={`search-result-shipment-${shipment.id}`}
            >
              <Truck className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Shipment #{shipment.id}</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{shipment.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Invoices">
          {filterInvoices(invoices, search).map((invoice) => (
            <CommandItem
              key={invoice.id}
              value={`invoice-${invoice.id}`}
              onSelect={() => handleSelect(`/invoices/${invoice.id}`)}
              data-testid={`search-result-invoice-${invoice.id}`}
            >
              <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{invoice.invoiceNumber}</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{invoice.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Transfers">
          {filterTransfers(transfers, search).map((transfer) => (
            <CommandItem
              key={transfer.id}
              value={`transfer-${transfer.id}`}
              onSelect={() => handleSelect(`/transfers/${transfer.id}`)}
              data-testid={`search-result-transfer-${transfer.id}`}
            >
              <ArrowLeftRight className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{transfer.transferNumber}</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{transfer.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="GRNs">
          {filterGRNs(grns, search).map((grn) => (
            <CommandItem
              key={grn.id}
              value={`grn-${grn.id}`}
              onSelect={() => handleSelect(`/grn/${grn.id}`)}
              data-testid={`search-result-grn-${grn.id}`}
            >
              <PackagePlus className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{grn.grnNumber}</span>
              <span className="ml-auto text-xs font-mono text-muted-foreground">{grn.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
