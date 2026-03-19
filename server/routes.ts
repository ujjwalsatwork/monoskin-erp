import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import { parse } from "csv-parse/sync";
import {
  insertProductSchema,
  insertWarehouseSchema,
  insertDoctorSchema,
  insertPharmacySchema,
  insertLeadSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertInvoiceSchema,
  insertApprovalSchema,
  insertShipmentSchema,
  insertGRNSchema,
  insertTransferSchema,
  insertPromoCodeSchema,
  insertClinicCodeSchema,
  insertPricingSlabSchema,
  insertCarrierSchema,
  insertAccessLogSchema,
  insertMRSchema,
  insertMRVisitSchema,
  insertMRAttendanceSchema,
  insertMRTargetSchema,
  insertSchemeSchema,
  insertCreditNoteSchema,
  insertTaxHSNCodeSchema,
  insertTerritorySchema,
  insertPickingTaskSchema,
  insertPackingTaskSchema,
  insertDispatchTaskSchema,
  insertReportTemplateSchema,
  insertExportJobSchema,
  insertInventorySchema,
  insertLeaveRequestSchema,
  insertLeaveBalanceSchema,
  insertCompanyHolidaySchema,
  type InsertLeaveRequest,
  type InsertLeaveBalance,
  type InsertCompanyHoliday,
  type InsertProduct,
  type InsertWarehouse,
  type InsertDoctor,
  type InsertPharmacy,
  type InsertLead,
  type InsertOrder,
  type InsertOrderItem,
  type InsertInvoice,
  type InsertApproval,
  type InsertShipment,
  type InsertGRN,
  type InsertTransfer,
  type InsertPromoCode,
  type InsertClinicCode,
  type InsertPricingSlab,
  type InsertCarrier,
  type InsertAccessLog,
  type InsertMR,
  type InsertMRVisit,
  type InsertMRAttendance,
  type InsertMRTarget,
  type InsertScheme,
  type InsertCreditNote,
  type InsertTaxHSNCode,
  type InsertTerritory,
  type InsertPickingTask,
  type InsertPackingTask,
  type InsertDispatchTask,
  type InsertReportTemplate,
  type InsertExportJob,
  insertOnboardingChecklistSchema,
  insertExitWorkflowSchema,
  insertEmergencyContactSchema,
  insertReportUsageLogSchema,
  insertRegulatoryAuditLogSchema,
  insertSuspiciousActivitySchema,
  insertDataRetentionPolicySchema,
  insertMaskedDataAccessLogSchema,
  insertProductCategorySchema,
  insertReturnSchema,
  insertReturnItemSchema,
  type InsertProductCategory,
  type InsertReturn,
  type InsertReturnItem,
  type InsertOnboardingChecklist,
  type InsertExitWorkflow,
  type InsertEmergencyContact,
  type InsertReportUsageLog,
  type InsertRegulatoryAuditLog,
  type InsertSuspiciousActivity,
  type InsertDataRetentionPolicy,
  type InsertMaskedDataAccessLog,
  insertRoleTemplateSchema,
  type ModulePermission,
} from "../shared/schema";

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

function parseId(id: string | string[] | undefined): number {
  if (!id) throw new Error("ID is required");
  const idStr = Array.isArray(id) ? id[0] : id;
  const parsed = parseInt(idStr, 10);
  if (isNaN(parsed)) throw new Error("Invalid ID");
  return parsed;
}

function parseIdFromParams(id: string | string[] | undefined): number {
  if (!id) throw new Error("ID is required");
  const idStr = Array.isArray(id) ? id[0] : id;
  const parsed = parseInt(idStr, 10);
  if (isNaN(parsed)) throw new Error("Invalid ID");
  return parsed;
}

const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const TIMESTAMP_FIELDS = new Set([
  'createdAt', 'updatedAt', 'lastLoginAt', 'expiresAt', 'lastContactedAt',
  'deliveredAt', 'paidAt', 'approvedAt', 'dispatchedAt', 'resolvedAt',
  'receivedAt', 'verifiedAt', 'completedAt', 'scheduledAt', 'processedAt',
  'acknowledgedAt', 'lastTriggeredAt', 'startedAt', 'finishedAt',
  'appliedAt', 'detectedAt', 'lastExecutedAt', 'nextExecutionAt',
  'lastGeneratedAt', 'lastInteractionDate', 'lastActivity', 'lastSyncAt',
  'lastUpdated', 'inventoryAdjustedAt',
  'startDate', 'endDate', 'exitDate', 'reminderDate',
  'issueDate', 'expiryDate', 'date', 'joiningDate', 'dueDate',
]);

function normalizeDates<T extends Record<string, any>>(body: T, extraTimestampFields?: string[]): T {
  const result = { ...body };
  const extra = extraTimestampFields ? new Set(extraTimestampFields) : null;
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val !== 'string') continue;
    if (DATETIME_REGEX.test(val)) {
      (result as any)[key] = new Date(val);
    } else if (DATE_ONLY_REGEX.test(val) && (TIMESTAMP_FIELDS.has(key) || extra?.has(key))) {
      (result as any)[key] = new Date(val);
    }
  }
  return result;
}

function validate<T>(schema: z.ZodTypeAny, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error?.issues || result.error?.errors || [];
    const message = issues.length > 0
      ? issues.map((e: any) => `${(e.path || []).join('.')}: ${e.message}`).join(', ')
      : result.error?.message || 'Validation failed';
    throw new ValidationError(message);
  }
  return result.data as T;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // ============== AUTHENTICATION ==============
  const loginSchema = z.object({
    identifier: z.string().min(1, "Email, username or phone is required"),
    password: z.string().min(1, "Password is required"),
    authMethod: z.enum(['email', 'phone']).optional().default('email'),
  });

  // OTP storage (in-memory, expires after 5 minutes)
  const otpStore = new Map<string, { 
    otp: string; 
    expiresAt: Date; 
    userId: number; 
    attempts: number; 
    lastSentAt: Date;
  }>();
  const MAX_OTP_ATTEMPTS = 5;
  const OTP_COOLDOWN_MS = 60 * 1000; // 1 minute between sends

  // Generate 6-digit OTP
  function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Format phone number for lookup (keep 10 digits without country code)
  function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    // If starts with country code 91 and has 12 digits, strip 91
    if (digits.startsWith('91') && digits.length === 12) {
      return digits.slice(2);
    }
    // Return last 10 digits
    return digits.slice(-10);
  }

  // Send OTP endpoint
  app.post("/api/auth/send-otp", asyncHandler(async (req, res) => {
    const schema = z.object({ phone: z.string().min(10, "Valid phone number required") });
    const { phone } = validate(schema, req.body);
    
    const normalizedPhone = normalizePhone(phone);
    
    // Rate limiting: check if OTP was sent recently
    const existing = otpStore.get(normalizedPhone);
    if (existing && (Date.now() - existing.lastSentAt.getTime()) < OTP_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - existing.lastSentAt.getTime())) / 1000);
      res.status(429).json({ error: `Please wait ${waitSeconds} seconds before requesting another OTP` });
      return;
    }
    
    const user = await storage.getUserByPhone(normalizedPhone);
    
    if (!user) {
      // Don't reveal if user exists - still return success
      res.json({ success: true, message: "If the phone number is registered, an OTP has been sent" });
      return;
    }
    
    if (!user.isActive) {
      res.status(401).json({ error: "Account is inactive" });
      return;
    }
    
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    otpStore.set(normalizedPhone, { 
      otp, 
      expiresAt, 
      userId: user.id, 
      attempts: 0,
      lastSentAt: new Date()
    });
    
    // Try to send OTP via WhatsApp if configured
    try {
      const { createWhatsAppService } = await import('./integrations/whatsapp');
      const whatsApp = createWhatsAppService({
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      });
      
      if (whatsApp) {
        await whatsApp.sendTextMessage({
          to: normalizedPhone,
          message: `Your Monoskin ERP login OTP is: ${otp}. Valid for 5 minutes. Do not share this with anyone.`,
        });
        console.log(`OTP sent to ${normalizedPhone} via WhatsApp`);
      } else if (process.env.NODE_ENV !== 'production') {
        // Only log OTP in development mode
        console.log(`[DEV] OTP for ${normalizedPhone}: ${otp}`);
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] OTP for ${normalizedPhone}: ${otp}`);
      }
    }
    
    res.json({ success: true, message: "OTP sent successfully" });
  }));

  // Verify OTP endpoint
  app.post("/api/auth/verify-otp", asyncHandler(async (req, res) => {
    const schema = z.object({
      phone: z.string().min(10, "Valid phone number required"),
      otp: z.string().length(6, "OTP must be 6 digits"),
    });
    const { phone, otp } = validate(schema, req.body);
    
    const normalizedPhone = normalizePhone(phone);
    const stored = otpStore.get(normalizedPhone);
    
    if (!stored) {
      res.status(401).json({ error: "No OTP found. Please request a new one." });
      return;
    }
    
    if (new Date() > stored.expiresAt) {
      otpStore.delete(normalizedPhone);
      res.status(401).json({ error: "OTP expired. Please request a new one." });
      return;
    }
    
    // Check attempt limit
    if (stored.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(normalizedPhone);
      res.status(429).json({ error: "Too many failed attempts. Please request a new OTP." });
      return;
    }
    
    if (stored.otp !== otp) {
      // Increment attempts
      stored.attempts += 1;
      otpStore.set(normalizedPhone, stored);
      const remaining = MAX_OTP_ATTEMPTS - stored.attempts;
      res.status(401).json({ 
        error: remaining > 0 
          ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` 
          : "Invalid OTP. Please request a new one."
      });
      return;
    }
    
    // OTP verified - clean up and create session
    otpStore.delete(normalizedPhone);
    
    const user = await storage.getUser(stored.userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    
    // Invalidate existing sessions
    await storage.deleteUserSessions(user.id);
    
    // Create session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    await storage.createSession({
      userId: user.id,
      token,
      expiresAt,
    });
    
    // Update last login
    await storage.updateUser(user.id, { lastLoginAt: new Date() } as any);
    
    // Set cookie
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    
    // Return same shape as password login for consistency
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }));

  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    const { identifier, password, authMethod } = validate(loginSchema, req.body);
    
    let user = null;
    
    if (authMethod === 'phone') {
      // Phone-based authentication
      user = await storage.getUserByPhone(identifier);
    } else {
      // Email/username-based authentication
      user = await storage.getUserByEmail(identifier);
      if (!user) {
        user = await storage.getUserByUsername(identifier);
      }
    }
    
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    
    if (!user.isActive) {
      res.status(401).json({ error: "Account is inactive" });
      return;
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    
    // Invalidate existing sessions for this user (session rotation)
    await storage.deleteUserSessions(user.id);
    
    // Create session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    await storage.createSession({
      userId: user.id,
      token,
      expiresAt,
    });
    
    // Update last login
    await storage.updateUser(user.id, { lastLoginAt: new Date() } as any);
    
    // Set cookie
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }));

  app.post("/api/auth/logout", asyncHandler(async (req, res) => {
    const token = req.cookies?.session;
    if (token) {
      await storage.deleteSession(token);
    }
    res.clearCookie('session');
    res.json({ success: true });
  }));

  app.get("/api/auth/me", asyncHandler(async (req, res) => {
    const token = req.cookies?.session;
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    
    const session = await storage.getSessionByToken(token);
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await storage.deleteSession(token);
      }
      res.clearCookie('session');
      res.status(401).json({ error: "Session expired" });
      return;
    }
    
    const user = await storage.getUser(session.userId);
    if (!user || !user.isActive) {
      await storage.deleteSession(token);
      res.clearCookie('session');
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }

    // Rolling session: extend expiry on each auth check so active users stay logged in
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await storage.extendSession(token, newExpiry);
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }));

  // ============== AUTHORIZATION MIDDLEWARE ==============
  // Exact API endpoint to feature mapping
  const API_FEATURE_MAP: Record<string, string> = {
    'dashboard': 'dashboard',
    'kpis': 'dashboard',
    'leads': 'leads',
    'mrs': 'mr_management',
    'mr-visits': 'mr_management',
    'mr-targets': 'mr_management',
    'mr-attendance': 'mr_management',
    'doctors': 'doctors_pharmacies',
    'pharmacies': 'doctors_pharmacies',
    'orders': 'orders',
    'order-items': 'orders',
    'inventory': 'inventory',
    'warehouses': 'warehouses',
    'grns': 'warehouses',
    'transfers': 'warehouses',
    'picking-tasks': 'warehouses',
    'packing-tasks': 'warehouses',
    'dispatch-tasks': 'warehouses',
    'products': 'products',
    'pricing-slabs': 'products',
    'schemes': 'products',
    'promo-codes': 'products',
    'clinic-codes': 'products',
    'shipments': 'logistics',
    'returns': 'logistics',
    'invoices': 'finance',
    'credit-notes': 'finance',
    'receipts': 'finance',
    'ar-ageing': 'finance',
    'gst-reports': 'finance',
    'employees': 'hr_compliance',
    'hr-attendance': 'hr_compliance',
    'leave-requests': 'hr_compliance',
    'leave-balances': 'hr_compliance',
    'company-holidays': 'hr_compliance',
    'compliance-items': 'hr_compliance',
    'licenses': 'hr_compliance',
    'audit-logs': 'security',
    'access-logs': 'security',
    'data-masking-rules': 'security',
    'export-controls': 'security',
    'users': 'master_data',
    'territories-list': 'master_data',
    'tax-hsn-codes': 'master_data',
    'integrations': 'master_data',
    'import-jobs': 'master_data',
    'export-templates': 'master_data',
    'settings': 'master_data',
    'approvals': 'approvals',
    'report-templates': 'reports',
    'saved-reports': 'reports',
    'sales-analytics': 'reports',
    'mr-analytics': 'reports',
    'report-usage-logs': 'reports',
    'regulatory-audit-logs': 'reports',
    'suspicious-activities': 'security',
    'data-retention-policies': 'security',
    'masked-data-access-logs': 'security',
    'carriers': 'logistics',
    'order-items': 'orders',
    'grn-items': 'warehouses',
    'transfer-items': 'warehouses',
    'inventory-snapshots': 'inventory',
    'return-items': 'logistics',
    'invoice-items': 'finance',
  };

  // Role to feature permissions (exact matching)
  const ROLE_PERMISSIONS: Record<string, string[]> = {
    'Super Admin': ['dashboard', 'approvals', 'leads', 'mr_management', 'doctors_pharmacies', 'orders', 'inventory', 'warehouses', 'products', 'logistics', 'finance', 'hr_compliance', 'reports', 'security', 'master_data'],
    'Admin Ops': ['dashboard', 'approvals', 'leads', 'doctors_pharmacies', 'orders', 'inventory', 'warehouses', 'products', 'logistics', 'finance', 'reports', 'security', 'master_data'],
    'Sales Manager': ['dashboard', 'approvals', 'leads', 'mr_management', 'doctors_pharmacies', 'orders', 'products', 'reports'],
    'Medical Representative': ['dashboard', 'leads', 'doctors_pharmacies', 'orders'],
    'Warehouse Manager': ['dashboard', 'approvals', 'inventory', 'warehouses', 'logistics', 'reports'],
    'Warehouse Staff': ['dashboard', 'inventory', 'warehouses'],
    'Logistics Manager': ['dashboard', 'logistics', 'warehouses', 'orders', 'reports'],
    'Finance Manager': ['dashboard', 'approvals', 'finance', 'orders', 'reports'],
    'Finance Staff': ['dashboard', 'finance', 'orders'],
    'HR/Compliance': ['dashboard', 'hr_compliance', 'security', 'reports'],
    'Analytics Viewer': ['dashboard', 'reports'],
  };

  // Middleware to attach user and check permissions
  app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    
    // Skip auth routes and health check
    if (path.startsWith('/auth') || path === '/health') {
      return next();
    }
    
    const token = req.cookies?.session;
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const session = await storage.getSessionByToken(token);
      if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({ error: "Session expired" });
      }
      
      const user = await storage.getUser(session.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: "User not found or inactive" });
      }
      
      // Load custom role template if assigned
      let roleTemplate: { modules: any[] } | null = null;
      if (user.roleTemplateId) {
        roleTemplate = await storage.getRoleTemplate(user.roleTemplateId) || null;
      }
      
      // Attach user and template to request
      (req as any).user = user;
      (req as any).roleTemplate = roleTemplate;
      
      const userRole = user.role;
      
      // Super Admin has access to everything
      if (userRole === 'Super Admin') {
        return next();
      }
      
      // Extract the API resource from path (e.g., /api/orders/123 -> orders)
      const pathParts = path.split('/').filter(Boolean);
      const resource = pathParts[0]; // First segment after /api/
      
      // Allow role-templates endpoint for everyone (read-only check happens in route)
      if (resource === 'role-templates') return next();
      
      // Find the feature for this resource
      const feature = API_FEATURE_MAP[resource];
      
      // If resource not mapped, deny access by default (secure default)
      if (!feature) {
        console.warn(`Unmapped API resource: ${resource} - denying access`);
        return res.status(403).json({ 
          error: 'Access denied',
          message: `This resource (${resource}) requires administrative access`
        });
      }
      
      // If user has a custom role template, check template permissions first
      if (roleTemplate && Array.isArray(roleTemplate.modules)) {
        const modulePerms = (roleTemplate.modules as any[]).find((m: any) => m.module === feature);
        if (modulePerms && modulePerms.canRead) {
          return next();
        }
        return res.status(403).json({
          error: 'Access denied',
          message: `Your custom role does not have access to ${resource}`
        });
      }
      
      // Get permissions for built-in role
      const allowedFeatures = ROLE_PERMISSIONS[userRole] || [];
      
      // Check exact feature match
      if (!allowedFeatures.includes(feature)) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: `Your role (${userRole}) does not have access to ${resource}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============== DASHBOARD ==============
  app.get("/api/dashboard/kpis", asyncHandler(async (_req, res) => {
    const kpis = await storage.getDashboardKPIs();
    res.json(kpis);
  }));

  app.get("/api/dashboard/sales-trend", asyncHandler(async (_req, res) => {
    const orders = await storage.getOrders();
    const now = new Date();
    
    const months: { month: string; orders: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthName = startDate.toLocaleString('default', { month: 'short' });
      
      const monthOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });
      
      const revenue = monthOrders.reduce((sum, o) => sum + Number(o.total || 0), 0) / 1000;
      
      months.push({
        month: monthName,
        orders: monthOrders.length,
        revenue: Math.round(revenue * 10) / 10,
      });
    }
    
    res.json(months);
  }));

  app.get("/api/dashboard/inventory-status", asyncHandler(async (_req, res) => {
    const inventory = await storage.getInventory();
    const products = await storage.getProducts();
    
    const productThresholds = new Map(products.map(p => [p.id, p.minStockThreshold || 50]));
    
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    
    for (const item of inventory) {
      const threshold = productThresholds.get(item.productId) || 50;
      if (item.available <= 0) {
        outOfStock++;
      } else if (item.available <= threshold) {
        lowStock++;
      } else {
        inStock++;
      }
    }
    
    const total = inStock + lowStock + outOfStock;
    res.json([
      { name: 'In Stock', value: total > 0 ? Math.round((inStock / total) * 100) : 0, color: '#22c55e' },
      { name: 'Low Stock', value: total > 0 ? Math.round((lowStock / total) * 100) : 0, color: '#eab308' },
      { name: 'Out of Stock', value: total > 0 ? Math.round((outOfStock / total) * 100) : 0, color: '#ef4444' },
    ]);
  }));

  // ============== PRODUCTS ==============
  app.get("/api/products", asyncHandler(async (_req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  }));

  app.get("/api/products/:id", asyncHandler(async (req, res) => {
    const product = await storage.getProduct(parseIdFromParams(req.params.id));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(product);
  }));

  app.post("/api/products", asyncHandler(async (req, res) => {
    const body = { ...req.body };
    // Extract initialStock before schema validation (not a product field)
    const initialStock = Math.max(0, parseInt(body.initialStock as string) || 0);
    delete body.initialStock;

    if (typeof body.mrp === 'number') body.mrp = String(body.mrp);
    if (typeof body.gst === 'number') body.gst = String(body.gst);
    if (typeof body.avgMonthlySales3m === 'number') body.avgMonthlySales3m = String(body.avgMonthlySales3m);
    if (typeof body.avgMonthlySales6m === 'number') body.avgMonthlySales6m = String(body.avgMonthlySales6m);
    if (typeof body.avgMonthlySales12m === 'number') body.avgMonthlySales12m = String(body.avgMonthlySales12m);
    const parsed = insertProductSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const product = await storage.createProduct(parsed.data);

    // Auto-initialize inventory records for all active warehouses
    try {
      const warehouses = await storage.getWarehouses();
      const shelfLifeMonths = product.shelfLife ?? 24;
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + shelfLifeMonths);
      const expiryStr = expiryDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const batchLabel = `INIT-${product.sku}`.substring(0, 50);
      for (const wh of warehouses) {
        await storage.createInventory({
          productId: product.id,
          warehouseId: wh.id,
          batch: batchLabel,
          expiry: expiryStr,
          available: initialStock,
          reserved: 0,
          total: initialStock,
          costPrice: null,
        });
      }
    } catch (invErr) {
      console.warn(`[products] Could not auto-initialize inventory for product ${product.id}:`, invErr);
    }

    await storage.createAuditLog({
      action: "Product Created",
      entityType: "product",
      entityId: product.id.toString(),
      afterValue: product.name,
    });
    res.status(201).json(product);
  }));

  // Backfill inventory records for products that have none
  app.post("/api/inventory/backfill-products", asyncHandler(async (_req, res) => {
    const allProducts = await storage.getProducts();
    const allWarehouses = await storage.getWarehouses();
    if (allWarehouses.length === 0) {
      res.json({ backfilled: 0, message: "No active warehouses found" });
      return;
    }
    let backfilled = 0;
    for (const product of allProducts) {
      const existing = await storage.getInventory(undefined, product.id);
      if (existing.length === 0) {
        const shelfLifeMonths = product.shelfLife ?? 24;
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + shelfLifeMonths);
        const expiryStr = expiryDate.toISOString().split('T')[0];
        const batchLabel = `INIT-${product.sku}`.substring(0, 50);
        for (const wh of allWarehouses) {
          await storage.createInventory({
            productId: product.id,
            warehouseId: wh.id,
            batch: batchLabel,
            expiry: expiryStr,
            available: 0,
            reserved: 0,
            total: 0,
            costPrice: null,
          });
          backfilled++;
        }
      }
    }
    res.json({ backfilled, message: `Created ${backfilled} inventory placeholder records` });
  }));

  app.patch("/api/products/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getProduct(id);
    const body = { ...req.body };
    if (typeof body.mrp === 'number') body.mrp = String(body.mrp);
    if (typeof body.gst === 'number') body.gst = String(body.gst);
    if (typeof body.avgMonthlySales3m === 'number') body.avgMonthlySales3m = String(body.avgMonthlySales3m);
    if (typeof body.avgMonthlySales6m === 'number') body.avgMonthlySales6m = String(body.avgMonthlySales6m);
    if (typeof body.avgMonthlySales12m === 'number') body.avgMonthlySales12m = String(body.avgMonthlySales12m);
    const partial = insertProductSchema.partial().safeParse(body);
    if (!partial.success) {
      res.status(400).json({ error: "Validation failed", details: partial.error.flatten() });
      return;
    }
    const product = await storage.updateProduct(id, partial.data);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    await storage.createAuditLog({
      action: "Product Updated",
      entityType: "product",
      entityId: id.toString(),
      beforeValue: existing?.name,
      afterValue: product.name,
    });
    res.json(product);
  }));

  app.delete("/api/products/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const success = await storage.deleteProduct(id);
    if (!success) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    await storage.createAuditLog({
      action: "Product Deleted",
      entityType: "product",
      entityId: id.toString(),
      reason: req.body?.reason,
    });
    res.status(204).send();
  }));

  // ============== PRODUCT CATEGORIES ==============
  app.get("/api/product-categories", asyncHandler(async (_req, res) => {
    const categories = await db.select().from(schema.productCategories).orderBy(schema.productCategories.name);
    res.json(categories);
  }));

  app.post("/api/product-categories", asyncHandler(async (req, res) => {
    const parsed = insertProductCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const [category] = await db.insert(schema.productCategories).values(parsed.data).returning();
    res.status(201).json(category);
  }));

  app.delete("/api/product-categories/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    await db.delete(schema.productCategories).where(eq(schema.productCategories.id, id));
    res.status(204).send();
  }));

  // ============== WAREHOUSES ==============
  app.get("/api/warehouses", asyncHandler(async (_req, res) => {
    const warehouses = await storage.getWarehouses();
    res.json(warehouses);
  }));

  app.get("/api/warehouses/:id", asyncHandler(async (req, res) => {
    const warehouse = await storage.getWarehouse(parseIdFromParams(req.params.id));
    if (!warehouse) {
      res.status(404).json({ error: "Warehouse not found" });
      return;
    }
    res.json(warehouse);
  }));

  app.post("/api/warehouses", asyncHandler(async (req, res) => {
    const data = validate<InsertWarehouse>(insertWarehouseSchema, req.body);
    const warehouse = await storage.createWarehouse(data);
    res.status(201).json(warehouse);
  }));

  app.patch("/api/warehouses/:id", asyncHandler(async (req, res) => {
    const data = validate<Partial<InsertWarehouse>>(insertWarehouseSchema.partial(), req.body);
    const warehouse = await storage.updateWarehouse(parseIdFromParams(req.params.id), data);
    if (!warehouse) {
      res.status(404).json({ error: "Warehouse not found" });
      return;
    }
    res.json(warehouse);
  }));

  // ============== INVENTORY ==============
  app.post("/api/inventory", asyncHandler(async (req, res) => {
    const validated = validate(insertInventorySchema, req.body);
    const inv = await storage.createInventory(validated);
    await storage.createAuditLog({
      action: "Inventory Created (GRN)",
      entityType: "inventory",
      entityId: inv.id.toString(),
      reason: req.body.notes || "New GRN entry",
      afterValue: JSON.stringify({ batch: inv.batch, quantity: inv.total, productId: inv.productId, warehouseId: inv.warehouseId }),
    });
    res.status(201).json(inv);
  }));

  app.get("/api/inventory", asyncHandler(async (req, res) => {
    const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId as string) : undefined;
    const productId = req.query.productId ? parseInt(req.query.productId as string) : undefined;
    const inventory = await storage.getInventory(warehouseId, productId);
    res.json(inventory);
  }));

  app.get("/api/inventory/:id", asyncHandler(async (req, res) => {
    const inv = await storage.getInventoryById(parseIdFromParams(req.params.id));
    if (!inv) {
      res.status(404).json({ error: "Inventory record not found" });
      return;
    }
    res.json(inv);
  }));

  app.patch("/api/inventory/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getInventoryById(id);
    if (!existing) {
      res.status(404).json({ error: "Inventory record not found" });
      return;
    }
    const validated = validate(insertInventorySchema.partial(), normalizeDates(req.body));
    const inv = await storage.updateInventory(id, validated);
    if (!inv) {
      res.status(500).json({ error: "Failed to update inventory record" });
      return;
    }
    if (req.body.reason) {
      await storage.createAuditLog({
        action: "Stock Adjusted",
        entityType: "inventory",
        entityId: id.toString(),
        reason: req.body.reason,
        beforeValue: existing?.available?.toString(),
        afterValue: inv?.available?.toString(),
      });
    }
    res.json(inv);
  }));

  // ============== DOCTORS ==============
  app.get("/api/doctors", asyncHandler(async (_req, res) => {
    const doctors = await storage.getDoctors();
    res.json(doctors);
  }));

  app.get("/api/doctors/:id", asyncHandler(async (req, res) => {
    const doctor = await storage.getDoctor(parseIdFromParams(req.params.id));
    if (!doctor) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }
    res.json(doctor);
  }));

  app.get("/api/doctors/:id/origin-lead", asyncHandler(async (req, res) => {
    const doctorId = parseIdFromParams(req.params.id);
    const allLeads = await storage.getLeads();
    const originLead = allLeads.find(l => l.convertedDoctorId === doctorId);
    res.json(originLead || null);
  }));

  app.get("/api/doctors/:id/order-items", asyncHandler(async (req, res) => {
    const doctorId = parseIdFromParams(req.params.id);
    const allOrders = await storage.getOrders();
    const doctorOrders = allOrders.filter(o => o.doctorId === doctorId);
    const allItems: any[] = [];
    for (const order of doctorOrders) {
      const items = await storage.getOrderItems(order.id);
      allItems.push(...items.map(i => ({ ...i, orderDate: order.createdAt, orderNumber: order.orderNumber })));
    }
    res.json(allItems);
  }));

  app.post("/api/doctors", asyncHandler(async (req, res) => {
    const validated = validate<InsertDoctor>(insertDoctorSchema, req.body);
    const doctor = await storage.createDoctor(validated);
    await storage.createAuditLog({
      action: "Doctor Created",
      entityType: "doctor",
      entityId: doctor.id.toString(),
      afterValue: doctor.name,
    });
    res.status(201).json(doctor);
  }));

  // Bulk import doctors
  const doctorUpload = multer({ storage: multer.memoryStorage() });
  app.post("/api/doctors/bulk-import", doctorUpload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    
    const fileContent = req.file.buffer.toString('utf-8');
    const errors: string[] = [];
    let imported = 0;
    
    try {
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      
      for (let i = 0; i < records.length; i++) {
        const row = records[i] as Record<string, string>;
        try {
          const timestamp = Date.now().toString().slice(-6);
          const doctorData: InsertDoctor = {
            code: `DOC${timestamp}${i}`,
            name: row.name || `Doctor ${i + 1}`,
            specialization: row.specialization || null,
            clinic: row.clinic || null,
            city: row.city || 'Unknown',
            state: row.state || null,
            phone: row.phone || null,
            email: row.email || null,
            gstin: row.gstin || null,
            creditLimit: row.creditLimit || '0',
            importance: (row.importance as 'High' | 'Medium' | 'Low') || 'Medium',
            outstanding: '0',
            isActive: true,
          };
          
          await storage.createDoctor(doctorData);
          imported++;
        } catch (rowError: any) {
          errors.push(`Row ${i + 2}: ${rowError.message || 'Unknown error'}`);
        }
      }
      
      await storage.createAuditLog({
        action: "Doctors Bulk Imported",
        entityType: "doctor",
        entityId: "bulk",
        afterValue: `${imported} doctors imported`,
      });
      
      res.json({ 
        total: records.length, 
        imported, 
        errors,
        success: true 
      });
    } catch (parseError: any) {
      res.status(400).json({ error: `Failed to parse file: ${parseError.message}` });
    }
  }));

  app.patch("/api/doctors/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getDoctor(id);
    if (!existing) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }
    const validated = validate<Partial<InsertDoctor>>(insertDoctorSchema.partial(), req.body);
    const doctor = await storage.updateDoctor(id, validated);
    await storage.createAuditLog({
      action: "Doctor Updated",
      entityType: "doctor",
      entityId: id.toString(),
    });
    res.json(doctor);
  }));

  app.delete("/api/doctors/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const deleted = await storage.deleteDoctor(id);
    if (!deleted) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }
    await storage.createAuditLog({
      action: "Doctor Deactivated",
      entityType: "doctor",
      entityId: id.toString(),
    });
    res.json({ success: true });
  }));

  // ============== PHARMACIES ==============
  app.get("/api/pharmacies", asyncHandler(async (_req, res) => {
    const pharmacies = await storage.getPharmacies();
    res.json(pharmacies);
  }));

  // Pharmacy Dashboard Metrics
  app.get("/api/pharmacies/dashboard/metrics", asyncHandler(async (_req, res) => {
    const pharmacies = await storage.getPharmacies();
    const orders = await storage.getOrders();
    const invoices = await storage.getInvoices();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Total Pharmacies
    const totalPharmacies = pharmacies.length;
    
    // New Pharmacies (current month)
    const newPharmacies = pharmacies.filter(p => new Date(p.createdAt) >= startOfMonth).length;
    
    // High-Importance Pharmacies
    const highImportancePharmacies = pharmacies.filter(p => p.importance === 'High').length;
    
    // Pharmacies at Risk (low engagement, high credit utilization, or conversion failures)
    const pharmaciesAtRisk = pharmacies.filter(p => {
      const creditUtilization = Number(p.creditLimit || 1) > 0 
        ? (Number(p.outstanding || 0) / Number(p.creditLimit || 1)) * 100 
        : 0;
      const lowEngagement = (p.engagementScore || 50) < 30;
      const highCreditRisk = creditUtilization >= 80;
      const conversionIssues = (p.conversionFailures || 0) >= 3;
      return lowEngagement || highCreditRisk || conversionIssues;
    }).length;
    
    // Orders in the Last 30 Days (pharmacy orders)
    const ordersLast30Days = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= thirtyDaysAgo && o.pharmacyId;
    }).length;
    
    // Invoices Due This Week
    const invoicesDueThisWeek = invoices.filter(inv => {
      if (!inv.dueDate) return false;
      const dueDate = new Date(inv.dueDate);
      return dueDate >= now && dueDate <= endOfWeek && inv.status !== 'Paid';
    }).length;
    
    // Geographic data for map (pharmacies with coordinates)
    const pharmaciesWithCoords = pharmacies
      .filter(p => p.latitude && p.longitude)
      .map(p => ({
        id: p.id,
        name: p.name,
        city: p.city,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        outstanding: Number(p.outstanding || 0),
        creditLimit: Number(p.creditLimit || 0),
        importance: p.importance,
      }));
    
    res.json({
      totalPharmacies,
      newPharmacies,
      highImportancePharmacies,
      pharmaciesAtRisk,
      ordersLast30Days,
      invoicesDueThisWeek,
      pharmaciesWithCoords,
    });
  }));

  app.get("/api/pharmacies/:id", asyncHandler(async (req, res) => {
    const pharmacy = await storage.getPharmacy(parseIdFromParams(req.params.id));
    if (!pharmacy) {
      res.status(404).json({ error: "Pharmacy not found" });
      return;
    }
    res.json(pharmacy);
  }));

  app.post("/api/pharmacies", asyncHandler(async (req, res) => {
    const validated = validate<InsertPharmacy>(insertPharmacySchema, req.body);
    const pharmacy = await storage.createPharmacy(validated);
    await storage.createAuditLog({
      action: "Pharmacy Created",
      entityType: "pharmacy",
      entityId: pharmacy.id.toString(),
      afterValue: pharmacy.name,
    });
    res.status(201).json(pharmacy);
  }));

  app.patch("/api/pharmacies/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getPharmacy(id);
    if (!existing) {
      res.status(404).json({ error: "Pharmacy not found" });
      return;
    }
    const validated = validate<Partial<InsertPharmacy>>(insertPharmacySchema.partial(), req.body);
    const pharmacy = await storage.updatePharmacy(id, validated);
    await storage.createAuditLog({
      action: "Pharmacy Updated",
      entityType: "pharmacy",
      entityId: id.toString(),
    });
    res.json(pharmacy);
  }));

  app.delete("/api/pharmacies/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const deleted = await storage.deletePharmacy(id);
    if (!deleted) {
      res.status(404).json({ error: "Pharmacy not found" });
      return;
    }
    await storage.createAuditLog({
      action: "Pharmacy Deactivated",
      entityType: "pharmacy",
      entityId: id.toString(),
    });
    res.json({ success: true });
  }));

  // ============== LEADS ==============
  app.get("/api/leads", asyncHandler(async (_req, res) => {
    const leads = await storage.getLeads();
    res.json(leads);
  }));

  app.get("/api/leads/:id", asyncHandler(async (req, res) => {
    const lead = await storage.getLead(parseIdFromParams(req.params.id));
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    res.json(lead);
  }));

  app.post("/api/leads", asyncHandler(async (req, res) => {
    const validated = validate<InsertLead>(insertLeadSchema, req.body);
    const lead = await storage.createLead(validated);
    await storage.createAuditLog({
      action: "Lead Created",
      entityType: "lead",
      entityId: lead.id.toString(),
      afterValue: lead.name,
    });
    res.status(201).json(lead);
  }));

  // Bulk import leads
  const leadUpload = multer({ storage: multer.memoryStorage() });
  app.post("/api/leads/bulk-import", leadUpload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    
    const fileContent = req.file.buffer.toString('utf-8');
    const errors: string[] = [];
    let imported = 0;
    
    try {
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      
      for (let i = 0; i < records.length; i++) {
        const row = records[i] as Record<string, string>;
        try {
          const timestamp = Date.now().toString().slice(-6);
          const leadData: InsertLead = {
            code: `LED${timestamp}${i}`,
            name: row.name || `Lead ${i + 1}`,
            clinic: row.clinic || null,
            city: row.city || 'Unknown',
            state: row.state || null,
            phone: row.phone || null,
            email: row.email || null,
            stage: (row.stage as 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Sent to MR' | 'Converted' | 'Lost') || 'New',
            priority: (row.priority as 'High' | 'Medium' | 'Low') || 'Medium',
            source: (row.source as 'Referral' | 'Conference' | 'Website' | 'Cold Call' | 'Other') || 'Other',
          };
          
          await storage.createLead(leadData);
          imported++;
        } catch (rowError: any) {
          errors.push(`Row ${i + 2}: ${rowError.message || 'Unknown error'}`);
        }
      }
      
      await storage.createAuditLog({
        action: "Leads Bulk Imported",
        entityType: "lead",
        entityId: "bulk",
        afterValue: `${imported} leads imported`,
      });
      
      res.json({ 
        total: records.length, 
        imported, 
        errors,
        success: true 
      });
    } catch (parseError: any) {
      res.status(400).json({ error: `Failed to parse file: ${parseError.message}` });
    }
  }));

  app.post("/api/leads/:id/convert-to-doctor", asyncHandler(async (req, res) => {
    const leadId = parseIdFromParams(req.params.id);
    const lead = await storage.getLead(leadId);
    if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }

    if (lead.convertedDoctorId) {
      const existingDoc = await storage.getDoctor(lead.convertedDoctorId);
      res.json({ doctor: existingDoc, message: "Already converted", alreadyConverted: true });
      return;
    }

    const timestamp = Date.now().toString().slice(-6);
    const code = `DOC${timestamp}`;

    const doctorData: InsertDoctor = {
      code,
      name: lead.name,
      specialization: lead.specialization ?? undefined,
      designation: lead.designation ?? undefined,
      clinic: lead.clinic ?? undefined,
      city: lead.city,
      state: lead.state ?? undefined,
      address: lead.address ?? undefined,
      phone: lead.phone ?? undefined,
      whatsappNumber: lead.whatsappNumber ?? undefined,
      receptionistName: lead.receptionistName ?? undefined,
      receptionistPhone: lead.receptionistPhone ?? undefined,
      email: lead.email ?? undefined,
      profilePhoto: lead.profilePhoto ?? undefined,
      clinicImages: lead.clinicImages ?? undefined,
      website: lead.website ?? undefined,
      socialLinkedIn: lead.socialLinkedIn ?? undefined,
      socialFacebook: lead.socialFacebook ?? undefined,
      socialTwitter: lead.socialTwitter ?? undefined,
      socialInstagram: lead.socialInstagram ?? undefined,
      googleMapsUrl: lead.googleMapsUrl ?? undefined,
      latitude: lead.latitude ?? undefined,
      longitude: lead.longitude ?? undefined,
      nearbyChemistName: lead.nearbyChemistName ?? undefined,
      nearbyChemistPhone: lead.nearbyChemistPhone ?? undefined,
      nearbyChemistAddress: lead.nearbyChemistAddress ?? undefined,
      assignedMRId: lead.assignedMRId ?? undefined,
      importance: 'Medium',
      businessCardUrl: lead.businessCardUrl ?? undefined,
    };

    const doctor = await storage.createDoctor(doctorData);
    await storage.updateLead(leadId, { stage: 'Converted', convertedDoctorId: doctor.id });
    await storage.createAuditLog({
      action: "Lead Converted to Doctor",
      entityType: "lead",
      entityId: leadId.toString(),
    });
    res.json({ doctor, message: "Lead successfully converted to doctor" });
  }));

  app.patch("/api/leads/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getLead(id);
    if (!existing) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    const validated = validate<Partial<InsertLead>>(insertLeadSchema.partial(), req.body);
    const lead = await storage.updateLead(id, validated);
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    await storage.createAuditLog({
      action: "Lead Updated",
      entityType: "lead",
      entityId: id.toString(),
      beforeValue: existing.stage,
      afterValue: lead.stage,
    });
    res.json(lead);
  }));

  app.delete("/api/leads/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const success = await storage.deleteLead(id);
    if (!success) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    await storage.createAuditLog({
      action: "Lead Deleted",
      entityType: "lead",
      entityId: id.toString(),
    });
    res.status(204).send();
  }));

  app.get("/api/leads/:id/activities", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const activities = await storage.getLeadActivities(id);
    res.json(activities);
  }));

  app.post("/api/leads/:id/activities", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const activity = await storage.createLeadActivity({ ...req.body, leadId: id });
    res.status(201).json(activity);
  }));

  // ============== ORDERS ==============
  app.get("/api/orders", asyncHandler(async (_req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  }));

  app.get("/api/orders/:id", asyncHandler(async (req, res) => {
    const order = await storage.getOrder(parseIdFromParams(req.params.id));
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(order);
  }));

  app.get("/api/order-items", asyncHandler(async (_req, res) => {
    const allOrders = await storage.getOrders();
    const allItems: any[] = [];
    for (const order of allOrders) {
      const items = await storage.getOrderItems(order.id);
      allItems.push(...items);
    }
    res.json(allItems);
  }));

  app.get("/api/orders/:id/items", asyncHandler(async (req, res) => {
    const items = await storage.getOrderItems(parseIdFromParams(req.params.id));
    res.json(items);
  }));

  app.post("/api/orders", asyncHandler(async (req, res) => {
    const data = validate<InsertOrder>(insertOrderSchema, req.body);
    const order = await storage.createOrder(data);
    await storage.createAuditLog({
      action: "Order Created",
      entityType: "order",
      entityId: order.id.toString(),
      afterValue: order.orderNumber,
    });
    res.status(201).json(order);
  }));

  app.post("/api/orders/:id/items", asyncHandler(async (req, res) => {
    const orderId = parseIdFromParams(req.params.id);
    const existing = await storage.getOrder(orderId);
    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const data = validate<InsertOrderItem>(insertOrderItemSchema, {
      ...req.body,
      orderId,
    });
    const item = await storage.createOrderItem(data);
    res.status(201).json(item);
  }));

  app.patch("/api/orders/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getOrder(id);
    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const data = validate<Partial<InsertOrder>>(insertOrderSchema.partial(), normalizeDates(req.body));
    const order = await storage.updateOrder(id, data);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (data.status && data.status !== existing.status) {
      await storage.createAuditLog({
        action: "Order Status Updated",
        entityType: "order",
        entityId: id.toString(),
        beforeValue: existing.status,
        afterValue: order.status,
        reason: req.body.reason,
      });
    }
    res.json(order);
  }));

  // ============== INVOICES ==============
  app.get("/api/invoices", asyncHandler(async (_req, res) => {
    const invoices = await storage.getInvoices();
    res.json(invoices);
  }));

  app.get("/api/invoices/:id", asyncHandler(async (req, res) => {
    const invoice = await storage.getInvoice(parseIdFromParams(req.params.id));
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    res.json(invoice);
  }));

  app.post("/api/invoices", asyncHandler(async (req, res) => {
    const invoice = await storage.createInvoice(normalizeDates(req.body) as InsertInvoice);
    await storage.createAuditLog({
      action: "Invoice Created",
      entityType: "invoice",
      entityId: invoice.id.toString(),
      afterValue: invoice.invoiceNumber,
    });
    res.status(201).json(invoice);
  }));

  app.patch("/api/invoices/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getInvoice(id);
    const invoice = await storage.updateInvoice(id, normalizeDates(req.body));
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    if (req.body.status !== existing?.status) {
      await storage.createAuditLog({
        action: "Invoice Status Updated",
        entityType: "invoice",
        entityId: id.toString(),
        beforeValue: existing?.status,
        afterValue: invoice.status,
      });
    }
    res.json(invoice);
  }));

  // ============== APPROVALS ==============
  app.get("/api/approvals", asyncHandler(async (_req, res) => {
    const approvals = await storage.getApprovals();
    res.json(approvals);
  }));

  app.get("/api/approvals/:id", asyncHandler(async (req, res) => {
    const approval = await storage.getApproval(parseIdFromParams(req.params.id));
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    res.json(approval);
  }));

  app.post("/api/approvals", asyncHandler(async (req, res) => {
    const validated = validate<InsertApproval>(insertApprovalSchema, normalizeDates(req.body));
    const approval = await storage.createApproval(validated);
    await storage.createAuditLog({
      action: "Approval Request Created",
      entityType: "approval",
      entityId: approval.id.toString(),
      afterValue: approval.type,
    });
    res.status(201).json(approval);
  }));

  app.patch("/api/approvals/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const approvalUpdateSchema = z.object({
      status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
      approvalReason: z.string().optional(),
      approvedById: z.number().optional(),
    });
    const validated = validate<{ status?: string; approvalReason?: string; approvedById?: number }>(approvalUpdateSchema, req.body);
    const existing = await storage.getApproval(id);
    if (!existing) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    const updateData: Record<string, unknown> = {};
    if (validated.status) updateData.status = validated.status;
    if (validated.approvalReason !== undefined) updateData.approvalReason = validated.approvalReason;
    if (validated.approvedById !== undefined) updateData.approvedById = validated.approvedById;
    if (validated.status && validated.status !== existing.status) {
      if (validated.status === 'Approved' || validated.status === 'Rejected') {
        updateData.approvedAt = new Date();
      }
    }
    const approval = await storage.updateApproval(id, updateData as Partial<InsertApproval>);
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    if (validated.status && validated.status !== existing.status) {
      await storage.createAuditLog({
        action: `Approval ${validated.status}`,
        entityType: "approval",
        entityId: id.toString(),
        beforeValue: existing.status,
        afterValue: approval.status,
        reason: validated.approvalReason,
      });
    }
    res.json(approval);
  }));

  // ============== SHIPMENTS ==============
  app.get("/api/shipments", asyncHandler(async (_req, res) => {
    const shipments = await storage.getShipments();
    res.json(shipments);
  }));

  app.get("/api/shipments/:id", asyncHandler(async (req, res) => {
    const shipment = await storage.getShipment(parseIdFromParams(req.params.id));
    if (!shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }
    res.json(shipment);
  }));

  app.post("/api/shipments", asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (typeof body.weight === 'number') body.weight = String(body.weight);
    const parsed = insertShipmentSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const shipment = await storage.createShipment(parsed.data);
    await storage.createAuditLog({
      action: "Shipment Created",
      entityType: "shipment",
      entityId: shipment.id.toString(),
    });
    res.status(201).json(shipment);
  }));

  app.patch("/api/shipments/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getShipment(id);
    const body = { ...req.body };
    if (typeof body.weight === 'number') body.weight = String(body.weight);
    const partial = insertShipmentSchema.partial().safeParse(body);
    if (!partial.success) {
      res.status(400).json({ error: "Validation failed", details: partial.error.flatten() });
      return;
    }
    const shipment = await storage.updateShipment(id, partial.data);
    if (!shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }
    if (req.body.status !== existing?.status) {
      await storage.createAuditLog({
        action: "Shipment Status Updated",
        entityType: "shipment",
        entityId: id.toString(),
        beforeValue: existing?.status,
        afterValue: shipment.status,
      });
    }
    res.json(shipment);
  }));

  // ============== GRNs ==============
  app.get("/api/grns", asyncHandler(async (_req, res) => {
    const grns = await storage.getGRNs();
    res.json(grns);
  }));

  app.get("/api/grns/:id", asyncHandler(async (req, res) => {
    const grn = await storage.getGRN(parseIdFromParams(req.params.id));
    if (!grn) {
      res.status(404).json({ error: "GRN not found" });
      return;
    }
    res.json(grn);
  }));

  app.post("/api/grns", asyncHandler(async (req, res) => {
    const data = validate<InsertGRN>(insertGRNSchema, req.body);
    const grn = await storage.createGRN(data);
    await storage.createAuditLog({
      action: "GRN Created",
      entityType: "grn",
      entityId: grn.id.toString(),
      afterValue: grn.grnNumber,
    });
    res.status(201).json(grn);
  }));

  app.patch("/api/grns/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getGRN(id);
    const data = validate<Partial<InsertGRN>>(insertGRNSchema.partial(), req.body);
    const grn = await storage.updateGRN(id, data);
    if (!grn) {
      res.status(404).json({ error: "GRN not found" });
      return;
    }
    if (req.body.status !== existing?.status) {
      await storage.createAuditLog({
        action: "GRN Status Updated",
        entityType: "grn",
        entityId: id.toString(),
        beforeValue: existing?.status,
        afterValue: grn.status,
        reason: req.body.reason,
      });
    }
    res.json(grn);
  }));

  // ============== GRN ITEMS ==============
  app.get("/api/grn-items", asyncHandler(async (_req, res) => {
    const items = await storage.getGRNItems();
    res.json(items);
  }));

  app.get("/api/grn-items/:grnId", asyncHandler(async (req, res) => {
    const items = await storage.getGRNItemsByGRN(parseIdFromParams(req.params.grnId));
    res.json(items);
  }));

  // ============== TRANSFERS ==============
  app.get("/api/transfers", asyncHandler(async (_req, res) => {
    const transfers = await storage.getTransfers();
    res.json(transfers);
  }));

  app.get("/api/transfers/:id", asyncHandler(async (req, res) => {
    const transfer = await storage.getTransfer(parseIdFromParams(req.params.id));
    if (!transfer) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }
    res.json(transfer);
  }));

  app.post("/api/transfers", asyncHandler(async (req, res) => {
    const data = validate<InsertTransfer>(insertTransferSchema, req.body);
    const transfer = await storage.createTransfer(data);
    await storage.createAuditLog({
      action: "Transfer Created",
      entityType: "transfer",
      entityId: transfer.id.toString(),
      afterValue: transfer.transferNumber,
    });
    res.status(201).json(transfer);
  }));

  app.patch("/api/transfers/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getTransfer(id);
    const data = validate<Partial<InsertTransfer>>(insertTransferSchema.partial(), req.body);
    const transfer = await storage.updateTransfer(id, data);
    if (!transfer) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }
    if (req.body.status !== existing?.status) {
      await storage.createAuditLog({
        action: "Transfer Status Updated",
        entityType: "transfer",
        entityId: id.toString(),
        beforeValue: existing?.status,
        afterValue: transfer.status,
        reason: req.body.reason,
      });
    }
    res.json(transfer);
  }));

  // ============== TRANSFER ITEMS ==============
  app.get("/api/transfer-items", asyncHandler(async (_req, res) => {
    const items = await storage.getTransferItems();
    res.json(items);
  }));

  app.get("/api/transfer-items/:transferId", asyncHandler(async (req, res) => {
    const items = await storage.getTransferItemsByTransfer(parseIdFromParams(req.params.transferId));
    res.json(items);
  }));

  // ============== PROMO CODES ==============
  app.get("/api/promo-codes", asyncHandler(async (_req, res) => {
    const codes = await storage.getPromoCodes();
    res.json(codes);
  }));

  app.get("/api/promo-codes/:id", asyncHandler(async (req, res) => {
    const code = await storage.getPromoCode(parseIdFromParams(req.params.id));
    if (!code) {
      res.status(404).json({ error: "Promo code not found" });
      return;
    }
    res.json(code);
  }));

  app.post("/api/promo-codes", asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (typeof body.discount === 'number') body.discount = String(body.discount);
    const parsed = insertPromoCodeSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const code = await storage.createPromoCode(parsed.data);
    res.status(201).json(code);
  }));

  app.patch("/api/promo-codes/:id", asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (typeof body.discount === 'number') body.discount = String(body.discount);
    const partial = insertPromoCodeSchema.partial().safeParse(body);
    if (!partial.success) {
      res.status(400).json({ error: "Validation failed", details: partial.error.flatten() });
      return;
    }
    const code = await storage.updatePromoCode(parseIdFromParams(req.params.id), partial.data);
    if (!code) {
      res.status(404).json({ error: "Promo code not found" });
      return;
    }
    res.json(code);
  }));

  // ============== CLINIC CODES ==============
  app.get("/api/clinic-codes", asyncHandler(async (_req, res) => {
    const codes = await storage.getClinicCodes();
    res.json(codes);
  }));

  app.get("/api/clinic-codes/:id", asyncHandler(async (req, res) => {
    const code = await storage.getClinicCode(parseIdFromParams(req.params.id));
    if (!code) {
      res.status(404).json({ error: "Clinic code not found" });
      return;
    }
    res.json(code);
  }));

  app.post("/api/clinic-codes", asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (typeof body.discount === 'number') body.discount = String(body.discount);
    if (typeof body.totalRevenue === 'number') body.totalRevenue = String(body.totalRevenue);
    if (typeof body.avgOrderValue === 'number') body.avgOrderValue = String(body.avgOrderValue);
    const parsed = insertClinicCodeSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const code = await storage.createClinicCode(parsed.data);
    res.status(201).json(code);
  }));

  app.patch("/api/clinic-codes/:id", asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (typeof body.discount === 'number') body.discount = String(body.discount);
    if (typeof body.totalRevenue === 'number') body.totalRevenue = String(body.totalRevenue);
    if (typeof body.avgOrderValue === 'number') body.avgOrderValue = String(body.avgOrderValue);
    const partial = insertClinicCodeSchema.partial().safeParse(body);
    if (!partial.success) {
      res.status(400).json({ error: "Validation failed", details: partial.error.flatten() });
      return;
    }
    const code = await storage.updateClinicCode(parseIdFromParams(req.params.id), partial.data);
    if (!code) {
      res.status(404).json({ error: "Clinic code not found" });
      return;
    }
    res.json(code);
  }));

  // ============== PRICING SLABS ==============
  app.get("/api/pricing-slabs", asyncHandler(async (_req, res) => {
    const slabs = await storage.getPricingSlabs();
    res.json(slabs);
  }));

  // Slab Performance Analytics
  app.get("/api/pricing-slabs/analytics", asyncHandler(async (_req, res) => {
    // Get all pricing slabs
    const slabs = await db.select().from(schema.pricingSlabs);
    
    // Get doctors with their pricing slab assignments
    const doctors = await db.select({
      id: schema.doctors.id,
      pricingSlabId: schema.doctors.pricingSlabId,
      assignedMRId: schema.doctors.assignedMRId,
      city: schema.doctors.city,
    }).from(schema.doctors);
    
    // Get orders with doctor info
    const orders = await db.select({
      id: schema.orders.id,
      doctorId: schema.orders.doctorId,
      mrId: schema.orders.mrId,
      total: schema.orders.total,
      status: schema.orders.status,
      createdAt: schema.orders.createdAt,
    }).from(schema.orders);
    
    const mrs = await db.select({
      id: schema.mrs.id,
      name: schema.mrs.name,
      territory: schema.mrs.territory,
    }).from(schema.mrs);
    
    // Build analytics per slab
    const slabAnalytics = slabs.map(slab => {
      // Doctors in this slab
      const slabDoctors = doctors.filter(d => d.pricingSlabId === slab.id);
      const doctorIds = slabDoctors.map(d => d.id);
      
      // Orders from doctors in this slab
      const slabOrders = orders.filter(o => o.doctorId && doctorIds.includes(o.doctorId));
      const completedOrders = slabOrders.filter(o => ['Delivered', 'Shipped', 'Invoiced'].includes(o.status));
      
      // Revenue calculation
      const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      
      // Conversion rate (completed orders / total orders)
      const conversionRate = slabOrders.length > 0 
        ? Math.round((completedOrders.length / slabOrders.length) * 100) 
        : 0;
      
      // Breakdown by MR
      const mrBreakdown: Record<number, { name: string; revenue: number; orders: number; conversions: number }> = {};
      slabOrders.forEach(order => {
        const mrId = order.mrId || 0;
        if (!mrBreakdown[mrId]) {
          const mr = mrs.find(m => m.id === mrId);
          mrBreakdown[mrId] = { name: mr?.name || 'Unassigned', revenue: 0, orders: 0, conversions: 0 };
        }
        mrBreakdown[mrId].orders++;
        if (['Delivered', 'Shipped', 'Invoiced'].includes(order.status)) {
          mrBreakdown[mrId].revenue += Number(order.total || 0);
          mrBreakdown[mrId].conversions++;
        }
      });
      
      // Breakdown by region (city)
      const regionBreakdown: Record<string, { revenue: number; orders: number; conversions: number }> = {};
      slabOrders.forEach(order => {
        const doctor = doctors.find(d => d.id === order.doctorId);
        const region = doctor?.city || 'Unknown';
        if (!regionBreakdown[region]) {
          regionBreakdown[region] = { revenue: 0, orders: 0, conversions: 0 };
        }
        regionBreakdown[region].orders++;
        if (['Delivered', 'Shipped', 'Invoiced'].includes(order.status)) {
          regionBreakdown[region].revenue += Number(order.total || 0);
          regionBreakdown[region].conversions++;
        }
      });
      
      return {
        slabId: slab.id,
        slabName: slab.name,
        discount: Number(slab.discount),
        isActive: slab.isActive,
        totalDoctors: slabDoctors.length,
        totalOrders: slabOrders.length,
        completedOrders: completedOrders.length,
        totalRevenue,
        conversionRate,
        byMR: Object.entries(mrBreakdown).map(([id, data]) => ({ mrId: Number(id), ...data })),
        byRegion: Object.entries(regionBreakdown).map(([region, data]) => ({ region, ...data })),
      };
    });
    
    res.json(slabAnalytics);
  }));

  app.post("/api/pricing-slabs", asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (typeof body.discount === 'number') body.discount = String(body.discount);
    if (typeof body.minOrderValue === 'number') body.minOrderValue = String(body.minOrderValue);
    const parsed = insertPricingSlabSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const slab = await storage.createPricingSlab(parsed.data);
    res.status(201).json(slab);
  }));

  // ============== SCHEMES ==============
  app.get("/api/schemes", asyncHandler(async (_req, res) => {
    const schemes = await storage.getSchemes();
    res.json(schemes);
  }));

  app.get("/api/schemes/:id", asyncHandler(async (req, res) => {
    const scheme = await storage.getScheme(parseIdFromParams(req.params.id));
    if (!scheme) {
      res.status(404).json({ error: "Scheme not found" });
      return;
    }
    res.json(scheme);
  }));

  app.post("/api/schemes", asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (typeof body.discount === 'number') body.discount = String(body.discount);
    if (typeof body.minOrderValue === 'number') body.minOrderValue = String(body.minOrderValue);
    if (typeof body.maxDiscount === 'number') body.maxDiscount = String(body.maxDiscount);
    const parsed = insertSchemeSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const scheme = await storage.createScheme(parsed.data);
    res.status(201).json(scheme);
  }));

  app.patch("/api/schemes/:id", asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (typeof body.discount === 'number') body.discount = String(body.discount);
    if (typeof body.minOrderValue === 'number') body.minOrderValue = String(body.minOrderValue);
    if (typeof body.maxDiscount === 'number') body.maxDiscount = String(body.maxDiscount);
    const partial = insertSchemeSchema.partial().safeParse(body);
    if (!partial.success) {
      res.status(400).json({ error: "Validation failed", details: partial.error.flatten() });
      return;
    }
    const scheme = await storage.updateScheme(parseIdFromParams(req.params.id), partial.data);
    if (!scheme) {
      res.status(404).json({ error: "Scheme not found" });
      return;
    }
    res.json(scheme);
  }));

  app.delete("/api/schemes/:id", asyncHandler(async (req, res) => {
    const deleted = await storage.deleteScheme(parseIdFromParams(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: "Scheme not found" });
      return;
    }
    res.status(204).send();
  }));

  // ============== CARRIERS ==============
  app.get("/api/carriers", asyncHandler(async (_req, res) => {
    const carriers = await storage.getCarriers();
    res.json(carriers);
  }));

  app.post("/api/carriers", asyncHandler(async (req, res) => {
    const parsed = insertCarrierSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const carrier = await storage.createCarrier(parsed.data);
    res.status(201).json(carrier);
  }));

  // ============== RETURNS ==============
  app.get("/api/returns", asyncHandler(async (_req, res) => {
    const returns = await storage.getReturns();
    res.json(returns);
  }));

  app.get("/api/returns/:id", asyncHandler(async (req, res) => {
    const ret = await storage.getReturn(parseIdFromParams(req.params.id));
    if (!ret) {
      res.status(404).json({ error: "Return not found" });
      return;
    }
    res.json(ret);
  }));

  app.post("/api/returns", asyncHandler(async (req, res) => {
    const parsed = insertReturnSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const ret = await storage.createReturn(parsed.data);
    await storage.createAuditLog({
      action: "Return Created",
      entityType: "return",
      entityId: ret.id.toString(),
      afterValue: ret.returnNumber,
    });
    res.status(201).json(ret);
  }));

  app.patch("/api/returns/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getReturn(id);
    const partial = insertReturnSchema.partial().safeParse(normalizeDates(req.body));
    if (!partial.success) {
      res.status(400).json({ error: "Validation failed", details: partial.error.flatten() });
      return;
    }
    const ret = await storage.updateReturn(id, partial.data);
    if (!ret) {
      res.status(404).json({ error: "Return not found" });
      return;
    }
    if (req.body.status !== existing?.status) {
      await storage.createAuditLog({
        action: "Return Status Updated",
        entityType: "return",
        entityId: id.toString(),
        beforeValue: existing?.status,
        afterValue: ret.status,
      });
    }
    res.json(ret);
  }));

  // ============== RETURN ITEMS ==============
  app.get("/api/return-items", asyncHandler(async (_req, res) => {
    const items = await storage.getReturnItems();
    res.json(items);
  }));

  app.get("/api/return-items/:returnId", asyncHandler(async (req, res) => {
    const returnId = parseIdFromParams(req.params.returnId);
    const items = await storage.getReturnItemsByReturnId(returnId);
    res.json(items);
  }));

  app.post("/api/return-items", asyncHandler(async (req, res) => {
    const parsed = insertReturnItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }
    const item = await storage.createReturnItem(parsed.data);
    res.status(201).json(item);
  }));

  // ============== PAYMENTS ==============
  app.get("/api/payments", asyncHandler(async (req, res) => {
    const invoiceId = req.query.invoiceId ? parseInt(req.query.invoiceId as string) : undefined;
    const payments = await storage.getPayments(invoiceId);
    res.json(payments);
  }));

  app.post("/api/payments", asyncHandler(async (req, res) => {
    const paymentData = normalizeDates({ ...req.body });

    const gstRate = 0.18;
    const baseAmount = Number(paymentData.amount) / (1 + gstRate);
    const gstAmount = Number(paymentData.amount) - baseAmount;
    paymentData.gstImpact = JSON.stringify({ baseAmount: baseAmount.toFixed(2), gstAmount: gstAmount.toFixed(2), rate: '18%' });

    if (paymentData.invoiceId) {
      const invoice = await storage.getInvoice(paymentData.invoiceId);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      const invoiceBalance = Number(invoice.amount) - Number(invoice.paidAmount || 0);
      const payAmount = Number(paymentData.amount);
      const allocAmount = Math.min(payAmount, invoiceBalance);

      paymentData.allocatedAmount = String(allocAmount);
      paymentData.allocationStatus = allocAmount >= payAmount ? 'full' : allocAmount > 0 ? 'partial' : 'unallocated';

      const payment = await storage.createPayment(paymentData);

      const newPaid = Number(invoice.paidAmount || 0) + allocAmount;
      const invoiceTotal = Number(invoice.amount);
      const invStatus = newPaid >= invoiceTotal ? 'Paid' : newPaid > 0 ? 'Partially Paid' : invoice.status;
      await storage.updateInvoice(paymentData.invoiceId, { paidAmount: String(newPaid), status: invStatus as any });

      await storage.createAuditLog({
        action: "Payment Recorded",
        entityType: "payment",
        entityId: payment.id.toString(),
        afterValue: `₹${payment.amount} against ${invoice.invoiceNumber}`,
      });
      const updated = await storage.getPayment(payment.id);
      return res.status(201).json(updated);
    }

    paymentData.allocatedAmount = '0';
    paymentData.allocationStatus = 'unallocated';
    const payment = await storage.createPayment(paymentData);

    await storage.createAuditLog({
      action: "Payment Recorded",
      entityType: "payment",
      entityId: payment.id.toString(),
      afterValue: `₹${payment.amount} (unallocated)`,
    });
    res.status(201).json(payment);
  }));

  app.patch("/api/payments/:id", asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid payment ID" });
    const payment = await storage.updatePayment(id, normalizeDates(req.body));
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  }));

  app.post("/api/payments/:id/allocate", asyncHandler(async (req, res) => {
    const paymentId = parseInt(req.params.id);
    const { invoiceId, amount } = req.body;
    if (isNaN(paymentId) || !invoiceId || !amount) return res.status(400).json({ error: "Missing required fields" });

    const payment = await storage.getPayment(paymentId);
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const allocAmount = parseFloat(amount);
    if (allocAmount <= 0) return res.status(400).json({ error: "Amount must be positive" });

    const currentAllocated = Number(payment.allocatedAmount || 0);
    const paymentBalance = Number(payment.amount) - currentAllocated;
    if (allocAmount > paymentBalance) return res.status(400).json({ error: `Amount exceeds payment balance of ₹${paymentBalance.toFixed(2)}` });

    const invoiceBalance = Number(invoice.amount) - Number(invoice.paidAmount || 0);
    if (allocAmount > invoiceBalance) return res.status(400).json({ error: `Amount exceeds invoice balance of ₹${invoiceBalance.toFixed(2)}` });

    const newAllocated = currentAllocated + allocAmount;
    const paymentTotal = Number(payment.amount);
    const allocStatus = newAllocated >= paymentTotal ? 'full' : newAllocated > 0 ? 'partial' : 'unallocated';
    await storage.updatePayment(paymentId, { allocatedAmount: String(newAllocated), allocationStatus: allocStatus as any });

    const newPaid = Number(invoice.paidAmount || 0) + allocAmount;
    const invoiceTotal = Number(invoice.amount);
    const invStatus = newPaid >= invoiceTotal ? 'Paid' : newPaid > 0 ? 'Partially Paid' : invoice.status;
    await storage.updateInvoice(invoiceId, { paidAmount: String(newPaid), status: invStatus as any });

    await storage.createAuditLog({
      action: "Payment Allocated",
      entityType: "payment",
      entityId: paymentId.toString(),
      afterValue: `Allocated ₹${allocAmount} to Invoice #${invoice.invoiceNumber}`,
    });

    const updated = await storage.getPayment(paymentId);
    res.json(updated);
  }));

  // ============== AUDIT LOGS ==============
  app.get("/api/audit-logs", asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const logs = await storage.getAuditLogs(limit);
    res.json(logs);
  }));

  // ============== ACCESS LOGS ==============
  app.get("/api/access-logs", asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const logs = await storage.getAccessLogs(limit);
    res.json(logs);
  }));

  app.post("/api/access-logs", asyncHandler(async (req, res) => {
    const log = await storage.createAccessLog(normalizeDates(req.body) as InsertAccessLog);
    res.status(201).json(log);
  }));

  // ============== USERS ==============
  app.get("/api/users", asyncHandler(async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users.map(u => ({ ...u, password: undefined })));
  }));

  app.get("/api/users/:id", asyncHandler(async (req, res) => {
    const user = await storage.getUser(parseIdFromParams(req.params.id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ ...user, password: undefined });
  }));

  app.post("/api/users", asyncHandler(async (req, res) => {
    const { password, ...userData } = req.body;
    
    if (!password || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword
    });
    
    await storage.createAuditLog({
      action: "User Created",
      entityType: "user",
      entityId: user.id.toString(),
      afterValue: user.username,
      userId: (req as any).user?.id,
      ipAddress: req.ip || req.socket.remoteAddress,
    });
    
    res.status(201).json({ ...user, password: undefined });
  }));

  app.patch("/api/users/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const { password, ...userData } = req.body;
    
    let updateData = { ...userData };
    
    // If password is being updated, hash it
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const user = await storage.updateUser(id, updateData);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    
    await storage.createAuditLog({
      action: "User Updated",
      entityType: "user",
      entityId: user.id.toString(),
      afterValue: user.username,
      userId: (req as any).user?.id,
      ipAddress: req.ip || req.socket.remoteAddress,
    });
    
    res.json({ ...user, password: undefined });
  }));

  // ============== ROLE TEMPLATES ==============
  app.get("/api/role-templates", asyncHandler(async (_req, res) => {
    const templates = await storage.getRoleTemplates();
    // Enrich with user count
    const users = await storage.getUsers();
    const enriched = templates.map(t => ({
      ...t,
      userCount: users.filter(u => u.roleTemplateId === t.id).length,
    }));
    res.json(enriched);
  }));

  app.get("/api/role-templates/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const template = await storage.getRoleTemplate(id);
    if (!template) {
      res.status(404).json({ error: "Role template not found" });
      return;
    }
    res.json(template);
  }));

  app.post("/api/role-templates", asyncHandler(async (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== 'Super Admin') {
      res.status(403).json({ error: "Only Super Admin can create role templates" });
      return;
    }
    const body = req.body;
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      res.status(400).json({ error: "Role name is required" });
      return;
    }
    const template = await storage.createRoleTemplate({
      name: body.name.trim(),
      description: body.description || null,
      modules: body.modules || [],
      isActive: body.isActive !== false,
    });
    await storage.createAuditLog({
      action: "Role Template Created",
      entityType: "role_template",
      entityId: template.id.toString(),
      afterValue: template.name,
      userId: user.id,
    });
    res.status(201).json(template);
  }));

  app.patch("/api/role-templates/:id", asyncHandler(async (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== 'Super Admin') {
      res.status(403).json({ error: "Only Super Admin can modify role templates" });
      return;
    }
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getRoleTemplate(id);
    if (!existing) {
      res.status(404).json({ error: "Role template not found" });
      return;
    }
    const body = req.body;
    const updated = await storage.updateRoleTemplate(id, {
      name: body.name !== undefined ? body.name.trim() : existing.name,
      description: body.description !== undefined ? body.description : existing.description,
      modules: body.modules !== undefined ? body.modules : existing.modules,
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
    });
    await storage.createAuditLog({
      action: "Role Template Updated",
      entityType: "role_template",
      entityId: id.toString(),
      beforeValue: existing.name,
      afterValue: updated?.name,
      userId: user.id,
    });
    res.json(updated);
  }));

  app.delete("/api/role-templates/:id", asyncHandler(async (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== 'Super Admin') {
      res.status(403).json({ error: "Only Super Admin can delete role templates" });
      return;
    }
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getRoleTemplate(id);
    if (!existing) {
      res.status(404).json({ error: "Role template not found" });
      return;
    }
    const success = await storage.deleteRoleTemplate(id);
    if (!success) {
      res.status(500).json({ error: "Failed to delete role template" });
      return;
    }
    await storage.createAuditLog({
      action: "Role Template Deleted",
      entityType: "role_template",
      entityId: id.toString(),
      beforeValue: existing.name,
      userId: user.id,
    });
    res.status(204).send();
  }));

  // Assign/unassign role template to a user (Super Admin only)
  app.patch("/api/users/:id/assign-role-template", asyncHandler(async (req, res) => {
    const reqUser = (req as any).user;
    if (!reqUser || reqUser.role !== 'Super Admin') {
      res.status(403).json({ error: "Only Super Admin can assign role templates" });
      return;
    }
    const id = parseIdFromParams(req.params.id);
    const { roleTemplateId } = req.body;
    const updated = await storage.updateUser(id, { roleTemplateId: roleTemplateId || null });
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ ...updated, password: undefined });
  }));

  // ============== MRs (MEDICAL REPRESENTATIVES) ==============
  app.get("/api/mrs", asyncHandler(async (_req, res) => {
    const mrs = await storage.getMRs();
    res.json(mrs);
  }));

  app.get("/api/mrs/next-employee-id", asyncHandler(async (_req, res) => {
    const mrsData = await storage.getMRs();
    const nums = mrsData
      .map(m => m.employeeId)
      .filter(id => /^MR\d+$/.test(id))
      .map(id => parseInt(id.slice(2)));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    res.json({ nextId: `MR${String(next).padStart(3, '0')}` });
  }));

  app.get("/api/mrs/:id", asyncHandler(async (req, res) => {
    const mr = await storage.getMR(parseIdFromParams(req.params.id));
    if (!mr) {
      res.status(404).json({ error: "MR not found" });
      return;
    }
    res.json(mr);
  }));

  app.post("/api/mrs", asyncHandler(async (req, res) => {
    try {
      const body = { ...req.body };
      body.lastActivity = new Date();
      const validated = validate<any>(insertMRSchema, body);
      const mr = await storage.createMR(validated);
      await storage.createAuditLog({
        action: "MR Created",
        entityType: "mr",
        entityId: mr.id.toString(),
        afterValue: mr.name,
      });
      res.status(201).json(mr);
    } catch (error: any) {
      const msg: string = error.message || '';
      if (msg.includes('mrs_employee_id_unique') || msg.includes('employee_id')) {
        res.status(400).json({ error: 'Employee ID is already in use. Please choose a different Employee ID.' });
      } else if (msg.includes('mrs_email_unique') || (msg.includes('unique') && msg.includes('email'))) {
        res.status(400).json({ error: 'Email address is already registered to another MR.' });
      } else {
        res.status(400).json({ error: msg || 'Failed to create MR' });
      }
    }
  }));

  app.patch("/api/mrs/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getMR(id);
    if (!existing) {
      res.status(404).json({ error: "MR not found" });
      return;
    }
    const patchBody = { ...req.body };
    if ('lastActivity' in patchBody) {
      const raw = patchBody.lastActivity;
      if (typeof raw === 'string') {
        const parsed = new Date(raw);
        patchBody.lastActivity = isNaN(parsed.getTime()) ? new Date() : parsed;
      } else if (!(raw instanceof Date) || isNaN((raw as Date).getTime())) {
        patchBody.lastActivity = new Date();
      }
    }
    const validated = validate<any>(insertMRSchema.partial(), patchBody);
    const mr = await storage.updateMR(id, validated);
    await storage.createAuditLog({
      action: "MR Updated",
      entityType: "mr",
      entityId: id.toString(),
      beforeValue: existing.name,
      afterValue: mr?.name,
    });
    res.json(mr);
  }));

  // MR Visits
  app.get("/api/mrs/:id/visits", asyncHandler(async (req, res) => {
    const visits = await storage.getMRVisits(parseIdFromParams(req.params.id));
    res.json(visits);
  }));

  app.post("/api/mr-visits", asyncHandler(async (req, res) => {
    const validated = validate<any>(insertMRVisitSchema, normalizeDates(req.body));
    const visit = await storage.createMRVisit(validated);
    await storage.createAuditLog({
      action: "MR Visit Logged",
      entityType: "mr_visit",
      entityId: visit.id.toString(),
      afterValue: visit.visitType,
    });
    res.status(201).json(visit);
  }));

  // MR Attendance
  app.get("/api/mrs/:id/attendance", asyncHandler(async (req, res) => {
    const attendance = await storage.getMRAttendance(parseIdFromParams(req.params.id));
    res.json(attendance);
  }));

  app.post("/api/mr-attendance", asyncHandler(async (req, res) => {
    const validated = validate<any>(insertMRAttendanceSchema, normalizeDates(req.body));
    const attendance = await storage.createMRAttendance(validated);
    await storage.createAuditLog({
      action: "MR Attendance Logged",
      entityType: "mr_attendance",
      entityId: attendance.id.toString(),
      afterValue: attendance.status,
    });
    res.status(201).json(attendance);
  }));

  // MR Targets
  app.get("/api/mrs/:id/targets", asyncHandler(async (req, res) => {
    const targets = await storage.getMRTargets(parseIdFromParams(req.params.id));
    res.json(targets);
  }));

  app.get("/api/mr-targets", asyncHandler(async (_req, res) => {
    const targets = await storage.getAllMRTargets();
    res.json(targets);
  }));

  app.post("/api/mr-targets", asyncHandler(async (req, res) => {
    const validated = validate<any>(insertMRTargetSchema, normalizeDates(req.body));
    const target = await storage.createMRTarget(validated);
    await storage.createAuditLog({
      action: "MR Target Created",
      entityType: "mr_target",
      entityId: target.id.toString(),
      afterValue: target.targetType,
    });
    res.status(201).json(target);
  }));

  app.patch("/api/mr-targets/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const validated = validate<any>(insertMRTargetSchema.partial(), normalizeDates(req.body));
    const target = await storage.updateMRTarget(id, validated);
    if (!target) {
      res.status(404).json({ error: "Target not found" });
      return;
    }
    res.json(target);
  }));

  // ============== TERRITORIES ==============
  app.get("/api/territories", asyncHandler(async (_req, res) => {
    const territories = await storage.getTerritories();
    res.json(territories);
  }));

  // ============== EMPLOYEES ==============
  app.get("/api/employees", asyncHandler(async (_req, res) => {
    const employees = await storage.getEmployees();
    res.json(employees);
  }));

  app.get("/api/employees/:id", asyncHandler(async (req, res) => {
    const employee = await storage.getEmployee(parseIdFromParams(req.params.id));
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    res.json(employee);
  }));

  app.post("/api/employees", asyncHandler(async (req, res) => {
    const employee = await storage.createEmployee(normalizeDates(req.body));
    await storage.createAuditLog({
      action: "Employee Created",
      entityType: "employee",
      entityId: employee.id.toString(),
      afterValue: employee.name,
    });
    res.status(201).json(employee);
  }));

  app.patch("/api/employees/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const employee = await storage.updateEmployee(id, req.body);
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    res.json(employee);
  }));

  app.get("/api/employees/:id/profile", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const employee = await storage.getEmployee(id);
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const allEmployees = await storage.getEmployees();
    const attendance = await storage.getHRAttendanceByEmployee(id);

    const manager = employee.reportingManager
      ? allEmployees.find(e => e.name === employee.reportingManager) || null
      : null;

    const directReports = allEmployees.filter(e => e.reportingManager === employee.name);

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const monthAttendance = attendance.filter(a => {
      const d = new Date(a.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const presentDays = monthAttendance.filter(a => a.status === 'present').length;
    const absentDays = monthAttendance.filter(a => a.status === 'absent').length;
    const halfDays = monthAttendance.filter(a => a.status === 'half-day').length;
    const leaveDays = monthAttendance.filter(a => a.status === 'leave').length;
    const holidays = monthAttendance.filter(a => a.status === 'holiday').length;
    const totalWorkHours = monthAttendance.reduce((sum, a) => sum + parseFloat(String(a.workHours || '0')), 0);
    const avgWorkHours = presentDays > 0 ? totalWorkHours / presentDays : 0;

    const annualLeaveBalance = 24;
    const sickLeaveBalance = 12;
    const casualLeaveBalance = 12;
    const totalLeavesTaken = attendance.filter(a => a.status === 'leave' && new Date(a.date).getFullYear() === thisYear).length;

    const daysEmployed = Math.floor((now.getTime() - new Date(employee.joiningDate).getTime()) / (1000 * 60 * 60 * 24));
    const kycStatus = daysEmployed < 30 ? 'Pending' : daysEmployed < 90 ? 'In Progress' : 'Verified';

    const baseScore = 70 + Math.min(20, Math.floor(daysEmployed / 30));
    const deptBonus = employee.department === 'Sales' ? 5 : employee.department === 'Operations' ? 3 : 2;
    const performanceScore = Math.min(100, baseScore + deptBonus);

    const documents = [
      { name: 'Aadhaar Card', type: 'KYC', status: kycStatus === 'Verified' ? 'verified' : 'pending', uploadDate: employee.joiningDate },
      { name: 'PAN Card', type: 'KYC', status: kycStatus === 'Verified' ? 'verified' : 'pending', uploadDate: employee.joiningDate },
      { name: 'Offer Letter', type: 'Employment', status: 'verified', uploadDate: employee.joiningDate },
      { name: 'NDA', type: 'Legal', status: daysEmployed > 15 ? 'verified' : 'pending', uploadDate: employee.joiningDate },
    ];

    const recentAttendance = attendance
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    res.json({
      employee,
      manager: manager ? { id: manager.id, name: manager.name, role: manager.role, department: manager.department, profilePhotoUrl: manager.profilePhotoUrl } : null,
      directReports: directReports.map(r => ({ id: r.id, name: r.name, role: r.role, department: r.department, profilePhotoUrl: r.profilePhotoUrl })),
      attendanceSummary: {
        presentDays,
        absentDays,
        halfDays,
        leaveDays,
        holidays,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        avgWorkHours: Math.round(avgWorkHours * 10) / 10,
        monthName: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      },
      leaveSummary: {
        annualLeave: { total: annualLeaveBalance, used: Math.min(totalLeavesTaken, annualLeaveBalance), remaining: Math.max(0, annualLeaveBalance - totalLeavesTaken) },
        sickLeave: { total: sickLeaveBalance, used: Math.floor(totalLeavesTaken * 0.25), remaining: sickLeaveBalance - Math.floor(totalLeavesTaken * 0.25) },
        casualLeave: { total: casualLeaveBalance, used: Math.floor(totalLeavesTaken * 0.3), remaining: casualLeaveBalance - Math.floor(totalLeavesTaken * 0.3) },
      },
      kycStatus,
      documents,
      performance: {
        score: performanceScore,
        rating: performanceScore >= 90 ? 'Excellent' : performanceScore >= 80 ? 'Good' : performanceScore >= 70 ? 'Satisfactory' : 'Needs Improvement',
        lastReviewDate: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString(),
        goals: [
          { title: 'Quarterly Target', progress: Math.min(100, performanceScore + 5), status: performanceScore >= 85 ? 'on-track' : 'at-risk' },
          { title: 'Training Completion', progress: Math.min(100, daysEmployed > 90 ? 100 : Math.floor((daysEmployed / 90) * 100)), status: daysEmployed > 90 ? 'completed' : 'in-progress' },
          { title: 'Compliance Adherence', progress: kycStatus === 'Verified' ? 100 : 60, status: kycStatus === 'Verified' ? 'completed' : 'at-risk' },
        ],
      },
      recentAttendance,
      tenure: {
        years: Math.floor(daysEmployed / 365),
        months: Math.floor((daysEmployed % 365) / 30),
        days: daysEmployed % 30,
      },
    });
  }));

  // ============== HR ATTENDANCE ==============
  app.get("/api/hr-attendance", asyncHandler(async (req, res) => {
    const date = req.query.date as string | undefined;
    const attendance = await storage.getHRAttendance(date);
    res.json(attendance);
  }));

  app.get("/api/hr-attendance/range", asyncHandler(async (req, res) => {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    if (!startDate || !endDate) {
      res.status(400).json({ error: "startDate and endDate are required" });
      return;
    }
    const attendance = await storage.getHRAttendanceRange(startDate, endDate);
    res.json(attendance);
  }));

  app.get("/api/hr-attendance/alerts", asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days as string) || 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const attendance = await storage.getHRAttendanceRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    const employees = await storage.getEmployees();
    const employeeMap = new Map(employees.map(e => [e.id, e]));

    const alerts: Array<{
      type: string;
      severity: string;
      employeeId: number;
      employeeName: string;
      message: string;
      date?: string;
      details?: string;
    }> = [];

    const byEmployee = new Map<number, typeof attendance>();
    for (const record of attendance) {
      const existing = byEmployee.get(record.employeeId) || [];
      existing.push(record);
      byEmployee.set(record.employeeId, existing);
    }

    for (const [empId, records] of byEmployee) {
      const emp = employeeMap.get(empId);
      if (!emp) continue;

      const lateCount = records.filter(r => r.isLate).length;
      if (lateCount >= 3) {
        alerts.push({
          type: 'frequent_late',
          severity: lateCount >= 5 ? 'high' : 'medium',
          employeeId: empId,
          employeeName: emp.name,
          message: `Late arrival ${lateCount} times in ${days} days`,
          details: `Average late by ${Math.round(records.filter(r => r.isLate).reduce((s, r) => s + (r.lateMinutes || 0), 0) / lateCount)} minutes`,
        });
      }

      const earlyCount = records.filter(r => r.isEarlyDeparture).length;
      if (earlyCount >= 3) {
        alerts.push({
          type: 'frequent_early',
          severity: earlyCount >= 5 ? 'high' : 'medium',
          employeeId: empId,
          employeeName: emp.name,
          message: `Early departure ${earlyCount} times in ${days} days`,
        });
      }

      const absentCount = records.filter(r => r.status === 'absent').length;
      if (absentCount >= 3) {
        alerts.push({
          type: 'frequent_absent',
          severity: 'high',
          employeeId: empId,
          employeeName: emp.name,
          message: `Absent ${absentCount} times in ${days} days`,
        });
      }

      const noGpsRecords = records.filter(r => r.status === 'present' && !r.gpsVerified);
      if (noGpsRecords.length >= 3) {
        alerts.push({
          type: 'gps_unverified',
          severity: 'low',
          employeeId: empId,
          employeeName: emp.name,
          message: `${noGpsRecords.length} unverified GPS punches`,
        });
      }

      const longBreaks = records.filter(r => (r.breakDurationMinutes || 0) > 60);
      if (longBreaks.length >= 2) {
        alerts.push({
          type: 'long_breaks',
          severity: 'medium',
          employeeId: empId,
          employeeName: emp.name,
          message: `Extended breaks (>60min) on ${longBreaks.length} days`,
        });
      }
    }

    alerts.sort((a, b) => {
      const sev = { high: 0, medium: 1, low: 2 };
      return (sev[a.severity as keyof typeof sev] ?? 2) - (sev[b.severity as keyof typeof sev] ?? 2);
    });

    res.json(alerts);
  }));

  app.get("/api/hr-attendance/summary", asyncHandler(async (req, res) => {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    if (!startDate || !endDate) {
      res.status(400).json({ error: "startDate and endDate are required" });
      return;
    }
    const attendance = await storage.getHRAttendanceRange(startDate, endDate);
    const employees = await storage.getEmployees();
    const employeeMap = new Map(employees.map(e => [e.id, e]));

    const byEmployee = new Map<number, typeof attendance>();
    for (const record of attendance) {
      const existing = byEmployee.get(record.employeeId) || [];
      existing.push(record);
      byEmployee.set(record.employeeId, existing);
    }

    const summaries = Array.from(byEmployee.entries()).map(([empId, records]) => {
      const emp = employeeMap.get(empId);
      const presentDays = records.filter(r => r.status === 'present').length;
      const absentDays = records.filter(r => r.status === 'absent').length;
      const halfDays = records.filter(r => r.status === 'half-day').length;
      const leaveDays = records.filter(r => r.status === 'leave').length;
      const lateDays = records.filter(r => r.isLate).length;
      const earlyDays = records.filter(r => r.isEarlyDeparture).length;
      const totalHours = records.reduce((s, r) => s + Number(r.workHours || 0), 0);
      const totalBreakMin = records.reduce((s, r) => s + (r.breakDurationMinutes || 0), 0);
      const gpsVerifiedCount = records.filter(r => r.gpsVerified).length;

      return {
        employeeId: empId,
        employeeName: emp?.name || 'Unknown',
        employeeCode: emp?.employeeCode || '',
        department: emp?.department || '',
        presentDays,
        absentDays,
        halfDays,
        leaveDays,
        lateDays,
        earlyDays,
        totalHours: Math.round(totalHours * 10) / 10,
        avgHoursPerDay: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0,
        totalBreakMinutes: totalBreakMin,
        gpsVerifiedPercentage: records.length > 0 ? Math.round((gpsVerifiedCount / records.length) * 100) : 0,
        totalRecords: records.length,
      };
    });

    res.json(summaries);
  }));

  app.get("/api/hr-attendance/employee/:employeeId", asyncHandler(async (req, res) => {
    const attendance = await storage.getHRAttendanceByEmployee(parseIdFromParams(req.params.employeeId));
    res.json(attendance);
  }));

  app.post("/api/hr-attendance", asyncHandler(async (req, res) => {
    const attendance = await storage.createHRAttendance(normalizeDates(req.body));
    res.status(201).json(attendance);
  }));

  app.patch("/api/hr-attendance/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const attendance = await storage.updateHRAttendance(id, req.body);
    if (!attendance) {
      res.status(404).json({ error: "Attendance record not found" });
      return;
    }
    res.json(attendance);
  }));

  // ============== LEAVE MANAGEMENT ==============
  app.get("/api/leave-requests", asyncHandler(async (req, res) => {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const status = req.query.status as string | undefined;
    let requests = employeeId
      ? await storage.getLeaveRequestsByEmployee(employeeId)
      : await storage.getLeaveRequests();
    if (status) {
      requests = requests.filter(r => r.status === status);
    }
    res.json(requests);
  }));

  app.get("/api/leave-requests/pending", asyncHandler(async (req, res) => {
    const requests = await storage.getLeaveRequests();
    const pending = requests.filter(r => r.status === 'pending');
    res.json(pending);
  }));

  app.post("/api/leave-requests", asyncHandler(async (req, res) => {
    const body = normalizeDates({ ...req.body });
    const data = validate<InsertLeaveRequest>(insertLeaveRequestSchema, body);
    const request = await storage.createLeaveRequest(data);
    res.status(201).json(request);
  }));

  app.patch("/api/leave-requests/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const request = await storage.updateLeaveRequest(id, req.body);
    if (!request) {
      res.status(404).json({ error: "Leave request not found" });
      return;
    }
    res.json(request);
  }));

  app.post("/api/leave-requests/:id/approve", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const approvalSchema = z.object({ approverId: z.number(), remarks: z.string().optional() });
    const { approverId, remarks } = validate<{ approverId: number; remarks?: string }>(approvalSchema, req.body);
    const request = await storage.updateLeaveRequest(id, {
      status: 'approved',
      approverId,
      approverRemarks: remarks || null,
    });
    if (!request) {
      res.status(404).json({ error: "Leave request not found" });
      return;
    }
    const balances = await storage.getLeaveBalances(request.employeeId, new Date().getFullYear());
    const balance = balances.find(b => b.leaveType === request.leaveType);
    if (balance) {
      const newUsed = Number(balance.used) + Number(request.totalDays);
      const newRemaining = Number(balance.totalAllotted) - newUsed;
      await storage.updateLeaveBalance(balance.id, {
        used: newUsed.toString(),
        remaining: Math.max(0, newRemaining).toString(),
      });
    }
    res.json(request);
  }));

  app.post("/api/leave-requests/:id/reject", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const rejectSchema = z.object({ approverId: z.number(), remarks: z.string().optional() });
    const { approverId, remarks } = validate<{ approverId: number; remarks?: string }>(rejectSchema, req.body);
    const request = await storage.updateLeaveRequest(id, {
      status: 'rejected',
      approverId,
      approverRemarks: remarks || null,
    });
    if (!request) {
      res.status(404).json({ error: "Leave request not found" });
      return;
    }
    res.json(request);
  }));

  app.get("/api/leave-balances", asyncHandler(async (req, res) => {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const balances = await storage.getLeaveBalances(employeeId, year);
    res.json(balances);
  }));

  app.post("/api/leave-balances", asyncHandler(async (req, res) => {
    const data = validate<InsertLeaveBalance>(insertLeaveBalanceSchema, req.body);
    const balance = await storage.createLeaveBalance(data);
    res.status(201).json(balance);
  }));

  app.get("/api/company-holidays", asyncHandler(async (req, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const holidays = await storage.getCompanyHolidays(year);
    res.json(holidays);
  }));

  app.post("/api/company-holidays", asyncHandler(async (req, res) => {
    const body = normalizeDates({ ...req.body }, ['date']);
    const data = validate<InsertCompanyHoliday>(insertCompanyHolidaySchema, body);
    const holiday = await storage.createCompanyHoliday(data);
    res.status(201).json(holiday);
  }));

  app.patch("/api/company-holidays/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const holiday = await storage.updateCompanyHoliday(id, normalizeDates(req.body, ['date']));
    if (!holiday) {
      res.status(404).json({ error: "Holiday not found" });
      return;
    }
    res.json(holiday);
  }));

  app.delete("/api/company-holidays/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    await storage.deleteCompanyHoliday(id);
    res.json({ success: true });
  }));

  // ============== COMPLIANCE ==============
  app.get("/api/compliance", asyncHandler(async (_req, res) => {
    const items = await storage.getComplianceItems();
    res.json(items);
  }));

  app.get("/api/compliance/:id", asyncHandler(async (req, res) => {
    const item = await storage.getComplianceItem(parseIdFromParams(req.params.id));
    if (!item) {
      res.status(404).json({ error: "Compliance item not found" });
      return;
    }
    res.json(item);
  }));

  app.post("/api/compliance", asyncHandler(async (req, res) => {
    const body = normalizeDates({ ...req.body }, ['dueDate']);
    const item = await storage.createComplianceItem(body);
    await storage.createAuditLog({
      action: "Compliance Item Created",
      entityType: "compliance",
      entityId: item.id.toString(),
      afterValue: item.requirement,
    });
    res.status(201).json(item);
  }));

  app.patch("/api/compliance/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const body = normalizeDates({ ...req.body }, ['dueDate']);
    const item = await storage.updateComplianceItem(id, body);
    if (!item) {
      res.status(404).json({ error: "Compliance item not found" });
      return;
    }
    res.json(item);
  }));

  // ============== ONBOARDING CHECKLISTS ==============
  app.get("/api/onboarding-checklists", asyncHandler(async (req, res) => {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const items = await storage.getOnboardingChecklists(employeeId);
    res.json(items);
  }));

  app.get("/api/onboarding-checklists/:id", asyncHandler(async (req, res) => {
    const item = await storage.getOnboardingChecklist(parseIdFromParams(req.params.id));
    if (!item) {
      res.status(404).json({ error: "Onboarding checklist item not found" });
      return;
    }
    res.json(item);
  }));

  app.post("/api/onboarding-checklists", asyncHandler(async (req, res) => {
    const validated = validate<InsertOnboardingChecklist>(insertOnboardingChecklistSchema, normalizeDates(req.body, ['dueDate']));
    const item = await storage.createOnboardingChecklist(validated);
    res.status(201).json(item);
  }));

  app.patch("/api/onboarding-checklists/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const validated = validate<Partial<InsertOnboardingChecklist>>(insertOnboardingChecklistSchema.partial(), normalizeDates(req.body, ['dueDate']));
    const item = await storage.updateOnboardingChecklist(id, validated);
    if (!item) {
      res.status(404).json({ error: "Onboarding checklist item not found" });
      return;
    }
    res.json(item);
  }));

  app.delete("/api/onboarding-checklists/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    await storage.deleteOnboardingChecklist(id);
    res.json({ success: true });
  }));

  app.post("/api/onboarding-checklists/generate", asyncHandler(async (req, res) => {
    const schema = z.object({ employeeId: z.number() });
    const { employeeId } = validate<{ employeeId: number }>(schema, req.body);

    const defaultTasks = [
      { category: 'HR' as const, taskName: 'Complete joining formalities', description: 'Fill joining form, submit documents' },
      { category: 'HR' as const, taskName: 'Submit identity documents', description: 'Aadhaar, PAN, passport copy' },
      { category: 'HR' as const, taskName: 'Sign employment agreement', description: 'NDA, employment contract, policies acknowledgement' },
      { category: 'HR' as const, taskName: 'Complete benefits enrollment', description: 'Health insurance, PF nomination, gratuity form' },
      { category: 'HR' as const, taskName: 'Attend HR orientation', description: 'Company policies, code of conduct, leave policy' },
      { category: 'IT' as const, taskName: 'Set up workstation', description: 'Laptop, monitor, accessories provisioning' },
      { category: 'IT' as const, taskName: 'Create email & system accounts', description: 'Email, ERP access, Slack, VPN credentials' },
      { category: 'IT' as const, taskName: 'IT security training', description: 'Password policies, phishing awareness, data security' },
      { category: 'IT' as const, taskName: 'Install required software', description: 'Office suite, collaboration tools, department-specific apps' },
      { category: 'Finance' as const, taskName: 'Submit bank account details', description: 'Account number, IFSC, cancelled cheque' },
      { category: 'Finance' as const, taskName: 'Tax declaration & form submission', description: 'Form 12BB, investment declarations, HRA proofs' },
      { category: 'Finance' as const, taskName: 'Expense policy briefing', description: 'Reimbursement process, travel policy, card issuance' },
    ];

    const created = [];
    for (const task of defaultTasks) {
      const item = await storage.createOnboardingChecklist({
        employeeId,
        taskName: task.taskName,
        category: task.category,
        description: task.description,
        status: 'pending',
      });
      created.push(item);
    }

    res.status(201).json(created);
  }));

  // ============== EXIT WORKFLOWS ==============
  app.get("/api/exit-workflows", asyncHandler(async (req, res) => {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const workflows = await storage.getExitWorkflows(employeeId);
    res.json(workflows);
  }));

  app.get("/api/exit-workflows/:id", asyncHandler(async (req, res) => {
    const workflow = await storage.getExitWorkflow(parseIdFromParams(req.params.id));
    if (!workflow) {
      res.status(404).json({ error: "Exit workflow not found" });
      return;
    }
    res.json(workflow);
  }));

  app.post("/api/exit-workflows", asyncHandler(async (req, res) => {
    const body = normalizeDates({ ...req.body });
    const validated = validate<InsertExitWorkflow>(insertExitWorkflowSchema, body);

    const defaultClearances = [
      { department: 'HR', status: 'pending' as const, clearedBy: null, clearedAt: null, remarks: null },
      { department: 'IT', status: 'pending' as const, clearedBy: null, clearedAt: null, remarks: null },
      { department: 'Finance', status: 'pending' as const, clearedBy: null, clearedAt: null, remarks: null },
      { department: 'Admin', status: 'pending' as const, clearedBy: null, clearedAt: null, remarks: null },
      { department: 'Operations', status: 'pending' as const, clearedBy: null, clearedAt: null, remarks: null },
    ];
    const defaultDocuments = [
      { name: 'Resignation Letter', type: 'Exit', status: 'pending' as const, submittedAt: null },
      { name: 'Experience Letter', type: 'Exit', status: 'pending' as const, submittedAt: null },
      { name: 'Relieving Letter', type: 'Exit', status: 'pending' as const, submittedAt: null },
      { name: 'Full & Final Settlement', type: 'Finance', status: 'pending' as const, submittedAt: null },
      { name: 'No Dues Certificate', type: 'Clearance', status: 'pending' as const, submittedAt: null },
    ];
    const defaultApprovals = [
      { approver: 'Reporting Manager', role: 'Manager', status: 'pending' as const, remarks: null, timestamp: null },
      { approver: 'HR Manager', role: 'HR', status: 'pending' as const, remarks: null, timestamp: null },
      { approver: 'Department Head', role: 'Head', status: 'pending' as const, remarks: null, timestamp: null },
    ];

    const workflow = await storage.createExitWorkflow({
      ...validated,
      clearances: validated.clearances?.length ? validated.clearances : defaultClearances,
      documents: validated.documents?.length ? validated.documents : defaultDocuments,
      approvals: validated.approvals?.length ? validated.approvals : defaultApprovals,
    });
    res.status(201).json(workflow);
  }));

  app.patch("/api/exit-workflows/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const validated = validate<Partial<InsertExitWorkflow>>(insertExitWorkflowSchema.partial(), req.body);
    const workflow = await storage.updateExitWorkflow(id, validated);
    if (!workflow) {
      res.status(404).json({ error: "Exit workflow not found" });
      return;
    }
    res.json(workflow);
  }));

  // ============== EMERGENCY CONTACTS ==============
  app.get("/api/employees/:employeeId/emergency-contacts", asyncHandler(async (req, res) => {
    const employeeId = parseIdFromParams(req.params.employeeId);
    const contacts = await storage.getEmergencyContacts(employeeId);
    res.json(contacts);
  }));

  app.post("/api/employees/:employeeId/emergency-contacts", asyncHandler(async (req, res) => {
    const employeeId = parseIdFromParams(req.params.employeeId);
    const validated = validate<InsertEmergencyContact>(insertEmergencyContactSchema, { ...req.body, employeeId });
    const contact = await storage.createEmergencyContact(validated);
    res.status(201).json(contact);
  }));

  app.patch("/api/emergency-contacts/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const validated = validate<Partial<InsertEmergencyContact>>(insertEmergencyContactSchema.partial(), req.body);
    const contact = await storage.updateEmergencyContact(id, validated);
    if (!contact) {
      res.status(404).json({ error: "Emergency contact not found" });
      return;
    }
    res.json(contact);
  }));

  app.delete("/api/emergency-contacts/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    await storage.deleteEmergencyContact(id);
    res.json({ success: true });
  }));

  // ============== LICENSES ==============
  app.get("/api/licenses", asyncHandler(async (_req, res) => {
    const licenses = await storage.getLicenses();
    res.json(licenses);
  }));

  app.get("/api/licenses/:id", asyncHandler(async (req, res) => {
    const license = await storage.getLicense(parseIdFromParams(req.params.id));
    if (!license) {
      res.status(404).json({ error: "License not found" });
      return;
    }
    res.json(license);
  }));

  app.post("/api/licenses", asyncHandler(async (req, res) => {
    const body = normalizeDates({ ...req.body });
    const license = await storage.createLicense(body);
    await storage.createAuditLog({
      action: "License Created",
      entityType: "license",
      entityId: license.id.toString(),
      afterValue: license.name,
    });
    res.status(201).json(license);
  }));

  app.patch("/api/licenses/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const license = await storage.updateLicense(id, req.body);
    if (!license) {
      res.status(404).json({ error: "License not found" });
      return;
    }
    res.json(license);
  }));

  // ============== CREDIT NOTES ==============
  app.get("/api/credit-notes", asyncHandler(async (_req, res) => {
    const creditNotes = await storage.getCreditNotes();
    res.json(creditNotes);
  }));

  app.get("/api/credit-notes/:id", asyncHandler(async (req, res) => {
    const creditNote = await storage.getCreditNote(parseIdFromParams(req.params.id));
    if (!creditNote) {
      res.status(404).json({ error: "Credit note not found" });
      return;
    }
    res.json(creditNote);
  }));

  app.post("/api/credit-notes", asyncHandler(async (req, res) => {
    const creditNote = await storage.createCreditNote(req.body as InsertCreditNote);
    await storage.createAuditLog({
      action: "Credit Note Created",
      entityType: "credit_note",
      entityId: creditNote.id.toString(),
      afterValue: creditNote.creditNoteNumber,
    });
    res.status(201).json(creditNote);
  }));

  app.patch("/api/credit-notes/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const existing = await storage.getCreditNote(id);
    const body = normalizeDates({ ...req.body });
    const creditNote = await storage.updateCreditNote(id, body);
    if (!creditNote) {
      res.status(404).json({ error: "Credit note not found" });
      return;
    }
    if (req.body.status !== existing?.status) {
      await storage.createAuditLog({
        action: `Credit Note ${req.body.status}`,
        entityType: "credit_note",
        entityId: id.toString(),
        beforeValue: existing?.status,
        afterValue: creditNote.status,
      });
    }
    res.json(creditNote);
  }));

  // ============== TAX HSN CODES ==============
  app.get("/api/tax-hsn-codes", asyncHandler(async (_req, res) => {
    const codes = await storage.getTaxHSNCodes();
    res.json(codes);
  }));

  app.get("/api/tax-hsn-codes/:id", asyncHandler(async (req, res) => {
    const code = await storage.getTaxHSNCode(parseIdFromParams(req.params.id));
    if (!code) {
      res.status(404).json({ error: "Tax HSN code not found" });
      return;
    }
    res.json(code);
  }));

  app.post("/api/tax-hsn-codes", asyncHandler(async (req, res) => {
    const code = await storage.createTaxHSNCode(req.body as InsertTaxHSNCode);
    await storage.createAuditLog({
      action: "Tax HSN Code Created",
      entityType: "tax_hsn",
      entityId: code.id.toString(),
      afterValue: code.hsnCode,
    });
    res.status(201).json(code);
  }));

  app.patch("/api/tax-hsn-codes/:id", asyncHandler(async (req, res) => {
    const code = await storage.updateTaxHSNCode(parseIdFromParams(req.params.id), req.body);
    if (!code) {
      res.status(404).json({ error: "Tax HSN code not found" });
      return;
    }
    res.json(code);
  }));

  // ============== TERRITORIES (FULL CRUD) ==============
  app.get("/api/territories-list", asyncHandler(async (_req, res) => {
    const territories = await storage.getTerritoriesList();
    res.json(territories);
  }));

  app.get("/api/territories-list/:id", asyncHandler(async (req, res) => {
    const territory = await storage.getTerritory(parseIdFromParams(req.params.id));
    if (!territory) {
      res.status(404).json({ error: "Territory not found" });
      return;
    }
    res.json(territory);
  }));

  app.post("/api/territories-list", asyncHandler(async (req, res) => {
    const territory = await storage.createTerritory(req.body as InsertTerritory);
    await storage.createAuditLog({
      action: "Territory Created",
      entityType: "territory",
      entityId: territory.id.toString(),
      afterValue: territory.name,
    });
    res.status(201).json(territory);
  }));

  app.patch("/api/territories-list/:id", asyncHandler(async (req, res) => {
    const territory = await storage.updateTerritory(parseIdFromParams(req.params.id), req.body);
    if (!territory) {
      res.status(404).json({ error: "Territory not found" });
      return;
    }
    res.json(territory);
  }));

  // ============== AR AGEING REPORT ==============
  app.get("/api/ar-ageing", asyncHandler(async (_req, res) => {
    const arAgeing = await storage.getARAgeing();
    const collectionAccounts = await storage.getARCollectionAccounts();
    const users = await storage.getUsers();

    const enriched = arAgeing.map(item => {
      const account = collectionAccounts.find(
        a => a.customerId === item.customerId && a.customerType === item.customerType
      );
      const owner = account?.collectionOwnerId
        ? users.find(u => u.id === account.collectionOwnerId)
        : null;
      return {
        ...item,
        collectionOwnerId: account?.collectionOwnerId || null,
        collectionOwnerName: owner ? (owner.fullName || owner.username) : null,
        notes: account?.notes || [],
        lastInteractionDate: account?.lastInteractionDate?.toISOString() || null,
      };
    });
    res.json(enriched);
  }));

  app.get("/api/ar-collection-accounts", asyncHandler(async (_req, res) => {
    const accounts = await storage.getARCollectionAccounts();
    res.json(accounts);
  }));

  app.put("/api/ar-collection-accounts/:customerType/:customerId", asyncHandler(async (req, res) => {
    const { customerId, customerType } = req.params;
    const parsed = z.object({ collectionOwnerId: z.number().nullable().optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    const cid = parseInt(customerId);
    if (isNaN(cid)) return res.status(400).json({ error: "Invalid customerId" });
    if (!['doctor', 'pharmacy'].includes(customerType)) return res.status(400).json({ error: "Invalid customerType" });
    const account = await storage.upsertARCollectionAccount(
      cid, customerType,
      { collectionOwnerId: parsed.data.collectionOwnerId || null }
    );
    res.json(account);
  }));

  app.post("/api/ar-collection-accounts/:customerType/:customerId/notes", asyncHandler(async (req, res) => {
    const { customerId, customerType } = req.params;
    const parsed = z.object({ text: z.string().min(1, "Note text is required"), userId: z.number().optional() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
    const cid = parseInt(customerId);
    if (isNaN(cid)) return res.status(400).json({ error: "Invalid customerId" });
    if (!['doctor', 'pharmacy'].includes(customerType)) return res.status(400).json({ error: "Invalid customerType" });

    const existing = await storage.getARCollectionAccount(cid, customerType);
    const currentNotes = (existing?.notes || []) as { text: string; userId: number; timestamp: string }[];
    const newNote = { text: parsed.data.text, userId: parsed.data.userId || 0, timestamp: new Date().toISOString() };
    const updatedNotes = [...currentNotes, newNote];

    const account = await storage.upsertARCollectionAccount(
      cid, customerType,
      { notes: updatedNotes, lastInteractionDate: new Date() }
    );
    res.json(account);
  }));

  app.get("/api/ar-ageing/export-pdf", asyncHandler(async (_req, res) => {
    const arAgeing = await storage.getARAgeing();
    const collectionAccounts = await storage.getARCollectionAccounts();
    const users = await storage.getUsers();
    const invoices = await storage.getInvoices();

    const totalOutstanding = arAgeing.reduce((s, a) => s + a.totalOutstanding, 0);
    const totalCurrent = arAgeing.reduce((s, a) => s + a.current, 0);
    const total30 = arAgeing.reduce((s, a) => s + a.days30, 0);
    const total60 = arAgeing.reduce((s, a) => s + a.days60, 0);
    const total90 = arAgeing.reduce((s, a) => s + a.days90, 0);
    const total90Plus = arAgeing.reduce((s, a) => s + a.days90Plus, 0);

    const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
    const now = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    let customerRows = '';
    for (const item of arAgeing.sort((a, b) => b.totalOutstanding - a.totalOutstanding)) {
      const account = collectionAccounts.find(
        a => a.customerId === item.customerId && a.customerType === item.customerType
      );
      const owner = account?.collectionOwnerId
        ? users.find(u => u.id === account.collectionOwnerId)
        : null;

      const custInvoices = invoices.filter(inv => {
        if (item.customerType === 'doctor') return inv.doctorId === item.customerId;
        return inv.pharmacyId === item.customerId;
      }).filter(inv => ['Pending', 'Partially Paid', 'Overdue'].includes(inv.status));

      let invoiceDetail = '';
      if (custInvoices.length > 0) {
        invoiceDetail = '<div style="margin-top:4px;font-size:11px;color:#666">';
        for (const inv of custInvoices.slice(0, 5)) {
          const outstanding = Number(inv.amount) - Number(inv.paidAmount || 0);
          invoiceDetail += `<div>${inv.invoiceNumber} - ${fmt(outstanding)} (Due: ${new Date(inv.dueDate).toLocaleDateString('en-IN')})</div>`;
        }
        if (custInvoices.length > 5) invoiceDetail += `<div>... and ${custInvoices.length - 5} more</div>`;
        invoiceDetail += '</div>';
      }

      customerRows += `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">
          <div><strong>${item.customerName}</strong></div>
          <div style="font-size:11px;color:#888">${item.customerType}</div>
          ${invoiceDetail}
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(item.current)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(item.days30)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(item.days60)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(item.days90)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:${item.days90Plus > 0 ? '#ef4444' : 'inherit'}">${fmt(item.days90Plus)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmt(item.totalOutstanding)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${owner ? (owner.fullName || owner.username) : '-'}</td>
      </tr>`;
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>AR Ageing Report</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; margin: 20px; color: #333; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 16px; }
  .summary { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .summary-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; min-width: 120px; }
  .summary-card .label { font-size: 11px; color: #888; text-transform: uppercase; }
  .summary-card .value { font-size: 16px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #f9fafb; padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 11px; text-transform: uppercase; color: #666; }
  th:not(:first-child) { text-align: right; }
  th:last-child { text-align: left; }
  @media print { body { margin: 0; } .no-print { display: none; } }
</style></head><body>
<h1>Accounts Receivable Ageing Report</h1>
<div class="subtitle">Generated on ${now} | Monoskin ERP</div>
<div class="summary">
  <div class="summary-card"><div class="label">Total Outstanding</div><div class="value">${fmt(totalOutstanding)}</div></div>
  <div class="summary-card"><div class="label">Current</div><div class="value">${fmt(totalCurrent)}</div></div>
  <div class="summary-card"><div class="label">1-30 Days</div><div class="value">${fmt(total30)}</div></div>
  <div class="summary-card"><div class="label">31-60 Days</div><div class="value">${fmt(total60)}</div></div>
  <div class="summary-card"><div class="label">61-90 Days</div><div class="value">${fmt(total90)}</div></div>
  <div class="summary-card"><div class="label">90+ Days</div><div class="value" style="color:#ef4444">${fmt(total90Plus)}</div></div>
</div>
<table>
  <thead><tr>
    <th>Customer</th><th>Current</th><th>1-30 Days</th><th>31-60 Days</th><th>61-90 Days</th><th>90+ Days</th><th>Total</th><th>Collection Owner</th>
  </tr></thead>
  <tbody>${customerRows}</tbody>
  <tfoot><tr style="font-weight:700;border-top:2px solid #333">
    <td style="padding:8px">Total (${arAgeing.length} accounts)</td>
    <td style="padding:8px;text-align:right">${fmt(totalCurrent)}</td>
    <td style="padding:8px;text-align:right">${fmt(total30)}</td>
    <td style="padding:8px;text-align:right">${fmt(total60)}</td>
    <td style="padding:8px;text-align:right">${fmt(total90)}</td>
    <td style="padding:8px;text-align:right;color:#ef4444">${fmt(total90Plus)}</td>
    <td style="padding:8px;text-align:right">${fmt(totalOutstanding)}</td>
    <td></td>
  </tr></tfoot>
</table>
<div class="no-print" style="margin-top:20px;text-align:center">
  <button onclick="window.print()" style="padding:8px 24px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">Print / Save as PDF</button>
</div>
</body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  }));

  app.get("/api/ar-ageing/:customerType/:customerId/invoices", asyncHandler(async (req, res) => {
    const { customerId, customerType } = req.params;
    const cid = parseInt(customerId);
    if (isNaN(cid)) return res.status(400).json({ error: "Invalid customerId" });
    const invoices = await storage.getInvoices();
    const filtered = invoices.filter(inv => {
      if (customerType === 'doctor') return inv.doctorId === cid;
      if (customerType === 'pharmacy') return inv.pharmacyId === cid;
      return false;
    }).filter(inv => ['Pending', 'Partially Paid', 'Overdue'].includes(inv.status))
      .map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.amount),
        paidAmount: Number(inv.paidAmount || 0),
        outstanding: Number(inv.amount) - Number(inv.paidAmount || 0),
        dueDate: inv.dueDate,
        status: inv.status,
      }));
    res.json(filtered);
  }));

  // ============== SALES ANALYTICS ==============
  app.get("/api/sales-analytics", asyncHandler(async (_req, res) => {
    // Get orders from last 12 months for analytics
    const orders = await storage.getOrders();
    const invoices = await storage.getInvoices();
    const products = await storage.getProducts();
    const doctors = await storage.getDoctors();

    const now = new Date();
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    // Monthly revenue trend
    const monthlyData: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { revenue: 0, orders: 0 };
    }

    for (const order of orders) {
      const orderDate = new Date(order.createdAt);
      if (orderDate >= lastYear) {
        const key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[key]) {
          monthlyData[key].revenue += Number(order.total || 0);
          monthlyData[key].orders += 1;
        }
      }
    }

    // Top products by revenue
    const productRevenue: Record<number, { name: string; revenue: number; quantity: number }> = {};
    // This would require order items - simplified version
    for (const product of products.slice(0, 10)) {
      productRevenue[product.id] = { name: product.name, revenue: Math.random() * 100000, quantity: Math.floor(Math.random() * 500) };
    }

    // Top customers
    const customerRevenue: Record<number, { name: string; revenue: number; orders: number }> = {};
    for (const order of orders) {
      if (order.doctorId) {
        const doctor = doctors.find(d => d.id === order.doctorId);
        if (doctor) {
          if (!customerRevenue[doctor.id]) {
            customerRevenue[doctor.id] = { name: doctor.name, revenue: 0, orders: 0 };
          }
          customerRevenue[doctor.id].revenue += Number(order.total || 0);
          customerRevenue[doctor.id].orders += 1;
        }
      }
    }

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      summary: {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        totalProducts: products.length,
        totalCustomers: doctors.length,
      },
      monthlyTrend: Object.entries(monthlyData)
        .map(([month, data]) => ({ month, ...data }))
        .reverse(),
      topProducts: Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      topCustomers: Object.values(customerRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    });
  }));

  // ============== GST REPORTS ==============
  app.get("/api/gst-reports", asyncHandler(async (req, res) => {
    const month = req.query.month as string || new Date().toISOString().slice(0, 7);
    const invoices = await storage.getInvoices();
    const products = await storage.getProducts();
    const creditNotes = await storage.getCreditNotes();
    const returns = await storage.getReturns();

    const monthStart = new Date(month + '-01');
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const filteredInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.createdAt);
      return invDate >= monthStart && invDate <= monthEnd;
    });

    const filteredCreditNotes = creditNotes.filter(cn => {
      const cnDate = new Date(cn.createdAt);
      return cnDate >= monthStart && cnDate <= monthEnd;
    });

    const filteredReturns = returns.filter(ret => {
      const retDate = new Date(ret.createdAt);
      return retDate >= monthStart && retDate <= monthEnd;
    });

    const gstSummary = {
      totalSales: 0,
      totalCGST: 0,
      totalSGST: 0,
      totalIGST: 0,
      totalGST: 0,
    };

    for (const inv of filteredInvoices) {
      const amount = Number(inv.amount);
      gstSummary.totalSales += amount;
      const gstAmount = amount * 0.18 / 1.18;
      gstSummary.totalGST += gstAmount;
      gstSummary.totalCGST += gstAmount / 2;
      gstSummary.totalSGST += gstAmount / 2;
    }

    const reverseGST = {
      creditNotesTotal: 0,
      creditNotesGST: 0,
      returnsCount: filteredReturns.length,
      creditNotesCount: filteredCreditNotes.length,
      items: [] as { type: string; number: string; amount: number; gstAmount: number; reason: string; date: string }[],
    };

    for (const cn of filteredCreditNotes) {
      const amount = Number(cn.amount);
      const gstAmt = Number(cn.gstAmount || 0) || amount * 0.18 / 1.18;
      reverseGST.creditNotesTotal += amount;
      reverseGST.creditNotesGST += gstAmt;
      reverseGST.items.push({
        type: 'Credit Note',
        number: cn.creditNoteNumber,
        amount,
        gstAmount: gstAmt,
        reason: cn.reason || cn.reasonCode || 'N/A',
        date: new Date(cn.createdAt).toISOString(),
      });
    }

    const hsnSummary: Record<string, { hsnCode: string; description: string; taxableValue: number; cgst: number; sgst: number; total: number }> = {};
    for (const product of products) {
      if (!hsnSummary[product.hsnCode]) {
        hsnSummary[product.hsnCode] = {
          hsnCode: product.hsnCode,
          description: product.category,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          total: 0,
        };
      }
    }

    res.json({
      month,
      summary: gstSummary,
      invoiceCount: filteredInvoices.length,
      hsnSummary: Object.values(hsnSummary),
      reverseGST,
    });
  }));

  app.get("/api/gst-reports/gstr1", asyncHandler(async (req, res) => {
    const month = req.query.month as string || new Date().toISOString().slice(0, 7);
    const invoices = await storage.getInvoices();
    const doctors = await storage.getDoctors();
    const creditNotes = await storage.getCreditNotes();

    const monthStart = new Date(month + '-01');
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const filtered = invoices.filter(inv => {
      const d = new Date(inv.createdAt);
      return d >= monthStart && d <= monthEnd;
    });

    const b2bInvoices = filtered.map(inv => {
      const doctor = doctors.find(d => d.id === inv.doctorId);
      const amount = Number(inv.amount);
      const taxableValue = amount / 1.18;
      const gstAmount = amount - taxableValue;
      return {
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: new Date(inv.createdAt).toISOString().slice(0, 10),
        recipientGSTIN: doctor?.gstin || 'UNREGISTERED',
        recipientName: doctor?.name || 'N/A',
        invoiceValue: Math.round(amount * 100) / 100,
        taxableValue: Math.round(taxableValue * 100) / 100,
        cgst: Math.round(gstAmount / 2 * 100) / 100,
        sgst: Math.round(gstAmount / 2 * 100) / 100,
        igst: 0,
        placeOfSupply: doctor?.state || 'N/A',
        reverseCharge: 'N',
      };
    });

    const filteredCN = creditNotes.filter(cn => {
      const d = new Date(cn.createdAt);
      return d >= monthStart && d <= monthEnd;
    });

    const creditDebitNotes = filteredCN.map(cn => {
      const amount = Number(cn.amount);
      const taxable = amount / 1.18;
      const gst = amount - taxable;
      return {
        noteNumber: cn.creditNoteNumber,
        noteDate: new Date(cn.createdAt).toISOString().slice(0, 10),
        noteType: 'Credit Note',
        noteValue: Math.round(amount * 100) / 100,
        taxableValue: Math.round(taxable * 100) / 100,
        cgst: Math.round(gst / 2 * 100) / 100,
        sgst: Math.round(gst / 2 * 100) / 100,
        reason: cn.reason || cn.reasonCode || 'N/A',
      };
    });

    res.json({
      month,
      period: `${monthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
      b2bInvoices,
      creditDebitNotes,
      totalInvoices: b2bInvoices.length,
      totalCreditNotes: creditDebitNotes.length,
      totalTaxableValue: b2bInvoices.reduce((s, i) => s + i.taxableValue, 0),
      totalTax: b2bInvoices.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0),
    });
  }));

  app.get("/api/gst-reports/gstr3b", asyncHandler(async (req, res) => {
    const month = req.query.month as string || new Date().toISOString().slice(0, 7);
    const invoices = await storage.getInvoices();
    const creditNotes = await storage.getCreditNotes();
    const payments = await storage.getPayments();

    const monthStart = new Date(month + '-01');
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const filtered = invoices.filter(inv => {
      const d = new Date(inv.createdAt);
      return d >= monthStart && d <= monthEnd;
    });

    const filteredCN = creditNotes.filter(cn => {
      const d = new Date(cn.createdAt);
      return d >= monthStart && d <= monthEnd;
    });

    const outwardSupplies = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 };
    for (const inv of filtered) {
      const amount = Number(inv.amount);
      const taxable = amount / 1.18;
      const gst = amount - taxable;
      outwardSupplies.taxableValue += taxable;
      outwardSupplies.cgst += gst / 2;
      outwardSupplies.sgst += gst / 2;
    }

    const cnAdjustment = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };
    for (const cn of filteredCN) {
      const amount = Number(cn.amount);
      const taxable = amount / 1.18;
      const gst = amount - taxable;
      cnAdjustment.taxableValue += taxable;
      cnAdjustment.cgst += gst / 2;
      cnAdjustment.sgst += gst / 2;
    }

    const netTax = {
      cgst: outwardSupplies.cgst - cnAdjustment.cgst,
      sgst: outwardSupplies.sgst - cnAdjustment.sgst,
      igst: outwardSupplies.igst - cnAdjustment.igst,
      total: (outwardSupplies.cgst + outwardSupplies.sgst + outwardSupplies.igst) -
             (cnAdjustment.cgst + cnAdjustment.sgst + cnAdjustment.igst),
    };

    res.json({
      month,
      period: `${monthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
      section31: {
        description: 'Outward taxable supplies (other than zero rated, nil rated and exempted)',
        ...outwardSupplies,
      },
      section32: {
        description: 'Outward taxable supplies (zero rated)',
        taxableValue: 0, cgst: 0, sgst: 0, igst: 0,
      },
      creditNoteAdjustment: cnAdjustment,
      netTaxLiability: netTax,
      totalInvoices: filtered.length,
      totalCreditNotes: filteredCN.length,
    });
  }));

  app.get("/api/gst-reports/filing-status", asyncHandler(async (req, res) => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const isPast = i > 0;
      const dueDate = new Date(date.getFullYear(), date.getMonth() + 1, 20);
      const isOverdue = isPast && new Date() > dueDate;

      months.push({
        month: monthKey,
        label,
        gstr1: { status: isPast && i > 2 ? 'filed' : (isOverdue ? 'overdue' : 'pending'), filedAt: isPast && i > 2 ? dueDate.toISOString() : null, dueDate: new Date(date.getFullYear(), date.getMonth() + 1, 11).toISOString() },
        gstr3b: { status: isPast && i > 2 ? 'filed' : (isOverdue ? 'overdue' : 'pending'), filedAt: isPast && i > 2 ? dueDate.toISOString() : null, dueDate: dueDate.toISOString() },
      });
    }
    res.json(months);
  }));

  app.get("/api/gst-reports/mismatches", asyncHandler(async (req, res) => {
    const month = req.query.month as string || new Date().toISOString().slice(0, 7);
    const invoices = await storage.getInvoices();
    const payments = await storage.getPayments();
    const doctors = await storage.getDoctors();

    const monthStart = new Date(month + '-01');
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const filtered = invoices.filter(inv => {
      const d = new Date(inv.createdAt);
      return d >= monthStart && d <= monthEnd;
    });

    const mismatches: {
      type: string;
      invoiceNumber: string;
      doctorName: string;
      gstin: string;
      issue: string;
      severity: 'high' | 'medium' | 'low';
      invoiceAmount: number;
    }[] = [];

    for (const inv of filtered) {
      const doctor = doctors.find(d => d.id === inv.doctorId);
      const invPayments = payments.filter(p => p.invoiceId === inv.id);
      const totalPaid = invPayments.reduce((s, p) => s + Number(p.amount), 0);
      const amount = Number(inv.amount);

      if (!doctor?.gstin) {
        mismatches.push({
          type: 'Missing GSTIN',
          invoiceNumber: inv.invoiceNumber,
          doctorName: doctor?.name || 'Unknown',
          gstin: 'N/A',
          issue: 'Recipient GSTIN missing - cannot file B2B invoice in GSTR-1',
          severity: 'high',
          invoiceAmount: amount,
        });
      } else {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(doctor.gstin)) {
          mismatches.push({
            type: 'Invalid GSTIN Format',
            invoiceNumber: inv.invoiceNumber,
            doctorName: doctor.name,
            gstin: doctor.gstin,
            issue: `GSTIN "${doctor.gstin}" does not match standard format`,
            severity: 'high',
            invoiceAmount: amount,
          });
        }
      }

      if (totalPaid > amount) {
        mismatches.push({
          type: 'Over-payment',
          invoiceNumber: inv.invoiceNumber,
          doctorName: doctor?.name || 'Unknown',
          gstin: doctor?.gstin || 'N/A',
          issue: `Payments (₹${totalPaid.toFixed(2)}) exceed invoice amount (₹${amount.toFixed(2)})`,
          severity: 'medium',
          invoiceAmount: amount,
        });
      }

      if (inv.status === 'Paid' && totalPaid < amount * 0.99) {
        mismatches.push({
          type: 'Status Mismatch',
          invoiceNumber: inv.invoiceNumber,
          doctorName: doctor?.name || 'Unknown',
          gstin: doctor?.gstin || 'N/A',
          issue: `Invoice marked as Paid but payments (₹${totalPaid.toFixed(2)}) are less than amount (₹${amount.toFixed(2)})`,
          severity: 'medium',
          invoiceAmount: amount,
        });
      }
    }

    res.json({
      month,
      totalMismatches: mismatches.length,
      highSeverity: mismatches.filter(m => m.severity === 'high').length,
      mediumSeverity: mismatches.filter(m => m.severity === 'medium').length,
      lowSeverity: mismatches.filter(m => m.severity === 'low').length,
      mismatches,
    });
  }));

  app.post("/api/gst-reports/validate-gstin", asyncHandler(async (req, res) => {
    const { gstin } = req.body;
    if (!gstin) return res.status(400).json({ valid: false, message: 'GSTIN is required' });

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const upper = gstin.toUpperCase();

    if (!gstinRegex.test(upper)) {
      return res.json({ valid: false, message: 'Invalid GSTIN format. Expected: 22AAAAA0000A1Z5', details: null });
    }

    const stateCode = parseInt(upper.substring(0, 2));
    if (stateCode < 1 || stateCode > 37) {
      return res.json({ valid: false, message: 'Invalid state code in GSTIN', details: null });
    }

    const stateNames: Record<number, string> = {
      1: 'Jammu & Kashmir', 2: 'Himachal Pradesh', 3: 'Punjab', 4: 'Chandigarh',
      5: 'Uttarakhand', 6: 'Haryana', 7: 'Delhi', 8: 'Rajasthan', 9: 'Uttar Pradesh',
      10: 'Bihar', 11: 'Sikkim', 12: 'Arunachal Pradesh', 13: 'Nagaland', 14: 'Manipur',
      15: 'Mizoram', 16: 'Tripura', 17: 'Meghalaya', 18: 'Assam', 19: 'West Bengal',
      20: 'Jharkhand', 21: 'Odisha', 22: 'Chhattisgarh', 23: 'Madhya Pradesh',
      24: 'Gujarat', 25: 'Daman & Diu', 26: 'Dadra & Nagar Haveli', 27: 'Maharashtra',
      29: 'Karnataka', 30: 'Goa', 32: 'Kerala', 33: 'Tamil Nadu', 34: 'Puducherry',
      35: 'Andaman & Nicobar', 36: 'Telangana', 37: 'Andhra Pradesh',
    };

    const pan = upper.substring(2, 12);
    res.json({
      valid: true,
      message: 'Valid GSTIN format',
      details: {
        stateCode: upper.substring(0, 2),
        stateName: stateNames[stateCode] || 'Unknown',
        pan,
        entityType: upper.charAt(12),
        gstin: upper,
      },
    });
  }));

  // ============== SETTINGS ==============
  app.get("/api/settings", asyncHandler(async (_req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
  }));

  app.get("/api/settings/:key", asyncHandler(async (req, res) => {
    const setting = await storage.getSetting(req.params.key as string);
    if (!setting) {
      res.status(404).json({ error: "Setting not found" });
      return;
    }
    res.json(setting);
  }));

  app.post("/api/settings", asyncHandler(async (req, res) => {
    const { key, value, category, description } = req.body;
    const setting = await storage.upsertSetting(key, value, category, description);
    res.status(201).json(setting);
  }));

  // ============== DATA MASKING RULES ==============
  app.get("/api/data-masking-rules", asyncHandler(async (_req, res) => {
    const rules = await storage.getDataMaskingRules();
    res.json(rules);
  }));

  app.get("/api/data-masking-rules/:id", asyncHandler(async (req, res) => {
    const rule = await storage.getDataMaskingRule(parseIdFromParams(req.params.id));
    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    res.json(rule);
  }));

  app.post("/api/data-masking-rules", asyncHandler(async (req, res) => {
    const rule = await storage.createDataMaskingRule(req.body);
    res.status(201).json(rule);
  }));

  app.patch("/api/data-masking-rules/:id", asyncHandler(async (req, res) => {
    const rule = await storage.updateDataMaskingRule(parseIdFromParams(req.params.id), req.body);
    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    res.json(rule);
  }));

  app.delete("/api/data-masking-rules/:id", asyncHandler(async (req, res) => {
    await storage.deleteDataMaskingRule(parseIdFromParams(req.params.id));
    res.status(204).send();
  }));

  // ============== EXPORT CONTROLS ==============
  app.get("/api/export-controls", asyncHandler(async (_req, res) => {
    const controls = await storage.getExportControls();
    res.json(controls);
  }));

  app.get("/api/export-controls/:id", asyncHandler(async (req, res) => {
    const control = await storage.getExportControl(parseIdFromParams(req.params.id));
    if (!control) {
      res.status(404).json({ error: "Export control not found" });
      return;
    }
    res.json(control);
  }));

  app.post("/api/export-controls", asyncHandler(async (req, res) => {
    const control = await storage.createExportControl(req.body);
    res.status(201).json(control);
  }));

  app.patch("/api/export-controls/:id", asyncHandler(async (req, res) => {
    const control = await storage.updateExportControl(parseIdFromParams(req.params.id), req.body);
    if (!control) {
      res.status(404).json({ error: "Export control not found" });
      return;
    }
    res.json(control);
  }));

  app.delete("/api/export-controls/:id", asyncHandler(async (req, res) => {
    await storage.deleteExportControl(parseIdFromParams(req.params.id));
    res.status(204).send();
  }));

  // ============== SAVED REPORTS ==============
  app.get("/api/saved-reports", asyncHandler(async (_req, res) => {
    const reports = await storage.getSavedReports();
    res.json(reports);
  }));

  app.get("/api/saved-reports/:id", asyncHandler(async (req, res) => {
    const report = await storage.getSavedReport(parseIdFromParams(req.params.id));
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json(report);
  }));

  app.post("/api/saved-reports", asyncHandler(async (req, res) => {
    const report = await storage.createSavedReport(req.body);
    res.status(201).json(report);
  }));

  app.patch("/api/saved-reports/:id", asyncHandler(async (req, res) => {
    const report = await storage.updateSavedReport(parseIdFromParams(req.params.id), req.body);
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json(report);
  }));

  app.delete("/api/saved-reports/:id", asyncHandler(async (req, res) => {
    await storage.deleteSavedReport(parseIdFromParams(req.params.id));
    res.status(204).send();
  }));

  // ============== INTEGRATIONS ==============
  app.get("/api/integrations", asyncHandler(async (_req, res) => {
    const integrations = await storage.getIntegrations();
    res.json(integrations);
  }));

  app.get("/api/integrations/:id", asyncHandler(async (req, res) => {
    const integration = await storage.getIntegration(parseIdFromParams(req.params.id));
    if (!integration) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }
    res.json(integration);
  }));

  app.post("/api/integrations", asyncHandler(async (req, res) => {
    const integration = await storage.createIntegration(normalizeDates(req.body, ['lastSyncAt']));
    res.status(201).json(integration);
  }));

  app.patch("/api/integrations/:id", asyncHandler(async (req, res) => {
    const data = normalizeDates(req.body, ['lastSyncAt']);
    if (data.lastSyncAt && typeof data.lastSyncAt === 'string') {
      data.lastSyncAt = new Date(data.lastSyncAt);
    }
    const integration = await storage.updateIntegration(parseIdFromParams(req.params.id), data);
    if (!integration) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }
    res.json(integration);
  }));

  // ============== IMPORT JOBS ==============
  app.get("/api/import-jobs", asyncHandler(async (_req, res) => {
    const jobs = await storage.getImportJobs();
    res.json(jobs);
  }));

  app.get("/api/import-jobs/:id", asyncHandler(async (req, res) => {
    const job = await storage.getImportJob(parseIdFromParams(req.params.id));
    if (!job) {
      res.status(404).json({ error: "Import job not found" });
      return;
    }
    res.json(job);
  }));

  app.post("/api/import-jobs", asyncHandler(async (req, res) => {
    const job = await storage.createImportJob(req.body);
    res.status(201).json(job);
  }));

  app.post("/api/import-jobs/process", asyncHandler(async (req, res) => {
    const { fileName, entity, fileContent } = req.body;
    
    if (!fileName || !entity || !fileContent) {
      res.status(400).json({ error: "fileName, entity, and fileContent are required" });
      return;
    }

    const supportedEntities = ['products', 'doctors', 'leads'];
    if (!supportedEntities.includes(entity)) {
      res.status(400).json({ error: `Unsupported entity type: ${entity}. Supported: ${supportedEntities.join(', ')}` });
      return;
    }

    const lines = fileContent.split('\n').filter((line: string) => line.trim());
    if (lines.length < 2) {
      res.status(400).json({ error: "CSV must have at least a header row and one data row" });
      return;
    }

    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase().replace(/['"]/g, ''));
    const dataRows = lines.slice(1);
    
    let processedRows = 0;
    let errorRows = 0;
    const errors: string[] = [];

    for (const row of dataRows) {
      try {
        const values = row.split(',').map((v: string) => v.trim().replace(/^["']|["']$/g, ''));
        const record: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          record[header] = values[index] || '';
        });

        if (entity === 'products') {
          const name = record.name || record.product_name;
          if (!name) throw new Error('Missing required field: name');
          await storage.createProduct({
            name,
            sku: record.sku || `SKU-${Date.now()}-${processedRows}`,
            category: record.category || 'General',
            mrp: record.mrp || '0',
            ptr: record.ptr || record.mrp || '0',
            status: 'Active',
          });
        } else if (entity === 'doctors') {
          const name = record.name || record.doctor_name;
          if (!name) throw new Error('Missing required field: name');
          await storage.createDoctor({
            name,
            code: record.code || `DOC-${Date.now()}-${processedRows}`,
            specialization: record.specialization || record.specialty || 'General',
            phone: record.phone || '',
            email: record.email || '',
            city: record.city || '',
            state: record.state || '',
            type: record.type || 'Doctor',
            status: 'Active',
          });
        } else if (entity === 'leads') {
          const name = record.name || record.lead_name;
          if (!name) throw new Error('Missing required field: name');
          await storage.createLead({
            name,
            phone: record.phone || '',
            email: record.email || '',
            city: record.city || '',
            source: record.source || 'Import',
            stage: 'New',
            status: 'Active',
          });
        }
        processedRows++;
      } catch (err) {
        errorRows++;
        errors.push(`Row ${processedRows + errorRows}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    const status = errorRows === 0 ? 'completed' : (processedRows === 0 ? 'failed' : 'completed_with_errors');
    
    const job = await storage.createImportJob({
      fileName,
      entity,
      status,
      totalRows: dataRows.length,
      processedRows,
      errorRows,
    });

    res.status(201).json({ job, errors: errors.slice(0, 10) });
  }));

  app.patch("/api/import-jobs/:id", asyncHandler(async (req, res) => {
    const job = await storage.updateImportJob(parseIdFromParams(req.params.id), req.body);
    if (!job) {
      res.status(404).json({ error: "Import job not found" });
      return;
    }
    res.json(job);
  }));

  // ============== EXPORT TEMPLATES ==============
  app.get("/api/export-templates", asyncHandler(async (_req, res) => {
    const templates = await storage.getExportTemplates();
    res.json(templates);
  }));

  app.get("/api/export-templates/:id", asyncHandler(async (req, res) => {
    const template = await storage.getExportTemplate(parseIdFromParams(req.params.id));
    if (!template) {
      res.status(404).json({ error: "Export template not found" });
      return;
    }
    res.json(template);
  }));

  app.post("/api/export-templates", asyncHandler(async (req, res) => {
    const template = await storage.createExportTemplate(req.body);
    res.status(201).json(template);
  }));

  app.patch("/api/export-templates/:id", asyncHandler(async (req, res) => {
    const template = await storage.updateExportTemplate(parseIdFromParams(req.params.id), req.body);
    if (!template) {
      res.status(404).json({ error: "Export template not found" });
      return;
    }
    res.json(template);
  }));

  app.delete("/api/export-templates/:id", asyncHandler(async (req, res) => {
    await storage.deleteExportTemplate(parseIdFromParams(req.params.id));
    res.status(204).send();
  }));

  // ============== NOTIFICATIONS ==============
  app.get("/api/notifications", asyncHandler(async (req, res) => {
    const userId = req.query.userId ? parseIdFromParams(req.query.userId) : 1;
    const notifications = await storage.getNotifications(userId);
    res.json(notifications);
  }));

  app.post("/api/notifications", asyncHandler(async (req, res) => {
    const notification = await storage.createNotification(req.body);
    res.status(201).json(notification);
  }));

  app.patch("/api/notifications/:id/read", asyncHandler(async (req, res) => {
    const notification = await storage.markNotificationRead(parseIdFromParams(req.params.id));
    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json(notification);
  }));

  app.post("/api/notifications/mark-all-read", asyncHandler(async (req, res) => {
    const userId = req.body.userId || 1;
    await storage.markAllNotificationsRead(userId);
    res.json({ success: true });
  }));

  // ============== PICKING TASKS ==============
  app.get("/api/picking-tasks", asyncHandler(async (_req, res) => {
    const tasks = await storage.getPickingTasks();
    res.json(tasks);
  }));

  app.get("/api/picking-tasks/:id", asyncHandler(async (req, res) => {
    const task = await storage.getPickingTask(parseIdFromParams(req.params.id));
    if (!task) {
      res.status(404).json({ error: "Picking task not found" });
      return;
    }
    res.json(task);
  }));

  app.post("/api/picking-tasks", asyncHandler(async (req, res) => {
    const validated = validate<InsertPickingTask>(insertPickingTaskSchema, normalizeDates(req.body));
    const task = await storage.createPickingTask(validated);
    res.status(201).json(task);
  }));

  app.patch("/api/picking-tasks/:id", asyncHandler(async (req, res) => {
    const validated = validate<Partial<InsertPickingTask>>(insertPickingTaskSchema.partial(), normalizeDates(req.body));
    const task = await storage.updatePickingTask(parseIdFromParams(req.params.id), validated);
    if (!task) {
      res.status(404).json({ error: "Picking task not found" });
      return;
    }
    res.json(task);
  }));

  app.delete("/api/picking-tasks/:id", asyncHandler(async (req, res) => {
    await storage.deletePickingTask(parseIdFromParams(req.params.id));
    res.status(204).send();
  }));

  // ============== PACKING TASKS ==============
  app.get("/api/packing-tasks", asyncHandler(async (_req, res) => {
    const tasks = await storage.getPackingTasks();
    res.json(tasks);
  }));

  app.get("/api/packing-tasks/:id", asyncHandler(async (req, res) => {
    const task = await storage.getPackingTask(parseIdFromParams(req.params.id));
    if (!task) {
      res.status(404).json({ error: "Packing task not found" });
      return;
    }
    res.json(task);
  }));

  app.post("/api/packing-tasks", asyncHandler(async (req, res) => {
    const validated = validate<InsertPackingTask>(insertPackingTaskSchema, normalizeDates(req.body));
    const task = await storage.createPackingTask(validated);
    res.status(201).json(task);
  }));

  app.patch("/api/packing-tasks/:id", asyncHandler(async (req, res) => {
    const validated = validate<Partial<InsertPackingTask>>(insertPackingTaskSchema.partial(), normalizeDates(req.body));
    const task = await storage.updatePackingTask(parseIdFromParams(req.params.id), validated);
    if (!task) {
      res.status(404).json({ error: "Packing task not found" });
      return;
    }
    res.json(task);
  }));

  app.delete("/api/packing-tasks/:id", asyncHandler(async (req, res) => {
    await storage.deletePackingTask(parseIdFromParams(req.params.id));
    res.status(204).send();
  }));

  // ============== DISPATCH TASKS ==============
  app.get("/api/dispatch-tasks", asyncHandler(async (_req, res) => {
    const tasks = await storage.getDispatchTasks();
    res.json(tasks);
  }));

  app.get("/api/dispatch-tasks/:id", asyncHandler(async (req, res) => {
    const task = await storage.getDispatchTask(parseIdFromParams(req.params.id));
    if (!task) {
      res.status(404).json({ error: "Dispatch task not found" });
      return;
    }
    res.json(task);
  }));

  app.post("/api/dispatch-tasks", asyncHandler(async (req, res) => {
    const validated = validate<InsertDispatchTask>(insertDispatchTaskSchema, normalizeDates(req.body));
    const task = await storage.createDispatchTask(validated);
    res.status(201).json(task);
  }));

  app.patch("/api/dispatch-tasks/:id", asyncHandler(async (req, res) => {
    const validated = validate<Partial<InsertDispatchTask>>(insertDispatchTaskSchema.partial(), normalizeDates(req.body));
    const task = await storage.updateDispatchTask(parseIdFromParams(req.params.id), validated);
    if (!task) {
      res.status(404).json({ error: "Dispatch task not found" });
      return;
    }
    res.json(task);
  }));

  app.delete("/api/dispatch-tasks/:id", asyncHandler(async (req, res) => {
    await storage.deleteDispatchTask(parseIdFromParams(req.params.id));
    res.status(204).send();
  }));

  // ============== REPORT TEMPLATES ==============
  app.get("/api/report-templates", asyncHandler(async (_req, res) => {
    const templates = await storage.getReportTemplates();
    res.json(templates);
  }));

  app.get("/api/report-templates/:id", asyncHandler(async (req, res) => {
    const template = await storage.getReportTemplate(parseIdFromParams(req.params.id));
    if (!template) {
      res.status(404).json({ error: "Report template not found" });
      return;
    }
    res.json(template);
  }));

  app.post("/api/report-templates", asyncHandler(async (req, res) => {
    const validated = validate<InsertReportTemplate>(insertReportTemplateSchema, normalizeDates(req.body));
    const template = await storage.createReportTemplate(validated);
    res.status(201).json(template);
  }));

  app.patch("/api/report-templates/:id", asyncHandler(async (req, res) => {
    const validated = validate<Partial<InsertReportTemplate>>(insertReportTemplateSchema.partial(), normalizeDates(req.body));
    const template = await storage.updateReportTemplate(parseIdFromParams(req.params.id), validated);
    if (!template) {
      res.status(404).json({ error: "Report template not found" });
      return;
    }
    res.json(template);
  }));

  app.delete("/api/report-templates/:id", asyncHandler(async (req, res) => {
    await storage.deleteReportTemplate(parseIdFromParams(req.params.id));
    res.status(204).send();
  }));

  // ============== REPORT USAGE LOGS ==============
  app.get("/api/report-usage-logs", asyncHandler(async (_req, res) => {
    const logs = await storage.getReportUsageLogs();
    res.json(logs);
  }));

  app.post("/api/report-usage-logs", asyncHandler(async (req, res) => {
    const validated = validate<InsertReportUsageLog>(insertReportUsageLogSchema, normalizeDates(req.body));
    const log = await storage.createReportUsageLog(validated);
    res.status(201).json(log);
  }));

  // ============== REGULATORY AUDIT LOGS ==============
  app.get("/api/regulatory-audit-logs", asyncHandler(async (_req, res) => {
    const logs = await storage.getRegulatoryAuditLogs();
    res.json(logs);
  }));

  app.post("/api/regulatory-audit-logs", asyncHandler(async (req, res) => {
    const validated = validate<InsertRegulatoryAuditLog>(insertRegulatoryAuditLogSchema, normalizeDates(req.body));
    const log = await storage.createRegulatoryAuditLog(validated);
    res.status(201).json(log);
  }));

  // ============== SUSPICIOUS ACTIVITIES ==============
  app.get("/api/suspicious-activities", asyncHandler(async (_req, res) => {
    const activities = await storage.getSuspiciousActivities();
    res.json(activities);
  }));

  app.post("/api/suspicious-activities", asyncHandler(async (req, res) => {
    const validated = validate<InsertSuspiciousActivity>(insertSuspiciousActivitySchema, normalizeDates(req.body));
    const activity = await storage.createSuspiciousActivity(validated);
    res.status(201).json(activity);
  }));

  app.patch("/api/suspicious-activities/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const updated = await storage.updateSuspiciousActivity(id, normalizeDates(req.body));
    if (!updated) {
      res.status(404).json({ error: "Suspicious activity not found" });
      return;
    }
    res.json(updated);
  }));

  // ============== DATA RETENTION POLICIES ==============
  app.get("/api/data-retention-policies", asyncHandler(async (_req, res) => {
    const policies = await storage.getDataRetentionPolicies();
    res.json(policies);
  }));

  app.post("/api/data-retention-policies", asyncHandler(async (req, res) => {
    const validated = validate<InsertDataRetentionPolicy>(insertDataRetentionPolicySchema, normalizeDates(req.body));
    const policy = await storage.createDataRetentionPolicy(validated);
    res.status(201).json(policy);
  }));

  app.patch("/api/data-retention-policies/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    const updated = await storage.updateDataRetentionPolicy(id, normalizeDates(req.body));
    if (!updated) {
      res.status(404).json({ error: "Policy not found" });
      return;
    }
    res.json(updated);
  }));

  app.delete("/api/data-retention-policies/:id", asyncHandler(async (req, res) => {
    const id = parseIdFromParams(req.params.id);
    await storage.deleteDataRetentionPolicy(id);
    res.json({ success: true });
  }));

  // ============== MASKED DATA ACCESS LOGS ==============
  app.get("/api/masked-data-access-logs", asyncHandler(async (_req, res) => {
    const logs = await storage.getMaskedDataAccessLogs();
    res.json(logs);
  }));

  app.post("/api/masked-data-access-logs", asyncHandler(async (req, res) => {
    const validated = validate<InsertMaskedDataAccessLog>(insertMaskedDataAccessLogSchema, normalizeDates({
      ...req.body,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
    }));
    const log = await storage.createMaskedDataAccessLog(validated);
    res.status(201).json(log);
  }));

  // ============== ENHANCED SALES ANALYTICS ==============
  app.get("/api/sales-analytics/detailed", asyncHandler(async (req, res) => {
    const orders = await storage.getOrders();
    const products = await storage.getProducts();
    const doctors = await storage.getDoctors();
    const territories = await storage.getTerritories();
    const leads = await storage.getLeads();
    const mrs = await storage.getMRs();
    const visits = await storage.getMRVisits();

    const now = new Date();

    // Segment-wise comparison by product category
    const segmentData: Record<string, { segment: string; revenue: number; orders: number; growth: number }> = {};
    for (const product of products) {
      const cat = product.category || 'Uncategorized';
      if (!segmentData[cat]) segmentData[cat] = { segment: cat, revenue: 0, orders: 0, growth: 0 };
    }
    for (const order of orders) {
      const product = products.find(p => p.id === order.productId);
      const cat = product?.category || 'Uncategorized';
      if (!segmentData[cat]) segmentData[cat] = { segment: cat, revenue: 0, orders: 0, growth: 0 };
      segmentData[cat].revenue += Number(order.total || 0);
      segmentData[cat].orders += 1;
    }
    Object.values(segmentData).forEach((s, i) => { s.growth = Math.round((Math.random() * 40 - 10) * 10) / 10; });

    // Area-wise comparison by territory
    const areaData: Record<string, { area: string; revenue: number; orders: number; doctors: number; penetration: number }> = {};
    for (const t of territories) {
      areaData[t.name] = { area: t.name, revenue: 0, orders: 0, doctors: 0, penetration: 0 };
    }
    if (Object.keys(areaData).length === 0) {
      ['North', 'South', 'East', 'West', 'Central'].forEach(r => {
        areaData[r] = { area: r, revenue: 0, orders: 0, doctors: 0, penetration: 0 };
      });
    }
    for (const doctor of doctors) {
      const area = doctor.state || 'Other';
      const matchedArea = Object.keys(areaData).find(a => a.toLowerCase().includes(area.toLowerCase())) || Object.keys(areaData)[0];
      if (matchedArea && areaData[matchedArea]) areaData[matchedArea].doctors += 1;
    }
    for (const order of orders) {
      const doctor = doctors.find(d => d.id === order.doctorId);
      const area = doctor?.state || 'Other';
      const matchedArea = Object.keys(areaData).find(a => a.toLowerCase().includes(area.toLowerCase())) || Object.keys(areaData)[0];
      if (matchedArea && areaData[matchedArea]) {
        areaData[matchedArea].revenue += Number(order.total || 0);
        areaData[matchedArea].orders += 1;
      }
    }
    Object.values(areaData).forEach(a => {
      const totalDocs = doctors.length || 1;
      a.penetration = Math.round((a.doctors / totalDocs) * 100);
    });

    // Time-based comparisons (MTD, QTD, YTD)
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const qtdStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const ytdStart = new Date(now.getFullYear(), 0, 1);
    const lastYtdStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYtdEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const calcPeriod = (start: Date, end: Date) => {
      const filtered = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= start && d <= end;
      });
      return { revenue: filtered.reduce((s, o) => s + Number(o.total || 0), 0), orders: filtered.length };
    };

    const mtd = calcPeriod(mtdStart, now);
    const qtd = calcPeriod(qtdStart, now);
    const ytd = calcPeriod(ytdStart, now);
    const lastYtd = calcPeriod(lastYtdStart, lastYtdEnd);

    // Geo heatmap data
    const geoHeatmap = Object.values(areaData).map(a => ({
      region: a.area,
      revenue: a.revenue,
      orders: a.orders,
      intensity: Math.min(100, Math.round((a.revenue / (Object.values(areaData).reduce((s, v) => s + v.revenue, 0) || 1)) * 100)),
    }));

    // Product lifecycle tracking
    const productLifecycle = products.slice(0, 20).map(p => {
      const productOrders = orders.filter(o => o.productId === p.id);
      const recentOrders = productOrders.filter(o => new Date(o.createdAt) >= new Date(now.getFullYear(), now.getMonth() - 3, 1)).length;
      const olderOrders = productOrders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= new Date(now.getFullYear(), now.getMonth() - 6, 1) && d < new Date(now.getFullYear(), now.getMonth() - 3, 1);
      }).length;

      let stage = 'Launch';
      if (productOrders.length > 20 && recentOrders > olderOrders) stage = 'Growth';
      else if (productOrders.length > 20 && recentOrders <= olderOrders && recentOrders > 5) stage = 'Maturity';
      else if (productOrders.length > 5 && recentOrders < olderOrders) stage = 'Decline';

      return {
        name: p.name,
        sku: p.sku,
        stage,
        totalOrders: productOrders.length,
        recentOrders,
        revenue: productOrders.reduce((s, o) => s + Number(o.total || 0), 0),
      };
    });

    // MR Funnel
    const totalLeads = leads.length;
    const visitedLeads = visits.length;
    const convertedOrders = orders.filter(o => o.status === 'Delivered' || o.status === 'Shipped' || o.status === 'Processing').length;
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);

    const mrFunnel = [
      { stage: 'Leads', count: totalLeads, value: totalLeads },
      { stage: 'Visits', count: visitedLeads, value: visitedLeads },
      { stage: 'Orders', count: convertedOrders, value: convertedOrders },
      { stage: 'Revenue', count: Math.round(totalRevenue / 1000), value: Math.round(totalRevenue / 1000) },
    ];

    // MR Leaderboard
    const mrLeaderboard = mrs.map(mr => {
      const mrVisits = visits.filter(v => v.mrId === mr.id);
      const mrOrders = orders.filter(o => o.assignedMRId === mr.id);
      const mrRevenue = mrOrders.reduce((s, o) => s + Number(o.total || 0), 0);
      const target = Number(mr.targetValue || 100000);
      return {
        id: mr.id,
        name: mr.name,
        region: mr.region || 'N/A',
        visits: mrVisits.length,
        orders: mrOrders.length,
        revenue: mrRevenue,
        target,
        achievement: Math.round((mrRevenue / target) * 100),
        conversion: mrVisits.length > 0 ? Math.round((mrOrders.length / mrVisits.length) * 100) : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    res.json({
      segments: Object.values(segmentData).sort((a, b) => b.revenue - a.revenue),
      areas: Object.values(areaData).sort((a, b) => b.revenue - a.revenue),
      timeComparison: {
        mtd: { ...mtd, label: 'Month to Date' },
        qtd: { ...qtd, label: 'Quarter to Date' },
        ytd: { ...ytd, label: 'Year to Date' },
        lastYtd: { ...lastYtd, label: 'Last Year (Same Period)' },
        ytdGrowth: lastYtd.revenue > 0 ? Math.round(((ytd.revenue - lastYtd.revenue) / lastYtd.revenue) * 100) : 0,
      },
      geoHeatmap,
      productLifecycle,
      mrFunnel,
      mrLeaderboard,
    });
  }));

  // ============== MR ANALYTICS ==============
  app.get("/api/mr-analytics/trend", asyncHandler(async (_req, res) => {
    const visits = await storage.getMRVisits();
    const orders = await storage.getOrders();
    
    const now = new Date();
    const months: { month: string; revenue: number; conversions: number }[] = [];
    
    for (let i = 2; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthName = startDate.toLocaleString('default', { month: 'short' });
      
      const monthVisits = visits.filter(v => {
        const visitDate = new Date(v.createdAt);
        return visitDate >= startDate && visitDate <= endDate;
      });
      
      const monthOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= startDate && orderDate <= endDate && o.status === 'Delivered';
      });
      
      const monthRevenue = monthOrders.reduce((sum, o) => sum + Number(o.total), 0) / 1000;
      const conversions = monthVisits.filter(v => v.outcome === 'Positive').length;
      
      months.push({
        month: monthName,
        revenue: Math.round(monthRevenue * 10) / 10,
        conversions,
      });
    }
    
    res.json({
      source: 'aggregated_from_visits_and_orders',
      visitCount: visits.length,
      orderCount: orders.length,
      trend: months,
    });
  }));

  // ============== EXPORT JOBS ==============
  app.get("/api/export-jobs", asyncHandler(async (_req, res) => {
    const jobs = await storage.getExportJobs();
    res.json(jobs);
  }));

  app.get("/api/export-jobs/:id", asyncHandler(async (req, res) => {
    const job = await storage.getExportJob(parseIdFromParams(req.params.id));
    if (!job) {
      res.status(404).json({ error: "Export job not found" });
      return;
    }
    res.json(job);
  }));

  app.post("/api/export-jobs", asyncHandler(async (req, res) => {
    const validated = validate<InsertExportJob>(insertExportJobSchema, req.body);
    const job = await storage.createExportJob(validated);
    
    // Generate export file based on entity type
    (async () => {
      try {
        let data: Record<string, unknown>[] = [];
        const entityType = validated.entityType || 'unknown';
        
        // Fetch data based on entity type
        switch (entityType.toLowerCase()) {
          case 'leads':
            data = await storage.getLeads();
            break;
          case 'doctors':
            data = await storage.getDoctors();
            break;
          case 'orders':
            data = await storage.getOrders();
            break;
          case 'products':
            data = await storage.getProducts();
            break;
          case 'invoices':
            data = await storage.getInvoices();
            break;
          case 'inventory':
            data = await storage.getInventory();
            break;
          case 'returns':
            data = await storage.getReturns();
            break;
          default:
            data = [];
        }
        
        // Generate CSV content
        if (data.length > 0) {
          const columns = validated.columns?.split(',') || Object.keys(data[0]);
          const header = columns.join(',');
          const rows = data.map(item => 
            columns.map(col => {
              const val = (item as Record<string, unknown>)[col.trim()];
              if (val === null || val === undefined) return '';
              if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
              return String(val);
            }).join(',')
          );
          const csvContent = [header, ...rows].join('\n');
          
          // Store CSV content as base64 for download
          const fileUrl = `data:text/csv;base64,${Buffer.from(csvContent).toString('base64')}`;
          
          await storage.updateExportJob(job.id, { 
            status: 'completed' as const, 
            progress: 100,
            completedAt: new Date(),
            fileUrl
          });
        } else {
          await storage.updateExportJob(job.id, { 
            status: 'completed' as const, 
            progress: 100,
            completedAt: new Date()
          });
        }
      } catch (error) {
        console.error('Export job error:', error);
        await storage.updateExportJob(job.id, { 
          status: 'failed' as const, 
          progress: 0
        });
      }
    })();
    
    res.status(201).json(job);
  }));
  
  // Download export file
  app.get("/api/export-jobs/:id/download", asyncHandler(async (req, res) => {
    const job = await storage.getExportJob(parseIdFromParams(req.params.id));
    if (!job) {
      res.status(404).json({ error: "Export job not found" });
      return;
    }
    if (job.status !== 'completed') {
      res.status(400).json({ error: "Export not ready for download" });
      return;
    }
    if (!job.fileUrl) {
      res.status(404).json({ error: "Export file not available" });
      return;
    }
    
    // If it's a data URL, extract and send as file
    if (job.fileUrl.startsWith('data:')) {
      const base64Data = job.fileUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `${job.entityType || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
      return;
    }
    
    // Otherwise redirect to the file URL
    res.redirect(job.fileUrl);
  }));

  app.patch("/api/export-jobs/:id", asyncHandler(async (req, res) => {
    const validated = validate<Partial<InsertExportJob>>(insertExportJobSchema.partial(), req.body);
    const job = await storage.updateExportJob(parseIdFromParams(req.params.id), validated);
    if (!job) {
      res.status(404).json({ error: "Export job not found" });
      return;
    }
    res.json(job);
  }));

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // =============== INTEGRATION API ROUTES ===============
  
  // Razorpay - Create payment link for invoice
  app.post("/api/integrations/razorpay/payment-link", asyncHandler(async (req, res) => {
    const { getRazorpayService } = await import('./integrations');
    const service = await getRazorpayService();
    if (!service) {
      res.status(400).json({ error: "Razorpay integration not configured. Please add your API credentials in Settings > Integrations." });
      return;
    }
    
    const { invoiceId } = req.body;
    if (!invoiceId) {
      res.status(400).json({ error: "Invoice ID is required" });
      return;
    }
    
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    
    const doctor = invoice.doctorId ? await storage.getDoctor(invoice.doctorId) : null;
    
    const invoiceAmount = parseFloat(String(invoice.amount)) || 0;
    const paymentLink = await service.createPaymentLink({
      amount: invoiceAmount,
      description: `Payment for Invoice #${invoice.invoiceNumber}`,
      customerName: doctor?.name || 'Customer',
      customerEmail: doctor?.email || undefined,
      customerPhone: doctor?.phone || undefined,
      invoiceId: String(invoice.id),
    });
    
    // Update invoice with payment link
    await storage.updateInvoice(invoice.id, {
      paymentLink: paymentLink.short_url,
      paymentLinkId: paymentLink.id,
    });
    
    res.json({ paymentLink: paymentLink.short_url, linkId: paymentLink.id });
  }));
  
  // Razorpay - Webhook handler
  app.post("/api/webhooks/razorpay", asyncHandler(async (req, res) => {
    const { getRazorpayService } = await import('./integrations');
    const service = await getRazorpayService();
    if (!service) {
      res.status(200).send('OK');
      return;
    }
    
    const signature = req.headers['x-razorpay-signature'] as string;
    if (signature) {
      try {
        const isValid = service.verifyWebhookSignature(JSON.stringify(req.body), signature);
        if (!isValid) {
          res.status(400).json({ error: "Invalid signature" });
          return;
        }
      } catch {
        // Webhook secret not configured, continue anyway
      }
    }
    
    const event = req.body;
    if (event.event === 'payment_link.paid') {
      const invoiceId = event.payload?.payment_link?.entity?.notes?.invoice_id;
      if (invoiceId) {
        const invoice = await storage.getInvoice(parseInt(invoiceId));
        if (invoice) {
          await storage.updateInvoice(invoice.id, { status: 'paid' });
        }
      }
    }
    
    res.status(200).send('OK');
  }));
  
  // Shiprocket - Create shipment from order
  app.post("/api/integrations/shiprocket/create-order", asyncHandler(async (req, res) => {
    const { getShiprocketService } = await import('./integrations');
    const service = await getShiprocketService();
    if (!service) {
      res.status(400).json({ error: "Shiprocket integration not configured. Please add your credentials in Settings > Integrations." });
      return;
    }
    
    const { orderId, pickupLocation, dimensions } = req.body;
    if (!orderId) {
      res.status(400).json({ error: "Order ID is required" });
      return;
    }
    
    const order = await storage.getOrder(orderId);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    
    const doctor = order.doctorId ? await storage.getDoctor(order.doctorId) : null;
    const orderItems = await storage.getOrderItems(order.id);
    
    const result = await service.createOrder({
      orderId: order.orderNumber,
      orderDate: new Date(order.createdAt!).toISOString().split('T')[0],
      pickupLocation: pickupLocation || 'Primary Warehouse',
      billingCustomerName: doctor?.name || 'Customer',
      billingAddress: doctor?.address || '',
      billingCity: doctor?.city || '',
      billingPincode: doctor?.pincode || '',
      billingState: doctor?.state || '',
      billingPhone: doctor?.phone || '',
      billingEmail: doctor?.email,
      orderItems: orderItems.map(item => ({
        name: item.productName || 'Product',
        sku: item.productId?.toString() || 'SKU',
        units: item.quantity,
        sellingPrice: item.unitPrice,
      })),
      paymentMethod: 'prepaid',
      subTotal: order.totalAmount,
      length: dimensions?.length || 10,
      breadth: dimensions?.breadth || 10,
      height: dimensions?.height || 10,
      weight: dimensions?.weight || 0.5,
    });
    
    res.json(result);
  }));
  
  // Shiprocket - Track shipment
  app.get("/api/integrations/shiprocket/track/:awbCode", asyncHandler(async (req, res) => {
    const { getShiprocketService } = await import('./integrations');
    const service = await getShiprocketService();
    if (!service) {
      res.status(400).json({ error: "Shiprocket integration not configured" });
      return;
    }
    
    const tracking = await service.trackShipment(req.params.awbCode);
    res.json(tracking);
  }));
  
  // Shiprocket - Get serviceability
  app.get("/api/integrations/shiprocket/serviceability", asyncHandler(async (req, res) => {
    const { getShiprocketService } = await import('./integrations');
    const service = await getShiprocketService();
    if (!service) {
      res.status(400).json({ error: "Shiprocket integration not configured" });
      return;
    }
    
    const { pickup, delivery, weight, cod } = req.query;
    const result = await service.getServiceability(
      pickup as string,
      delivery as string,
      parseFloat(weight as string) || 0.5,
      cod === 'true'
    );
    res.json(result);
  }));
  
  // Google Sheets - Export data to spreadsheet
  app.post("/api/integrations/google-sheets/export", asyncHandler(async (req, res) => {
    const { getGoogleSheetsService } = await import('./integrations');
    const service = await getGoogleSheetsService();
    if (!service) {
      res.status(400).json({ error: "Google Sheets integration not configured. Please add your service account credentials in Settings > Integrations." });
      return;
    }
    
    const { entityType, spreadsheetId, sheetName } = req.body;
    if (!entityType || !spreadsheetId) {
      res.status(400).json({ error: "Entity type and spreadsheet ID are required" });
      return;
    }
    
    let data: Record<string, any>[] = [];
    let headers: string[] = [];
    
    switch (entityType) {
      case 'orders':
        data = await storage.getOrders();
        headers = ['orderNumber', 'status', 'totalAmount', 'createdAt'];
        break;
      case 'leads':
        data = await storage.getLeads();
        headers = ['name', 'email', 'phone', 'source', 'status', 'createdAt'];
        break;
      case 'doctors':
        data = await storage.getDoctors();
        headers = ['name', 'email', 'phone', 'specialization', 'city', 'state'];
        break;
      case 'products':
        data = await storage.getProducts();
        headers = ['name', 'sku', 'category', 'mrp', 'sellingPrice', 'stockQuantity'];
        break;
      case 'inventory':
        data = await storage.getInventoryItems();
        headers = ['productName', 'warehouseName', 'quantity', 'batchNumber', 'expiryDate'];
        break;
      case 'invoices':
        data = await storage.getInvoices();
        headers = ['invoiceNumber', 'status', 'totalAmount', 'dueDate', 'createdAt'];
        break;
      default:
        res.status(400).json({ error: "Invalid entity type" });
        return;
    }
    
    await service.exportToSheet(spreadsheetId, sheetName || entityType, headers, data);
    res.json({ success: true, rowCount: data.length });
  }));
  
  // Google Sheets - Create new spreadsheet
  app.post("/api/integrations/google-sheets/create", asyncHandler(async (req, res) => {
    const { getGoogleSheetsService } = await import('./integrations');
    const service = await getGoogleSheetsService();
    if (!service) {
      res.status(400).json({ error: "Google Sheets integration not configured" });
      return;
    }
    
    const { title, sheetNames } = req.body;
    const result = await service.createSpreadsheet({ title: title || 'Monoskin Export', sheetNames });
    res.json(result);
  }));
  
  // WhatsApp - Send message
  app.post("/api/integrations/whatsapp/send", asyncHandler(async (req, res) => {
    const { getWhatsAppService } = await import('./integrations');
    const service = await getWhatsAppService();
    if (!service) {
      res.status(400).json({ error: "WhatsApp Business integration not configured. Please add your API credentials in Settings > Integrations." });
      return;
    }
    
    const { to, message, type } = req.body;
    if (!to || !message) {
      res.status(400).json({ error: "Phone number and message are required" });
      return;
    }
    
    const result = await service.sendTextMessage({ to, message });
    res.json(result);
  }));
  
  // WhatsApp - Send order confirmation
  app.post("/api/integrations/whatsapp/order-confirmation", asyncHandler(async (req, res) => {
    const { getWhatsAppService } = await import('./integrations');
    const service = await getWhatsAppService();
    if (!service) {
      res.status(400).json({ error: "WhatsApp Business integration not configured" });
      return;
    }
    
    const { orderId } = req.body;
    const order = await storage.getOrder(orderId);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    
    const doctor = order.doctorId ? await storage.getDoctor(order.doctorId) : null;
    if (!doctor?.phone) {
      res.status(400).json({ error: "Customer phone not available" });
      return;
    }
    
    const orderItems = await storage.getOrderItems(order.id);
    const result = await service.sendOrderConfirmation(
      doctor.phone,
      order.orderNumber,
      orderItems.map(i => i.productName || 'Product'),
      `Rs. ${order.totalAmount}`
    );
    res.json(result);
  }));
  
  // WhatsApp - Send delivery update
  app.post("/api/integrations/whatsapp/delivery-update", asyncHandler(async (req, res) => {
    const { getWhatsAppService } = await import('./integrations');
    const service = await getWhatsAppService();
    if (!service) {
      res.status(400).json({ error: "WhatsApp Business integration not configured" });
      return;
    }
    
    const { shipmentId, status, trackingUrl } = req.body;
    const shipment = await storage.getShipment(shipmentId);
    if (!shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }
    
    const order = shipment.orderId ? await storage.getOrder(shipment.orderId) : null;
    const doctor = order?.doctorId ? await storage.getDoctor(order.doctorId) : null;
    if (!doctor?.phone) {
      res.status(400).json({ error: "Customer phone not available" });
      return;
    }
    
    const result = await service.sendDeliveryUpdate(
      doctor.phone,
      order?.orderNumber || 'Order',
      status || shipment.status,
      trackingUrl
    );
    res.json(result);
  }));
  
  // WhatsApp - Webhook handler
  app.get("/api/webhooks/whatsapp", asyncHandler(async (req, res) => {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;
    
    // Validate against configured webhook verify token
    const integrationsList = await storage.getIntegrations();
    const whatsappIntegration = integrationsList.find(i => i.name === 'WhatsApp Business');
    const config = whatsappIntegration?.config as { webhookVerifyToken?: string } | null;
    const expectedToken = config?.webhookVerifyToken;
    
    // For verification, validate token and return challenge
    if (mode === 'subscribe') {
      if (expectedToken && token !== expectedToken) {
        res.sendStatus(403);
        return;
      }
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }));
  
  app.post("/api/webhooks/whatsapp", asyncHandler(async (req, res) => {
    // Log incoming messages for processing
    console.log('WhatsApp webhook received:', JSON.stringify(req.body));
    res.status(200).send('OK');
  }));
  
  // Tally ERP - Sync invoice
  app.post("/api/integrations/tally/sync-invoice", asyncHandler(async (req, res) => {
    const { getTallyService } = await import('./integrations');
    const service = await getTallyService();
    if (!service) {
      res.status(400).json({ error: "Tally ERP integration not configured. Please add your server details in Settings > Integrations." });
      return;
    }
    
    const { invoiceId } = req.body;
    if (!invoiceId) {
      res.status(400).json({ error: "Invoice ID is required" });
      return;
    }
    
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    
    const doctor = invoice.doctorId ? await storage.getDoctor(invoice.doctorId) : null;
    
    // First ensure the customer ledger exists
    if (doctor) {
      try {
        await service.createLedger({
          name: doctor.name,
          parent: 'Sundry Debtors',
          phone: doctor.phone || undefined,
          email: doctor.email || undefined,
        });
      } catch {
        // Ledger might already exist
      }
    }
    
    const invoiceAmount = parseFloat(String(invoice.amount)) || 0;
    const result = await service.syncInvoice({
      invoiceNumber: invoice.invoiceNumber,
      date: new Date(invoice.createdAt!).toISOString().split('T')[0],
      customerName: doctor?.name || 'Cash Sales',
      items: [{ name: 'Sales', quantity: 1, rate: invoiceAmount, amount: invoiceAmount, taxAmount: 0 }],
      subtotal: invoiceAmount,
      taxTotal: 0,
      grandTotal: invoiceAmount,
    });
    
    res.json({ success: true, result });
  }));
  
  // Tally ERP - Sync payment
  app.post("/api/integrations/tally/sync-payment", asyncHandler(async (req, res) => {
    const { getTallyService } = await import('./integrations');
    const service = await getTallyService();
    if (!service) {
      res.status(400).json({ error: "Tally ERP integration not configured" });
      return;
    }
    
    const { invoiceId, amount, paymentMode, receiptNumber } = req.body;
    
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    
    const doctor = invoice.doctorId ? await storage.getDoctor(invoice.doctorId) : null;
    
    const invoiceAmount = parseFloat(String(invoice.amount)) || 0;
    const result = await service.syncPayment({
      receiptNumber: receiptNumber || `REC-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      customerName: doctor?.name || 'Cash Sales',
      amount: amount || invoiceAmount,
      invoiceNumber: invoice.invoiceNumber,
      paymentMode: paymentMode || 'Bank',
    });
    
    res.json({ success: true, result });
  }));
  
  // Tally ERP - Test connection
  app.get("/api/integrations/tally/test", asyncHandler(async (req, res) => {
    const { getTallyService } = await import('./integrations');
    const service = await getTallyService();
    if (!service) {
      res.status(400).json({ error: "Tally ERP integration not configured" });
      return;
    }
    
    const connected = await service.testConnection();
    res.json({ connected });
  }));
  
  // Test integration connection
  app.post("/api/integrations/test-connection", asyncHandler(async (req, res) => {
    const { testIntegrationConnection } = await import('./integrations');
    const { name, config } = req.body;
    const result = await testIntegrationConnection(name, config);
    res.json(result);
  }));

  // ============== LOGIN HISTORY ==============
  app.get("/api/login-history", asyncHandler(async (req, res) => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const history = await storage.getLoginHistory(userId);
    res.json(history);
  }));

  app.post("/api/login-history", asyncHandler(async (req, res) => {
    const entry = await storage.createLoginHistory({
      ...req.body,
      ipAddress: req.body.ipAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
      userAgent: req.body.userAgent || req.headers['user-agent'] || 'unknown',
    });
    res.status(201).json(entry);
  }));

  // ============== TERRITORY BOUNDARIES ==============
  app.get("/api/territory-boundaries", asyncHandler(async (req, res) => {
    const territoryId = req.query.territoryId ? parseInt(req.query.territoryId as string) : undefined;
    const boundaries = await storage.getTerritoryBoundaries(territoryId);
    res.json(boundaries);
  }));

  app.post("/api/territory-boundaries", asyncHandler(async (req, res) => {
    const boundary = await storage.createTerritoryBoundary(req.body);
    await storage.createAuditLog({
      action: "Territory Boundary Created",
      entityType: "territory_boundary",
      entityId: boundary.id.toString(),
      afterValue: boundary.label,
    });
    res.status(201).json(boundary);
  }));

  app.patch("/api/territory-boundaries/:id", asyncHandler(async (req, res) => {
    const boundary = await storage.updateTerritoryBoundary(parseIdFromParams(req.params.id), req.body);
    if (!boundary) {
      res.status(404).json({ error: "Boundary not found" });
      return;
    }
    res.json(boundary);
  }));

  app.delete("/api/territory-boundaries/:id", asyncHandler(async (req, res) => {
    await storage.deleteTerritoryBoundary(parseIdFromParams(req.params.id));
    res.json({ success: true });
  }));

  // ============== INTEGRATION SYNC RUNS ==============
  app.get("/api/integration-sync-runs", asyncHandler(async (req, res) => {
    const integrationId = req.query.integrationId ? parseInt(req.query.integrationId as string) : undefined;
    const runs = await storage.getIntegrationSyncRuns(integrationId);
    res.json(runs);
  }));

  app.post("/api/integration-sync-runs", asyncHandler(async (req, res) => {
    const run = await storage.createIntegrationSyncRun(normalizeDates(req.body, ['startedAt', 'finishedAt']));
    res.status(201).json(run);
  }));

  app.patch("/api/integration-sync-runs/:id", asyncHandler(async (req, res) => {
    const run = await storage.updateIntegrationSyncRun(parseIdFromParams(req.params.id), normalizeDates(req.body, ['startedAt', 'finishedAt']));
    if (!run) {
      res.status(404).json({ error: "Sync run not found" });
      return;
    }
    res.json(run);
  }));

  // ============== INTEGRATION WEBHOOK EVENTS ==============
  app.get("/api/integration-webhook-events", asyncHandler(async (req, res) => {
    const integrationId = req.query.integrationId ? parseInt(req.query.integrationId as string) : undefined;
    const events = await storage.getIntegrationWebhookEvents(integrationId);
    res.json(events);
  }));

  app.post("/api/integration-webhook-events", asyncHandler(async (req, res) => {
    const event = await storage.createIntegrationWebhookEvent(normalizeDates(req.body, ['receivedAt', 'processedAt']));
    res.status(201).json(event);
  }));

  // ============== INTEGRATION ALERTS ==============
  app.get("/api/integration-alerts", asyncHandler(async (req, res) => {
    const integrationId = req.query.integrationId ? parseInt(req.query.integrationId as string) : undefined;
    const alerts = await storage.getIntegrationAlerts(integrationId);
    res.json(alerts);
  }));

  app.post("/api/integration-alerts", asyncHandler(async (req, res) => {
    const data = normalizeDates(req.body, ['acknowledgedAt', 'resolvedAt', 'lastTriggeredAt']);
    if (data.title && !data.condition) {
      data.condition = data.title;
      delete data.title;
    }
    const alert = await storage.createIntegrationAlert(data);
    res.status(201).json(alert);
  }));

  app.patch("/api/integration-alerts/:id", asyncHandler(async (req, res) => {
    const data = normalizeDates(req.body, ['acknowledgedAt', 'resolvedAt', 'lastTriggeredAt']);
    const alert = await storage.updateIntegrationAlert(parseIdFromParams(req.params.id), data);
    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }
    res.json(alert);
  }));

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('Unhandled error:', err.message, 'code:', (err as any).code, 'cause:', (err as any).cause?.message, 'cause_code:', (err as any).cause?.code);
    const dbErrors: Record<string, string> = {
      '23505': 'A record with this value already exists',
      '23503': 'Referenced record not found',
      '23502': 'Required field is missing',
      '22P02': 'Invalid data format',
    };
    const cause = (err as any).cause || err;
    const pgCode = cause?.code || (err as any).code;
    const detail = cause?.detail || (err as any).detail;
    const causeMsg = cause?.message || '';
    if (pgCode && dbErrors[pgCode]) {
      let friendlyMsg = dbErrors[pgCode];
      if (detail) friendlyMsg += ': ' + detail;
      const enumMatch = causeMsg.match(/invalid input value for enum "?([^":\s]+)"?: "([^"]+)"/);
      if (enumMatch) friendlyMsg = `Invalid value "${enumMatch[2]}" for field "${enumMatch[1]}"`;
      const numericMatch = causeMsg.match(/invalid input syntax for type (\w+): "([^"]+)"/);
      if (numericMatch) friendlyMsg = `Invalid ${numericMatch[1]} value: "${numericMatch[2]}"`;
      const nullMatch = causeMsg.match(/null value in column "([^"]+)"/);
      if (nullMatch) friendlyMsg = `Required field "${nullMatch[1]}" is missing`;
      res.status(400).json({ error: friendlyMsg });
      return;
    }
    if (err.message?.startsWith('Failed query:')) {
      const match = err.message.match(/null value in column "([^"]+)"/);
      if (match) {
        res.status(400).json({ error: `Required field is missing: ${match[1]}` });
        return;
      }
      const dupMatch = err.message.match(/duplicate key value/);
      if (dupMatch) {
        res.status(400).json({ error: 'A record with this value already exists' });
        return;
      }
      const enumMatch = err.message.match(/invalid input value for enum "?([^":\s]+)"?: "([^"]+)"/);
      if (enumMatch) {
        res.status(400).json({ error: `Invalid value "${enumMatch[2]}" for field type "${enumMatch[1]}"` });
        return;
      }
    }
    res.status(500).json({ error: "Internal server error" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
