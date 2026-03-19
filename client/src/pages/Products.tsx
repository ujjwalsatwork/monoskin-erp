import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Download, Package, Trash2, Loader2, Tag, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { CreateEditDrawer, FormField } from '@/components/shared/CreateEditDrawer';
import { ExportModal } from '@/components/shared/ExportModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { BulkActionsBar } from '@/components/shared/BulkActionsBar';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: number;
  code: string;
  name: string;
  sku: string;
  category: string;
  packSize: string;
  mrp: string;
  hsnCode: string;
  gst: string;
  shelfLife: number;
  barcode: string | null;
  description: string | null;
  isActive: boolean;
}

interface ProductCategory {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

const defaultCategories = [
  'Serums',
  'Moisturizers',
  'Treatment',
  'Hair Care',
  'Cleansers',
  'Sunscreen',
];

const exportColumns = [
  { key: 'id', label: 'Product ID' },
  { key: 'code', label: 'Product Code' },
  { key: 'name', label: 'Product Name' },
  { key: 'sku', label: 'SKU' },
  { key: 'category', label: 'Category' },
  { key: 'packSize', label: 'Pack Size' },
  { key: 'mrp', label: 'MRP' },
  { key: 'hsnCode', label: 'HSN Code' },
  { key: 'gst', label: 'GST %' },
  { key: 'shelfLife', label: 'Shelf Life' },
];

export default function Products() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: productCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: ['/api/product-categories'],
  });

  const allCategories = useMemo(() => {
    const dbCategories = productCategories.map(c => c.name);
    const productCats = [...new Set(products.map(p => p.category))];
    return [...new Set([...defaultCategories, ...dbCategories, ...productCats, ...customCategories])];
  }, [products, productCategories, customCategories]);

  const productFields: FormField[] = useMemo(() => [
    { name: 'name', label: 'Product Name', type: 'text', required: true, placeholder: 'e.g., 432one Serum' },
    { name: 'sku', label: 'SKU / Code', type: 'text', required: true, placeholder: 'e.g., 432ONE-30ML' },
    { 
      name: 'category', 
      label: 'Category', 
      type: 'select', 
      required: true,
      options: allCategories.map(cat => ({ value: cat, label: cat })),
    },
    { name: 'packSize', label: 'Pack Size', type: 'text', required: true, placeholder: 'e.g., 30ml' },
    { name: 'mrp', label: 'MRP', type: 'currency', required: true },
    { name: 'hsnCode', label: 'HSN Code', type: 'text', required: true, placeholder: 'e.g., 33049990' },
    { name: 'gst', label: 'GST %', type: 'number', required: true, defaultValue: 18 },
    { name: 'shelfLife', label: 'Shelf Life (months)', type: 'number', required: true, defaultValue: 24 },
    { name: 'initialStock', label: 'Opening Stock (units)', type: 'number', required: false, placeholder: '0', helpText: 'Initial stock seeded across all warehouses' },
    { name: 'description', label: 'Description', type: 'textarea', required: false, placeholder: 'Product description...' },
  ], [allCategories]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const productCode = `PRD${String(products.length + 1).padStart(5, '0')}`;
      const payload = {
        ...data,
        code: productCode,
        mrp: String(data.mrp),
        gst: String(data.gst),
        shelfLife: Number(data.shelfLife) || 24,
      };
      const res = await apiRequest('POST', '/api/products', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: 'Product Created', description: 'New product has been added.' });
      setCreateDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to create product.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Product> }) => {
      const payload = {
        ...data,
        mrp: data.mrp ? String(data.mrp) : undefined,
        gst: data.gst ? String(data.gst) : undefined,
        shelfLife: data.shelfLife ? Number(data.shelfLife) : undefined,
      };
      const res = await apiRequest('PATCH', `/api/products/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: 'Product Updated', description: 'Product has been updated.' });
      setEditDrawerOpen(false);
      setEditingProduct(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update product.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: 'Product Deleted', description: 'Product has been removed.' });
      setDeleteDialogOpen(false);
      setDeletingProduct(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete product.', variant: 'destructive' });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', '/api/product-categories', { name, isActive: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-categories'] });
      toast({ title: 'Category Created', description: 'New category has been added.' });
      setNewCategoryName('');
    },
    onError: () => {
      setCustomCategories(prev => [...prev, newCategoryName]);
      toast({ title: 'Category Added', description: 'Category added locally.' });
      setNewCategoryName('');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/product-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-categories'] });
      toast({ title: 'Category Deleted', description: 'Category has been removed.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete category.', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredProducts = products.filter(product => {
    if (categoryFilter !== 'all' && product.category !== categoryFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.code?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const existingCategories = [...new Set(products.map(p => p.category))];

  const toggleSelect = (id: number) => {
    const strId = id.toString();
    setSelectedIds(prev =>
      prev.includes(strId) ? prev.filter(i => i !== strId) : [...prev, strId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id.toString()));
    }
  };

  const handleCreate = (data: Record<string, unknown>) => {
    createMutation.mutate(data as Partial<Product>);
  };

  const handleEdit = (data: Record<string, unknown>) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: data as Partial<Product> });
    }
  };

  const handleDelete = () => {
    if (deletingProduct) {
      deleteMutation.mutate(deletingProduct.id);
    }
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => deleteMutation.mutate(parseInt(id)));
    setSelectedIds([]);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({ title: 'Error', description: 'Please enter a category name.', variant: 'destructive' });
      return;
    }
    if (allCategories.includes(newCategoryName.trim())) {
      toast({ title: 'Error', description: 'This category already exists.', variant: 'destructive' });
      return;
    }
    createCategoryMutation.mutate(newCategoryName.trim());
  };

  const avgMrp = products.length > 0 
    ? Math.round(products.reduce((sum, p) => sum + parseFloat(p.mrp || '0'), 0) / products.length)
    : 0;

  const columns = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
          onCheckedChange={toggleSelectAll}
          data-testid="checkbox-select-all"
        />
      ),
      render: (item: Product) => (
        <Checkbox
          checked={selectedIds.includes(item.id.toString())}
          onCheckedChange={() => toggleSelect(item.id)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          data-testid={`checkbox-product-${item.id}`}
        />
      ),
    },
    {
      key: 'code',
      header: 'Code',
      render: (item: Product) => (
        <span className="font-mono text-xs" data-testid={`text-product-code-${item.id}`}>{item.code}</span>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (item: Product) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium" data-testid={`text-product-name-${item.id}`}>{item.name}</p>
            <p className="text-xs font-mono text-muted-foreground">{item.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item: Product) => (
        <Badge variant="outline" data-testid={`badge-category-${item.id}`}>{item.category}</Badge>
      ),
    },
    {
      key: 'packSize',
      header: 'Pack Size',
      render: (item: Product) => (
        <span className="text-sm">{item.packSize}</span>
      ),
    },
    {
      key: 'mrp',
      header: 'MRP',
      render: (item: Product) => (
        <span className="font-mono font-medium" data-testid={`text-mrp-${item.id}`}>₹{parseFloat(item.mrp || '0').toLocaleString('en-IN')}</span>
      ),
    },
    {
      key: 'hsn',
      header: 'HSN',
      render: (item: Product) => (
        <span className="font-mono text-xs">{item.hsnCode}</span>
      ),
    },
    {
      key: 'gst',
      header: 'GST',
      render: (item: Product) => (
        <span className="text-sm">{item.gst}%</span>
      ),
    },
    {
      key: 'shelfLife',
      header: 'Shelf Life',
      render: (item: Product) => (
        <span className="text-sm">{item.shelfLife} months</span>
      ),
    },
  ];

  const rowActions = [
    {
      label: 'View Details',
      onClick: (item: Product) => navigate(`/products/${item.id}`),
    },
    {
      label: 'Edit',
      onClick: (item: Product) => {
        setEditingProduct(item);
        setEditDrawerOpen(true);
      },
    },
    {
      label: 'View Inventory',
      onClick: (item: Product) => navigate(`/inventory?product=${item.id}`),
    },
    {
      label: 'Delete',
      onClick: (item: Product) => {
        setDeletingProduct(item);
        setDeleteDialogOpen(true);
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCategoryDialogOpen(true)} data-testid="button-manage-categories">
              <Tag className="h-4 w-4 mr-2" /> Manage Categories
            </Button>
            <Button onClick={() => setCreateDrawerOpen(true)} data-testid="button-add-product">
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="text-2xl font-display font-semibold" data-testid="stat-total-products">{products.length}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Categories</p>
          <p className="text-2xl font-display font-semibold" data-testid="stat-categories">{existingCategories.length}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Avg MRP</p>
          <p className="text-2xl font-display font-semibold" data-testid="stat-avg-mrp">
            ₹{avgMrp.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Active SKUs</p>
          <p className="text-2xl font-display font-semibold" data-testid="stat-active-skus">{products.filter(p => p.isActive).length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-products"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {existingCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setExportModalOpen(true)} data-testid="button-export">
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        onRowClick={(item) => navigate(`/products/${item.id}`)}
        rowActions={rowActions}
        emptyMessage="No products found"
      />

      <BulkActionsBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            label: 'Delete Selected',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: handleBulkDelete,
            variant: 'destructive',
          },
        ]}
      />

      <CreateEditDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Add New Product"
        fields={productFields}
        onSubmit={handleCreate}
        submitLabel="Create Product"
        isLoading={createMutation.isPending}
      />

      <CreateEditDrawer
        open={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingProduct(null);
        }}
        title="Edit Product"
        fields={productFields}
        initialData={editingProduct}
        onSubmit={handleEdit}
        submitLabel="Save Changes"
        isLoading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        description={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`}
        requireReason
        reasonLabel="Reason for deletion"
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        entityName="Products"
        columns={exportColumns}
        totalRecords={filteredProducts.length}
      />

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Product Categories</DialogTitle>
            <DialogDescription>
              Add or remove product categories for better organization and filtering.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add New Category</Label>
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name..."
                  data-testid="input-new-category"
                />
                <Button onClick={handleAddCategory} disabled={createCategoryMutation.isPending} data-testid="button-add-category">
                  {createCategoryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Existing Categories</Label>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {allCategories.map((cat, index) => {
                  const dbCat = productCategories.find(c => c.name === cat);
                  const usageCount = products.filter(p => p.category === cat).length;
                  return (
                    <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{cat}</span>
                        <Badge variant="secondary" className="text-xs">{usageCount} products</Badge>
                      </div>
                      {dbCat && usageCount === 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCategoryMutation.mutate(dbCat.id)}
                          disabled={deleteCategoryMutation.isPending}
                          data-testid={`button-delete-category-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)} data-testid="button-close-categories">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
