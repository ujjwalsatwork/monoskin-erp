import { pgTable, text, serial, integer, boolean, timestamp, numeric, jsonb, varchar, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum('role', [
  'Super Admin',
  'Admin Ops', 
  'Warehouse Manager',
  'Warehouse Staff',
  'Logistics Manager',
  'Finance Manager',
  'Finance Staff',
  'Sales Manager',
  'Medical Representative',
  'HR/Compliance',
  'Analytics Viewer'
]);

export const leadStageEnum = pgEnum('lead_stage', ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Sent to MR', 'Converted', 'Lost']);
export const leadPriorityEnum = pgEnum('lead_priority', ['High', 'Medium', 'Low']);
export const leadSourceEnum = pgEnum('lead_source', ['Referral', 'Conference', 'Website', 'Cold Call', 'Other']);

export const orderStatusEnum = pgEnum('order_status', ['Draft', 'Pending Approval', 'Approved', 'Picking', 'Packed', 'Dispatched', 'In Transit', 'Delivered', 'Cancelled', 'On Hold']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['Pending', 'Paid', 'Overdue', 'Cancelled', 'Partially Paid']);
export const approvalStatusEnum = pgEnum('approval_status', ['Pending', 'Approved', 'Rejected']);
export const approvalTypeEnum = pgEnum('approval_type', ['Credit Limit', 'Price Override', 'Stock Adjustment', 'Return Request', 'Discount Override', 'Order Exception']);

export const shipmentStatusEnum = pgEnum('shipment_status', ['Pending', 'Ready for Dispatch', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed', 'Returned']);
export const transferStatusEnum = pgEnum('transfer_status', ['Pending Dispatch', 'In Transit', 'Completed', 'Cancelled']);
export const grnStatusEnum = pgEnum('grn_status', ['Pending Verification', 'Partially Verified', 'Completed', 'Discrepancy Reported']);

export const promoCodeTypeEnum = pgEnum('promo_code_type', ['Percentage', 'Fixed']);
export const promoCodeStatusEnum = pgEnum('promo_code_status', ['Active', 'Paused', 'Scheduled', 'Expired']);
export const purposeChannelEnum = pgEnum('purpose_channel', ['Both', 'Online', 'Doctor/Pharmacy']);
export const schemeStackabilityEnum = pgEnum('scheme_stackability', ['Allow', 'Block']);

export const clinicCodeTypeEnum = pgEnum('clinic_code_type', ['Bulk', 'Retail']);
export const clinicCodeStatusEnum = pgEnum('clinic_code_status', ['Active', 'Paused', 'Processing', 'Deactivated']);

export const importanceEnum = pgEnum('importance', ['High', 'Medium', 'Low']);
export const notificationCategoryEnum = pgEnum('notification_category', ['Approvals', 'Inventory', 'Logistics', 'Finance', 'Security', 'Orders', 'CRM']);

// ============== USERS & AUTHENTICATION ==============
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: roleEnum("role").notNull().default('Analytics Viewer'),
  roleTemplateId: integer("role_template_id"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============== PRODUCTS ==============
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  category: text("category").notNull(),
  hsnCode: varchar("hsn_code", { length: 20 }).notNull(),
  gst: numeric("gst", { precision: 5, scale: 2 }).notNull(),
  mrp: numeric("mrp", { precision: 12, scale: 2 }).notNull(),
  packSize: text("pack_size"),
  shelfLife: integer("shelf_life"),
  barcode: varchar("barcode", { length: 50 }),
  minStockThreshold: integer("min_stock_threshold").default(0),
  description: text("description"),
  brochureUrl: text("brochure_url"),
  clinicalIndications: text("clinical_indications").array(),
  avgMonthlySales3m: numeric("avg_monthly_sales_3m", { precision: 12, scale: 2 }),
  avgMonthlySales6m: numeric("avg_monthly_sales_6m", { precision: 12, scale: 2 }),
  avgMonthlySales12m: numeric("avg_monthly_sales_12m", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============== WAREHOUSES & INVENTORY ==============
export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  address: text("address"),
  capacity: integer("capacity").notNull(),
  managerId: integer("manager_id").references(() => users.id),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  batch: varchar("batch", { length: 50 }).notNull(),
  expiry: date("expiry").notNull(),
  available: integer("available").notNull().default(0),
  reserved: integer("reserved").notNull().default(0),
  total: integer("total").notNull().default(0),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============== PRICING ==============
export const pricingSlabs = pgTable("pricing_slabs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  discount: numeric("discount", { precision: 5, scale: 2 }).notNull(),
  minOrderValue: numeric("min_order_value", { precision: 12, scale: 2 }),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============== DOCTORS & PHARMACIES ==============
export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  specialization: text("specialization"),
  designation: text("designation"),
  clinic: text("clinic"),
  city: text("city").notNull(),
  state: text("state"),
  address: text("address"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  receptionistName: text("receptionist_name"),
  receptionistPhone: text("receptionist_phone"),
  email: text("email"),
  gstin: varchar("gstin", { length: 20 }),
  profilePhoto: text("profile_photo"),
  clinicImages: text("clinic_images").array(),
  website: text("website"),
  socialLinkedIn: text("social_linkedin"),
  socialFacebook: text("social_facebook"),
  socialTwitter: text("social_twitter"),
  socialInstagram: text("social_instagram"),
  googleMapsUrl: text("google_maps_url"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  nearbyChemistName: text("nearby_chemist_name"),
  nearbyChemistPhone: text("nearby_chemist_phone"),
  nearbyChemistAddress: text("nearby_chemist_address"),
  pricingSlabId: integer("pricing_slab_id").references(() => pricingSlabs.id),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).default("0"),
  outstanding: numeric("outstanding", { precision: 12, scale: 2 }).default("0"),
  importance: importanceEnum("importance").default('Medium'),
  assignedMRId: integer("assigned_mr_id").references(() => mrs.id),
  isActive: boolean("is_active").notNull().default(true),
  lastContactedAt: timestamp("last_contacted_at"),
  totalSalesValue: numeric("total_sales_value", { precision: 14, scale: 2 }).default("0"),
  businessCardUrl: text("business_card_url"),
  tags: text("tags").array(),
  tier: integer("tier"),
  nextVisitNotes: text("next_visit_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pharmacies = pgTable("pharmacies", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  city: text("city").notNull(),
  state: text("state"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  gstin: varchar("gstin", { length: 20 }),
  pricingSlabId: integer("pricing_slab_id").references(() => pricingSlabs.id),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).default("0"),
  outstanding: numeric("outstanding", { precision: 12, scale: 2 }).default("0"),
  importance: importanceEnum("importance").default("Medium"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  lastOrderDate: date("last_order_date"),
  lastPaymentDate: date("last_payment_date"),
  conversionFailures: integer("conversion_failures").default(0),
  engagementScore: integer("engagement_score").default(50),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============== LEADS ==============
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  designation: text("designation"),
  specialization: text("specialization"),
  clinic: text("clinic"),
  city: text("city").notNull(),
  state: text("state"),
  address: text("address"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  receptionistName: text("receptionist_name"),
  receptionistPhone: text("receptionist_phone"),
  email: text("email"),
  profilePhoto: text("profile_photo"),
  clinicImages: text("clinic_images").array(),
  website: text("website"),
  socialLinkedIn: text("social_linkedin"),
  socialFacebook: text("social_facebook"),
  socialTwitter: text("social_twitter"),
  socialInstagram: text("social_instagram"),
  googleMapsUrl: text("google_maps_url"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  nearbyChemistName: text("nearby_chemist_name"),
  nearbyChemistPhone: text("nearby_chemist_phone"),
  nearbyChemistAddress: text("nearby_chemist_address"),
  stage: leadStageEnum("stage").notNull().default('New'),
  priority: leadPriorityEnum("priority").default('Medium'),
  source: leadSourceEnum("source"),
  assignedMRId: integer("assigned_mr_id").references(() => mrs.id),
  nextFollowUp: date("next_follow_up"),
  notes: text("notes"),
  businessCardUrl: text("business_card_url"),
  convertedDoctorId: integer("converted_doctor_id").references(() => doctors.id),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============== ORDERS ==============
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 30 }).notNull().unique(),
  doctorId: integer("doctor_id").references(() => doctors.id),
  pharmacyId: integer("pharmacy_id").references(() => pharmacies.id),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  status: orderStatusEnum("status").notNull().default('Draft'),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  clinicCodeId: integer("clinic_code_id").references(() => clinicCodes.id),
  promoCodeId: integer("promo_code_id").references(() => promoCodes.id),
  mrId: integer("mr_id").references(() => users.id),
  shippingAddress: text("shipping_address"),
  notes: text("notes"),
  reasonTag: text("reason_tag").default('Doctor Request'),
  deliveredAt: timestamp("delivered_at"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  inventoryId: integer("inventory_id").references(() => inventory.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============== INVOICES & PAYMENTS ==============
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 30 }).notNull().unique(),
  orderId: integer("order_id").references(() => orders.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  pharmacyId: integer("pharmacy_id").references(() => pharmacies.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).default("0"),
  status: invoiceStatusEnum("status").notNull().default('Pending'),
  dueDate: date("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  paymentLink: text("payment_link"),
  paymentLinkId: text("payment_link_id"),
  creationSource: text("creation_source").default('manually_created'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const paymentAllocationStatusEnum = pgEnum('payment_allocation_status', ['unallocated', 'partial', 'full']);
export const paymentCollectionSourceEnum = pgEnum('payment_collection_source', ['MR', 'NEFT', 'Cheque', 'UPI', 'Cash', 'Field Rep', 'Online']);
export const paymentStatusEnum = pgEnum('payment_status', ['Pending', 'Verified', 'Allocated', 'Bounced', 'Refunded']);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  referenceNumber: text("reference_number"),
  collectionSource: paymentCollectionSourceEnum("collection_source"),
  allocationStatus: paymentAllocationStatusEnum("allocation_status").default('unallocated'),
  status: paymentStatusEnum("status").default('Pending'),
  allocatedAmount: numeric("allocated_amount", { precision: 12, scale: 2 }).default('0'),
  receivedById: integer("received_by_id").references(() => users.id),
  collectedById: integer("collected_by_id").references(() => users.id),
  notes: text("notes"),
  gstImpact: text("gst_impact"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============== APPROVALS ==============
export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  type: approvalTypeEnum("type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  status: approvalStatusEnum("status").notNull().default('Pending'),
  requestedById: integer("requested_by_id").references(() => users.id),
  requestReason: text("request_reason"),
  beforeValue: text("before_value"),
  afterValue: text("after_value"),
  approvedById: integer("approved_by_id").references(() => users.id),
  approvalReason: text("approval_reason"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============== SHIPMENTS ==============
export const carriers = pgTable("carriers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  phone: text("phone"),
  email: text("email"),
  trackingUrlTemplate: text("tracking_url_template"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  status: shipmentStatusEnum("status").notNull().default('Pending'),
  carrierId: integer("carrier_id").references(() => carriers.id),
  trackingId: varchar("tracking_id", { length: 100 }),
  weight: numeric("weight", { precision: 8, scale: 2 }),
  packages: integer("packages"),
  sealNumber: varchar("seal_number", { length: 50 }),
  labelUrl: text("label_url"),
  packageProof: text("package_proof").array(),
  dispatchedAt: timestamp("dispatched_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const shipmentEvents = pgTable("shipment_events", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const discrepancyTickets = pgTable("discrepancy_tickets", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull().references(() => shipments.id),
  reportedQty: integer("reported_qty").notNull(),
  expectedQty: integer("expected_qty").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default('Open'),
  evidence: text("evidence").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// ============== WAREHOUSE OPERATIONS ==============
export const grns = pgTable("grns", {
  id: serial("id").primaryKey(),
  grnNumber: varchar("grn_number", { length: 30 }).notNull().unique(),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  supplier: text("supplier").notNull(),
  status: grnStatusEnum("status").notNull().default('Pending Verification'),
  purchaseOrderRef: text("purchase_order_ref"),
  receivedById: integer("received_by_id").references(() => users.id),
  notes: text("notes"),
  attachments: text("attachments").array(),
  reasonTag: text("reason_tag").default('Restock'),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const grnItems = pgTable("grn_items", {
  id: serial("id").primaryKey(),
  grnId: integer("grn_id").notNull().references(() => grns.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  batch: varchar("batch", { length: 50 }).notNull(),
  expiry: date("expiry").notNull(),
  expectedQty: integer("expected_qty").notNull(),
  receivedQty: integer("received_qty").notNull(),
  damagedQty: integer("damaged_qty").default(0),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  transferNumber: varchar("transfer_number", { length: 30 }).notNull().unique(),
  fromWarehouseId: integer("from_warehouse_id").notNull().references(() => warehouses.id),
  toWarehouseId: integer("to_warehouse_id").notNull().references(() => warehouses.id),
  status: transferStatusEnum("status").notNull().default('Pending Dispatch'),
  notes: text("notes"),
  reasonTag: text("reason_tag"),
  proofOfDelivery: text("proof_of_delivery").array(),
  createdById: integer("created_by_id").references(() => users.id),
  dispatchedAt: timestamp("dispatched_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transferItems = pgTable("transfer_items", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").notNull().references(() => transfers.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  inventoryId: integer("inventory_id").references(() => inventory.id),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============== PROMO CODES & CLINIC CODES ==============
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discount: numeric("discount", { precision: 5, scale: 2 }).notNull(),
  type: promoCodeTypeEnum("type").notNull(),
  status: promoCodeStatusEnum("status").notNull().default('Active'),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  perCustomerLimit: integer("per_customer_limit"),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to").notNull(),
  purposeChannel: purposeChannelEnum("purpose_channel").default('Both'),
  schemeStackability: schemeStackabilityEnum("scheme_stackability").default('Allow'),
  eligibleProducts: integer("eligible_products").array(),
  eligibleCategories: text("eligible_categories").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const clinicCodes = pgTable("clinic_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  type: clinicCodeTypeEnum("type").notNull(),
  doctorId: integer("doctor_id").notNull().references(() => doctors.id),
  promoCodeId: integer("promo_code_id").references(() => promoCodes.id),
  discount: numeric("discount", { precision: 5, scale: 2 }).notNull(),
  status: clinicCodeStatusEnum("status").notNull().default('Processing'),
  usageCount: integer("usage_count").notNull().default(0),
  sharedCount: integer("shared_count").notNull().default(0),
  convertedToOrders: integer("converted_to_orders").notNull().default(0),
  totalRevenue: numeric("total_revenue", { precision: 12, scale: 2 }).default("0"),
  avgOrderValue: numeric("avg_order_value", { precision: 12, scale: 2 }).default("0"),
  qrAssetUrl: text("qr_asset_url"),
  printPdfUrl: text("print_pdf_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const clinicCodeEvents = pgTable("clinic_code_events", {
  id: serial("id").primaryKey(),
  clinicCodeId: integer("clinic_code_id").notNull().references(() => clinicCodes.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  orderId: integer("order_id").references(() => orders.id),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============== SCHEMES ==============
export const schemeTypeEnum = pgEnum('scheme_type', ['percentage', 'buyXgetY', 'bundle', 'fixed']);
export const schemeStatusEnum = pgEnum('scheme_status', ['Active', 'Paused', 'Scheduled', 'Expired']);

export const schemes = pgTable("schemes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: schemeTypeEnum("type").notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"),
  buyQty: integer("buy_qty"),
  getQty: integer("get_qty"),
  applicableProducts: integer("applicable_products").array(),
  excludedProducts: integer("excluded_products").array(),
  minOrderValue: numeric("min_order_value", { precision: 12, scale: 2 }),
  maxDiscount: numeric("max_discount", { precision: 12, scale: 2 }),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to").notNull(),
  status: schemeStatusEnum("status").notNull().default('Active'),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============== RETURNS ==============
export const returns = pgTable("returns", {
  id: serial("id").primaryKey(),
  returnNumber: varchar("return_number", { length: 30 }).notNull().unique(),
  orderId: integer("order_id").references(() => orders.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  status: text("status").notNull().default('Pending'),
  reason: text("reason"),
  approvalId: integer("approval_id").references(() => approvals.id),
  receivedAt: timestamp("received_at"),
  processedAt: timestamp("processed_at"),
  photos: text("photos").array(),
  inspectorRemarks: text("inspector_remarks"),
  internalNotes: text("internal_notes"),
  inspectionChecklist: text("inspection_checklist"),
  pickupPartner: text("pickup_partner"),
  pickupScheduledAt: timestamp("pickup_scheduled_at"),
  pickupCompletedAt: timestamp("pickup_completed_at"),
  creditNoteId: integer("credit_note_id"),
  resolutionType: text("resolution_type"),
  inventoryAdjusted: boolean("inventory_adjusted").default(false),
  inventoryAdjustedAt: timestamp("inventory_adjusted_at"),
  inventoryAdjustedBy: integer("inventory_adjusted_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const returnItems = pgTable("return_items", {
  id: serial("id").primaryKey(),
  returnId: integer("return_id").notNull().references(() => returns.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============== NOTIFICATIONS ==============
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: notificationCategoryEnum("category").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============== AUDIT & ACCESS LOGS ==============
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  userId: integer("user_id").references(() => users.id),
  userEmail: text("user_email"),
  reason: text("reason"),
  beforeValue: text("before_value"),
  afterValue: text("after_value"),
  ipAddress: text("ip_address"),
  geoLocation: text("geo_location"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accessLogs = pgTable("access_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  field: text("field"),
  userId: integer("user_id").references(() => users.id),
  userEmail: text("user_email"),
  ipAddress: text("ip_address").notNull(),
  geoLocation: text("geo_location"),
  userAgent: text("user_agent"),
  isSuspicious: boolean("is_suspicious").default(false),
  suspiciousReason: text("suspicious_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============== MR (MEDICAL REPRESENTATIVES) ==============
export const mrStatusEnum = pgEnum('mr_status', ['Active', 'Inactive', 'On Leave']);
export const mrManagerRoleEnum = pgEnum('mr_manager_role', ['ASM', 'RSM']);
export const mrVisitTypeEnum = pgEnum('mr_visit_type', ['Lead Visit', 'Doctor Visit', 'Pharmacy Visit', 'Conference', 'Training']);
export const mrVisitOutcomeEnum = pgEnum('mr_visit_outcome', ['Positive', 'Neutral', 'Negative', 'Follow-up Required']);
export const mrAttendanceStatusEnum = pgEnum('mr_attendance_status', ['Present', 'Absent', 'Half Day', 'Leave', 'Holiday']);
export const mrTargetTypeEnum = pgEnum('mr_target_type', ['Revenue', 'Conversions', 'Visits', 'New Leads']);
export const mrTargetStatusEnum = pgEnum('mr_target_status', ['On Track', 'At Risk', 'Achieved', 'Missed']);

export const mrs = pgTable("mrs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  employeeId: varchar("employee_id", { length: 50 }).notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  territory: text("territory").notNull(),
  region: text("region").notNull(),
  reportingManager: text("reporting_manager").notNull(),
  managerRole: mrManagerRoleEnum("manager_role").notNull().default('ASM'),
  status: mrStatusEnum("status").notNull().default('Active'),
  joiningDate: date("joining_date").notNull(),
  leadsAssigned: integer("leads_assigned").notNull().default(0),
  leadsUpdatedToday: integer("leads_updated_today").notNull().default(0),
  visitsLogged: integer("visits_logged").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  ordersAttributed: integer("orders_attributed").notNull().default(0),
  revenueAttributed: numeric("revenue_attributed", { precision: 15, scale: 2 }).notNull().default('0'),
  lastActivity: timestamp("last_activity"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mrVisits = pgTable("mr_visits", {
  id: serial("id").primaryKey(),
  mrId: integer("mr_id").notNull().references(() => mrs.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").references(() => leads.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  visitType: mrVisitTypeEnum("visit_type").notNull(),
  outcome: mrVisitOutcomeEnum("outcome").notNull(),
  notes: text("notes"),
  attachments: text("attachments").array(),
  location: text("location"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mrAttendance = pgTable("mr_attendance", {
  id: serial("id").primaryKey(),
  mrId: integer("mr_id").notNull().references(() => mrs.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: mrAttendanceStatusEnum("status").notNull(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mrTargets = pgTable("mr_targets", {
  id: serial("id").primaryKey(),
  mrId: integer("mr_id").notNull().references(() => mrs.id, { onDelete: "cascade" }),
  period: varchar("period", { length: 20 }).notNull(),
  targetType: mrTargetTypeEnum("target_type").notNull(),
  targetValue: numeric("target_value", { precision: 15, scale: 2 }).notNull(),
  achievedValue: numeric("achieved_value", { precision: 15, scale: 2 }).notNull().default('0'),
  incentiveEarned: numeric("incentive_earned", { precision: 15, scale: 2 }).notNull().default('0'),
  status: mrTargetStatusEnum("status").notNull().default('On Track'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============== INSERT SCHEMAS ==============
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDoctorSchema = createInsertSchema(doctors).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPharmacySchema = createInsertSchema(pharmacies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });

// ============== LEAD ACTIVITIES ==============
export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  outcome: text("outcome"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const insertLeadActivitySchema = createInsertSchema(leadActivities).omit({ id: true, createdAt: true });
export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = z.infer<typeof insertLeadActivitySchema>;

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApprovalSchema = createInsertSchema(approvals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShipmentSchema = createInsertSchema(shipments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGRNSchema = createInsertSchema(grns).omit({ id: true, createdAt: true });
export const insertTransferSchema = createInsertSchema(transfers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClinicCodeSchema = createInsertSchema(clinicCodes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPricingSlabSchema = createInsertSchema(pricingSlabs).omit({ id: true, createdAt: true });
export const insertCarrierSchema = createInsertSchema(carriers).omit({ id: true, createdAt: true });
export const insertSchemeSchema = createInsertSchema(schemes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({ id: true, createdAt: true });
export const insertMRSchema = createInsertSchema(mrs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMRVisitSchema = createInsertSchema(mrVisits).omit({ id: true, createdAt: true });
export const insertMRAttendanceSchema = createInsertSchema(mrAttendance).omit({ id: true, createdAt: true });
export const insertMRTargetSchema = createInsertSchema(mrTargets).omit({ id: true, createdAt: true, updatedAt: true });

// ============== TYPES ==============
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = typeof warehouses.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;
export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = typeof doctors.$inferInsert;
export type Pharmacy = typeof pharmacies.$inferSelect;
export type InsertPharmacy = typeof pharmacies.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;
export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = typeof approvals.$inferInsert;
export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = typeof shipments.$inferInsert;
export type GRN = typeof grns.$inferSelect;
export type InsertGRN = typeof grns.$inferInsert;
export type GRNItem = typeof grnItems.$inferSelect;
export type InsertGRNItem = typeof grnItems.$inferInsert;
export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = typeof transfers.$inferInsert;
export type TransferItem = typeof transferItems.$inferSelect;
export type InsertTransferItem = typeof transferItems.$inferInsert;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = typeof promoCodes.$inferInsert;
export type ClinicCode = typeof clinicCodes.$inferSelect;
export type InsertClinicCode = typeof clinicCodes.$inferInsert;
export type PricingSlab = typeof pricingSlabs.$inferSelect;
export type InsertPricingSlab = typeof pricingSlabs.$inferInsert;
export type Carrier = typeof carriers.$inferSelect;
export type InsertCarrier = typeof carriers.$inferInsert;
export type Scheme = typeof schemes.$inferSelect;
export type InsertScheme = typeof schemes.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = typeof accessLogs.$inferInsert;
export const insertReturnSchema = createInsertSchema(returns).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReturnItemSchema = createInsertSchema(returnItems).omit({ id: true, createdAt: true });
export type Return = typeof returns.$inferSelect;
export type InsertReturn = typeof returns.$inferInsert;
export type ReturnItem = typeof returnItems.$inferSelect;
export type InsertReturnItem = typeof returnItems.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type MR = typeof mrs.$inferSelect;
export type InsertMR = typeof mrs.$inferInsert;
export type MRVisit = typeof mrVisits.$inferSelect;
export type InsertMRVisit = typeof mrVisits.$inferInsert;
export type MRAttendance = typeof mrAttendance.$inferSelect;
export type InsertMRAttendance = typeof mrAttendance.$inferInsert;
export type MRTarget = typeof mrTargets.$inferSelect;
export type InsertMRTarget = typeof mrTargets.$inferInsert;

// ============== EMPLOYEES ==============
export const employeeStatusEnum = pgEnum('employee_status', ['Active', 'Inactive', 'On Leave', 'Terminated']);
export const departmentEnum = pgEnum('department', ['Sales', 'Operations', 'Finance', 'HR', 'Admin', 'Warehouse', 'Logistics', 'IT']);
export const employmentTypeEnum = pgEnum('employment_type', ['Full-time', 'Part-time', 'Contract', 'Intern']);

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeCode: varchar("employee_code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  department: departmentEnum("department").notNull(),
  territory: varchar("territory", { length: 100 }),
  reportingManager: varchar("reporting_manager", { length: 255 }),
  status: employeeStatusEnum("status").notNull().default('Active'),
  employmentType: employmentTypeEnum("employment_type").default('Full-time'),
  workLocation: varchar("work_location", { length: 255 }),
  profilePhotoUrl: varchar("profile_photo_url", { length: 500 }),
  joiningDate: timestamp("joining_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true });
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

// ============== HR ATTENDANCE ==============
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'half-day', 'leave', 'holiday']);

export const hrAttendance = pgTable("hr_attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  date: timestamp("date").notNull(),
  checkIn: varchar("check_in", { length: 10 }),
  checkOut: varchar("check_out", { length: 10 }),
  status: attendanceStatusEnum("status").notNull(),
  workHours: numeric("work_hours", { precision: 4, scale: 1 }).default('0'),
  location: varchar("location", { length: 255 }),
  checkInLatitude: numeric("check_in_latitude", { precision: 10, scale: 7 }),
  checkInLongitude: numeric("check_in_longitude", { precision: 10, scale: 7 }),
  checkOutLatitude: numeric("check_out_latitude", { precision: 10, scale: 7 }),
  checkOutLongitude: numeric("check_out_longitude", { precision: 10, scale: 7 }),
  gpsVerified: boolean("gps_verified").default(false),
  breakStart: varchar("break_start", { length: 10 }),
  breakEnd: varchar("break_end", { length: 10 }),
  breakDurationMinutes: integer("break_duration_minutes").default(0),
  isLate: boolean("is_late").default(false),
  lateMinutes: integer("late_minutes").default(0),
  isEarlyDeparture: boolean("is_early_departure").default(false),
  earlyMinutes: integer("early_minutes").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHRAttendanceSchema = createInsertSchema(hrAttendance).omit({ id: true, createdAt: true });
export type HRAttendance = typeof hrAttendance.$inferSelect;
export type InsertHRAttendance = z.infer<typeof insertHRAttendanceSchema>;

// ============== LEAVE MANAGEMENT ==============
export const leaveTypeEnum = pgEnum('leave_type', ['annual', 'sick', 'casual', 'maternity', 'paternity', 'unpaid', 'compensatory', 'bereavement']);
export const leaveStatusEnum = pgEnum('leave_status', ['pending', 'approved', 'rejected', 'cancelled']);

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: numeric("total_days", { precision: 4, scale: 1 }).notNull(),
  reason: text("reason").notNull(),
  status: leaveStatusEnum("status").notNull().default('pending'),
  approverId: integer("approver_id").references(() => employees.id),
  approverRemarks: text("approver_remarks"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({ id: true, createdAt: true, approvedAt: true });
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;

export const leaveBalances = pgTable("leave_balances", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  totalAllotted: numeric("total_allotted", { precision: 4, scale: 1 }).notNull(),
  used: numeric("used", { precision: 4, scale: 1 }).notNull().default('0'),
  remaining: numeric("remaining", { precision: 4, scale: 1 }).notNull(),
  year: integer("year").notNull(),
});

export const insertLeaveBalanceSchema = createInsertSchema(leaveBalances).omit({ id: true });
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type InsertLeaveBalance = z.infer<typeof insertLeaveBalanceSchema>;

export const companyHolidays = pgTable("company_holidays", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  date: timestamp("date").notNull(),
  type: varchar("type", { length: 50 }).notNull().default('public'),
  isOptional: boolean("is_optional").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompanyHolidaySchema = createInsertSchema(companyHolidays).omit({ id: true, createdAt: true });
export type CompanyHoliday = typeof companyHolidays.$inferSelect;
export type InsertCompanyHoliday = z.infer<typeof insertCompanyHolidaySchema>;

// ============== COMPLIANCE ==============
export const complianceStatusEnum = pgEnum('compliance_status', ['compliant', 'non-compliant', 'pending', 'expiring']);
export const complianceTaskStatusEnum = pgEnum('compliance_task_status', ['todo', 'in-progress', 'blocked', 'done']);
export const compliancePriorityEnum = pgEnum('compliance_priority', ['critical', 'high', 'medium', 'low']);

export const complianceItems = pgTable("compliance_items", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 100 }).notNull(),
  requirement: varchar("requirement", { length: 500 }).notNull(),
  description: text("description"),
  status: complianceStatusEnum("status").notNull().default('pending'),
  taskStatus: complianceTaskStatusEnum("task_status").default('todo'),
  priority: compliancePriorityEnum("priority").default('medium'),
  dueDate: timestamp("due_date").notNull(),
  completedAt: timestamp("completed_at"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  ownerId: integer("owner_id").references(() => employees.id),
  assignee: varchar("assignee", { length: 255 }),
  assignedTeam: text("assigned_team").array(),
  reminderDate: timestamp("reminder_date"),
  reminderNote: varchar("reminder_note", { length: 500 }),
  documents: integer("documents").default(0),
  attachmentUrls: text("attachment_urls").array(),
  notes: text("notes"),
  auditHistory: jsonb("audit_history").$type<Array<{ action: string; user: string; timestamp: string; details?: string }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertComplianceItemSchema = createInsertSchema(complianceItems).omit({ id: true, createdAt: true });
export type ComplianceItem = typeof complianceItems.$inferSelect;
export type InsertComplianceItem = z.infer<typeof insertComplianceItemSchema>;

export const licenseStatusEnum = pgEnum('license_status', ['active', 'expiring', 'expired']);
export const renewalStatusEnum = pgEnum('renewal_status', ['not-started', 'in-progress', 'submitted', 'approved']);

export const licenses = pgTable("licenses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  licenseNumber: varchar("license_number", { length: 100 }).notNull().unique(),
  issueDate: timestamp("issue_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  status: licenseStatusEnum("status").notNull().default('active'),
  renewalStatus: renewalStatusEnum("renewal_status").notNull().default('not-started'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLicenseSchema = createInsertSchema(licenses).omit({ id: true, createdAt: true });
export type License = typeof licenses.$inferSelect;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;

// ============== CREDIT NOTES ==============
export const creditNoteStatusEnum = pgEnum('credit_note_status', ['draft', 'approved', 'applied', 'cancelled']);
export const creditNoteReasonEnum = pgEnum('credit_note_reason', ['returns', 'price_adjustment', 'billing_error', 'near_expiry', 'damaged_goods', 'other']);

export const creditNotes = pgTable("credit_notes", {
  id: serial("id").primaryKey(),
  creditNoteNumber: varchar("credit_note_number", { length: 30 }).notNull().unique(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  doctorId: integer("doctor_id").references(() => doctors.id),
  pharmacyId: integer("pharmacy_id").references(() => pharmacies.id),
  returnId: integer("return_id").references(() => returns.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  reasonCode: creditNoteReasonEnum("reason_code"),
  notes: text("notes"),
  attachments: jsonb("attachments").$type<string[]>(),
  status: creditNoteStatusEnum("status").notNull().default('draft'),
  createdById: integer("created_by_id").references(() => users.id),
  approvedById: integer("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  appliedById: integer("applied_by_id").references(() => users.id),
  appliedAt: timestamp("applied_at"),
  gstReversal: boolean("gst_reversal").default(false),
  gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }).default("0"),
  gstRecordId: integer("gst_record_id").references(() => taxHSNCodes.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCreditNoteSchema = createInsertSchema(creditNotes).omit({ id: true, createdAt: true, updatedAt: true });
export type CreditNote = typeof creditNotes.$inferSelect;
export type InsertCreditNote = z.infer<typeof insertCreditNoteSchema>;

// ============== PRODUCT CATEGORIES ==============
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({ id: true, createdAt: true });
export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;

// ============== TAX/HSN CODES ==============
export const hsnCategoryEnum = pgEnum('hsn_category', ['Dermatology', 'Cosmetics', 'RX', 'Device', 'General', 'Nutraceutical', 'Surgical']);

export const taxHSNCodes = pgTable("tax_hsn_codes", {
  id: serial("id").primaryKey(),
  hsnCode: varchar("hsn_code", { length: 20 }).notNull().unique(),
  description: text("description").notNull(),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull(),
  cgst: numeric("cgst", { precision: 5, scale: 2 }).notNull(),
  sgst: numeric("sgst", { precision: 5, scale: 2 }).notNull(),
  igst: numeric("igst", { precision: 5, scale: 2 }).notNull(),
  category: varchar("category", { length: 50 }).default('General'),
  isRcm: boolean("is_rcm").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaxHSNCodeSchema = createInsertSchema(taxHSNCodes).omit({ id: true, createdAt: true });
export type TaxHSNCode = typeof taxHSNCodes.$inferSelect;
export type InsertTaxHSNCode = z.infer<typeof insertTaxHSNCodeSchema>;

// ============== TERRITORIES ==============
export const territories = pgTable("territories", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  region: varchar("region", { length: 100 }),
  state: varchar("state", { length: 100 }),
  managerId: integer("manager_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTerritorySchema = createInsertSchema(territories).omit({ id: true, createdAt: true });
export type Territory = typeof territories.$inferSelect;
export type InsertTerritory = z.infer<typeof insertTerritorySchema>;

// ============== SYSTEM SETTINGS ==============
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  category: varchar("category", { length: 50 }).notNull().default('general'),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true, updatedAt: true });
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// ============== DATA MASKING RULES ==============
export const maskTypeEnum = pgEnum('mask_type', ['full', 'partial', 'hash']);

export const dataMaskingRules = pgTable("data_masking_rules", {
  id: serial("id").primaryKey(),
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  maskType: maskTypeEnum("mask_type").notNull().default('partial'),
  roles: text("roles").array().notNull().default([]),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDataMaskingRuleSchema = createInsertSchema(dataMaskingRules).omit({ id: true, createdAt: true, updatedAt: true });
export type DataMaskingRule = typeof dataMaskingRules.$inferSelect;
export type InsertDataMaskingRule = z.infer<typeof insertDataMaskingRuleSchema>;

// ============== EXPORT CONTROLS ==============
export const exportControls = pgTable("export_controls", {
  id: serial("id").primaryKey(),
  entity: varchar("entity", { length: 100 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  canExport: boolean("can_export").notNull().default(true),
  watermark: boolean("watermark").notNull().default(false),
  maxRecords: integer("max_records").default(1000),
  formats: text("formats").array().notNull().default([]),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertExportControlSchema = createInsertSchema(exportControls).omit({ id: true, createdAt: true, updatedAt: true });
export type ExportControl = typeof exportControls.$inferSelect;
export type InsertExportControl = z.infer<typeof insertExportControlSchema>;

// ============== SAVED REPORTS ==============
export const savedReports = pgTable("saved_reports", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  chartType: varchar("chart_type", { length: 50 }).notNull().default('bar'),
  groupBy: varchar("group_by", { length: 50 }).notNull().default('month'),
  selectedFields: text("selected_fields").array().notNull().default([]),
  filters: jsonb("filters"),
  createdById: integer("created_by_id").references(() => users.id),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSavedReportSchema = createInsertSchema(savedReports).omit({ id: true, createdAt: true, updatedAt: true });
export type SavedReport = typeof savedReports.$inferSelect;
export type InsertSavedReport = z.infer<typeof insertSavedReportSchema>;

// ============== INTEGRATIONS ==============
export const integrationStatusEnum = pgEnum('integration_status', ['connected', 'disconnected', 'error']);

export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull(),
  status: integrationStatusEnum("status").notNull().default('disconnected'),
  config: jsonb("config"),
  lastSyncAt: timestamp("last_sync_at"),
  errorMessage: text("error_message"),
  autoRetry: boolean("auto_retry").notNull().default(false),
  retryLimit: integer("retry_limit").notNull().default(3),
  retryIntervalSecs: integer("retry_interval_secs").notNull().default(60),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({ id: true, createdAt: true, updatedAt: true });
export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;

// ============== IMPORT JOBS ==============
export const importJobStatusEnum = pgEnum('import_job_status', ['pending', 'processing', 'completed', 'failed']);

export const importJobs = pgTable("import_jobs", {
  id: serial("id").primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  status: importJobStatusEnum("status").notNull().default('pending'),
  totalRows: integer("total_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  errorRows: integer("error_rows").default(0),
  errors: jsonb("errors"),
  createdById: integer("created_by_id").references(() => users.id),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertImportJobSchema = createInsertSchema(importJobs).omit({ id: true, createdAt: true });
export type ImportJob = typeof importJobs.$inferSelect;
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;

// ============== EXPORT TEMPLATES ==============
export const exportTemplates = pgTable("export_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  columns: text("columns").array().notNull().default([]),
  format: varchar("format", { length: 20 }).notNull().default('xlsx'),
  includeHeaders: boolean("include_headers").notNull().default(true),
  createdById: integer("created_by_id").references(() => users.id),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertExportTemplateSchema = createInsertSchema(exportTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type ExportTemplate = typeof exportTemplates.$inferSelect;
export type InsertExportTemplate = z.infer<typeof insertExportTemplateSchema>;

// ============== WAREHOUSE OPERATIONS TASKS ==============
export const warehouseTaskStatusEnum = pgEnum('warehouse_task_status', ['pending', 'in-progress', 'completed', 'cancelled']);
export const warehouseTaskPriorityEnum = pgEnum('warehouse_task_priority', ['urgent', 'high', 'normal', 'low']);

export const pickingTasks = pgTable("picking_tasks", {
  id: serial("id").primaryKey(),
  taskNumber: varchar("task_number", { length: 30 }).notNull().unique(),
  orderId: integer("order_id").references(() => orders.id),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  items: integer("items").notNull().default(0),
  zone: varchar("zone", { length: 50 }),
  pickerId: integer("picker_id").references(() => users.id),
  status: warehouseTaskStatusEnum("status").notNull().default('pending'),
  priority: warehouseTaskPriorityEnum("priority").notNull().default('normal'),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPickingTaskSchema = createInsertSchema(pickingTasks).omit({ id: true, createdAt: true, updatedAt: true });
export type PickingTask = typeof pickingTasks.$inferSelect;
export type InsertPickingTask = z.infer<typeof insertPickingTaskSchema>;

export const packingTasks = pgTable("packing_tasks", {
  id: serial("id").primaryKey(),
  taskNumber: varchar("task_number", { length: 30 }).notNull().unique(),
  pickingTaskId: integer("picking_task_id").references(() => pickingTasks.id),
  orderId: integer("order_id").references(() => orders.id),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  items: integer("items").notNull().default(0),
  packerId: integer("packer_id").references(() => users.id),
  status: warehouseTaskStatusEnum("status").notNull().default('pending'),
  priority: warehouseTaskPriorityEnum("priority").notNull().default('normal'),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  proofPhotoUrl: text("proof_photo_url"),
  proofVideoUrl: text("proof_video_url"),
  proofRemarks: text("proof_remarks"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPackingTaskSchema = createInsertSchema(packingTasks).omit({ id: true, createdAt: true, updatedAt: true });
export type PackingTask = typeof packingTasks.$inferSelect;
export type InsertPackingTask = z.infer<typeof insertPackingTaskSchema>;

export const dispatchTasks = pgTable("dispatch_tasks", {
  id: serial("id").primaryKey(),
  taskNumber: varchar("task_number", { length: 30 }).notNull().unique(),
  packingTaskId: integer("packing_task_id").references(() => packingTasks.id),
  orderId: integer("order_id").references(() => orders.id),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  carrierId: integer("carrier_id").references(() => carriers.id),
  items: integer("items").notNull().default(0),
  destination: text("destination"),
  dispatcherId: integer("dispatcher_id").references(() => users.id),
  status: warehouseTaskStatusEnum("status").notNull().default('pending'),
  priority: warehouseTaskPriorityEnum("priority").notNull().default('normal'),
  scheduledAt: timestamp("scheduled_at"),
  dispatchedAt: timestamp("dispatched_at"),
  proofPhotoUrl: text("proof_photo_url"),
  proofVideoUrl: text("proof_video_url"),
  proofRemarks: text("proof_remarks"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDispatchTaskSchema = createInsertSchema(dispatchTasks).omit({ id: true, createdAt: true, updatedAt: true });
export type DispatchTask = typeof dispatchTasks.$inferSelect;
export type InsertDispatchTask = z.infer<typeof insertDispatchTaskSchema>;

// ============== REPORT TEMPLATES ==============
export const reportCategoryEnum = pgEnum('report_category', ['sales', 'inventory', 'finance', 'operations', 'crm', 'hr']);
export const reportFrequencyEnum = pgEnum('report_frequency', ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'on-demand']);

export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: reportCategoryEnum("category").notNull().default('sales'),
  icon: varchar("icon", { length: 50 }),
  frequency: reportFrequencyEnum("frequency").notNull().default('on-demand'),
  query: text("query"),
  dataSource: varchar("data_source", { length: 100 }),
  columns: text("columns").array(),
  parameters: jsonb("parameters"),
  lastGeneratedAt: timestamp("last_generated_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;

// ============== EXPORT JOBS ==============
export const exportJobStatusEnum = pgEnum("export_job_status", ["queued", "running", "completed", "failed"]);

export const exportJobs = pgTable("export_jobs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  format: varchar("format", { length: 20 }).notNull(),
  status: exportJobStatusEnum("status").notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  recordCount: integer("record_count").default(0),
  downloadUrl: text("download_url"),
  fileUrl: text("file_url"),
  columns: text("columns"),
  error: text("error"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertExportJobSchema = createInsertSchema(exportJobs).omit({ id: true, createdAt: true });
export type ExportJob = typeof exportJobs.$inferSelect;
export type InsertExportJob = z.infer<typeof insertExportJobSchema>;

// ============== AR COLLECTION ACCOUNTS ==============
export const arCollectionAccounts = pgTable("ar_collection_accounts", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  customerType: varchar("customer_type", { length: 20 }).notNull(),
  collectionOwnerId: integer("collection_owner_id").references(() => users.id),
  notes: jsonb("notes").$type<{ text: string; userId: number; timestamp: string }[]>(),
  lastInteractionDate: timestamp("last_interaction_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertARCollectionAccountSchema = createInsertSchema(arCollectionAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export type ARCollectionAccount = typeof arCollectionAccounts.$inferSelect;
export type InsertARCollectionAccount = z.infer<typeof insertARCollectionAccountSchema>;

// ============== EMPLOYEE LIFECYCLE: ONBOARDING ==============
export const onboardingTaskCategoryEnum = pgEnum('onboarding_task_category', ['HR', 'IT', 'Finance']);
export const onboardingTaskStatusEnum = pgEnum('onboarding_task_status', ['pending', 'in-progress', 'completed', 'skipped']);

export const onboardingChecklists = pgTable("onboarding_checklists", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  category: onboardingTaskCategoryEnum("category").notNull(),
  description: text("description"),
  assignedTo: varchar("assigned_to", { length: 255 }),
  status: onboardingTaskStatusEnum("status").notNull().default('pending'),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOnboardingChecklistSchema = createInsertSchema(onboardingChecklists).omit({ id: true, createdAt: true, updatedAt: true });
export type OnboardingChecklist = typeof onboardingChecklists.$inferSelect;
export type InsertOnboardingChecklist = z.infer<typeof insertOnboardingChecklistSchema>;

// ============== EMPLOYEE LIFECYCLE: EXIT WORKFLOW ==============
export const exitWorkflowStatusEnum = pgEnum('exit_workflow_status', ['initiated', 'in-progress', 'completed', 'cancelled']);
export const exitClearanceStatusEnum = pgEnum('exit_clearance_status', ['pending', 'cleared', 'hold']);

export const exitWorkflows = pgTable("exit_workflows", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  status: exitWorkflowStatusEnum("status").notNull().default('initiated'),
  exitDate: timestamp("exit_date").notNull(),
  reason: text("reason").notNull(),
  initiatedBy: varchar("initiated_by", { length: 255 }),
  clearances: jsonb("clearances").$type<{
    department: string;
    status: 'pending' | 'cleared' | 'hold';
    clearedBy: string | null;
    clearedAt: string | null;
    remarks: string | null;
  }[]>().default([]),
  documents: jsonb("documents").$type<{
    name: string;
    type: string;
    status: 'pending' | 'submitted' | 'verified';
    submittedAt: string | null;
  }[]>().default([]),
  approvals: jsonb("approvals").$type<{
    approver: string;
    role: string;
    status: 'pending' | 'approved' | 'rejected';
    remarks: string | null;
    timestamp: string | null;
  }[]>().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertExitWorkflowSchema = createInsertSchema(exitWorkflows).omit({ id: true, createdAt: true, updatedAt: true });
export type ExitWorkflow = typeof exitWorkflows.$inferSelect;
export type InsertExitWorkflow = z.infer<typeof insertExitWorkflowSchema>;

// ============== EMPLOYEE EMERGENCY CONTACTS ==============
export const emergencyContacts = pgTable("emergency_contacts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  name: varchar("name", { length: 255 }).notNull(),
  relationship: varchar("relationship", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  alternatePhone: varchar("alternate_phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmergencyContactSchema = createInsertSchema(emergencyContacts).omit({ id: true, createdAt: true, updatedAt: true });
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = z.infer<typeof insertEmergencyContactSchema>;

// ============== REPORT USAGE LOGS ==============
export const reportUsageLogStatusEnum = pgEnum('report_usage_log_status', ['completed', 'failed', 'cancelled']);

export const reportUsageLogs = pgTable("report_usage_logs", {
  id: serial("id").primaryKey(),
  reportTemplateId: integer("report_template_id"),
  reportName: text("report_name").notNull(),
  generatedByEmail: text("generated_by_email").notNull(),
  generatedByName: text("generated_by_name"),
  format: text("format").notNull().default('PDF'),
  status: reportUsageLogStatusEnum("status").notNull().default('completed'),
  rowCount: integer("row_count"),
  fileSizeKb: integer("file_size_kb"),
  durationMs: integer("duration_ms"),
  filters: jsonb("filters"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReportUsageLogSchema = createInsertSchema(reportUsageLogs).omit({ id: true, createdAt: true });
export type ReportUsageLog = typeof reportUsageLogs.$inferSelect;
export type InsertReportUsageLog = z.infer<typeof insertReportUsageLogSchema>;

// ============== REGULATORY AUDIT LOGS ==============
export const regulatoryAuditLogs = pgTable("regulatory_audit_logs", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  description: text("description").notNull(),
  performedByEmail: text("performed_by_email").notNull(),
  performedByName: text("performed_by_name"),
  regulation: text("regulation"),
  complianceStatus: text("compliance_status"),
  riskLevel: text("risk_level"),
  beforeValue: jsonb("before_value"),
  afterValue: jsonb("after_value"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRegulatoryAuditLogSchema = createInsertSchema(regulatoryAuditLogs).omit({ id: true, createdAt: true });
export type RegulatoryAuditLog = typeof regulatoryAuditLogs.$inferSelect;
export type InsertRegulatoryAuditLog = z.infer<typeof insertRegulatoryAuditLogSchema>;

// ============== SUSPICIOUS ACTIVITIES ==============
export const suspiciousActivitySeverityEnum = pgEnum('suspicious_activity_severity', ['low', 'medium', 'high', 'critical']);
export const suspiciousActivityStatusEnum = pgEnum('suspicious_activity_status', ['open', 'investigating', 'resolved', 'dismissed']);

export const suspiciousActivities = pgTable("suspicious_activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  severity: suspiciousActivitySeverityEnum("severity").notNull().default('medium'),
  status: suspiciousActivityStatusEnum("status").notNull().default('open'),
  ipAddress: text("ip_address").notNull(),
  geoLocation: text("geo_location"),
  userEmail: text("user_email"),
  userId: integer("user_id").references(() => users.id),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: text("related_entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  resolvedByEmail: text("resolved_by_email"),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSuspiciousActivitySchema = createInsertSchema(suspiciousActivities).omit({ id: true, createdAt: true });
export type SuspiciousActivity = typeof suspiciousActivities.$inferSelect;
export type InsertSuspiciousActivity = z.infer<typeof insertSuspiciousActivitySchema>;

// ============== DATA RETENTION POLICIES ==============
export const dataRetentionPolicies = pgTable("data_retention_policies", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  retentionDays: integer("retention_days").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  autoDelete: boolean("auto_delete").notNull().default(false),
  archiveBeforeDelete: boolean("archive_before_delete").notNull().default(true),
  lastExecutedAt: timestamp("last_executed_at"),
  nextExecutionAt: timestamp("next_execution_at"),
  createdByEmail: text("created_by_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDataRetentionPolicySchema = createInsertSchema(dataRetentionPolicies).omit({ id: true, createdAt: true, updatedAt: true });
export type DataRetentionPolicy = typeof dataRetentionPolicies.$inferSelect;
export type InsertDataRetentionPolicy = z.infer<typeof insertDataRetentionPolicySchema>;

// ============== MASKED DATA ACCESS LOGS ==============
export const maskedDataAccessLogs = pgTable("masked_data_access_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  fieldName: text("field_name").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  userEmail: text("user_email").notNull(),
  userId: integer("user_id").references(() => users.id),
  ipAddress: text("ip_address"),
  geoLocation: text("geo_location"),
  maskedValue: text("masked_value"),
  accessReason: text("access_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMaskedDataAccessLogSchema = createInsertSchema(maskedDataAccessLogs).omit({ id: true, createdAt: true });
export type MaskedDataAccessLog = typeof maskedDataAccessLogs.$inferSelect;
export type InsertMaskedDataAccessLog = z.infer<typeof insertMaskedDataAccessLogSchema>;

// ============== LOGIN HISTORY ==============
export const loginStatusEnum = pgEnum('login_status', ['success', 'failed', 'blocked', 'expired']);

export const loginHistory = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  userEmail: text("user_email").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: loginStatusEnum("status").notNull().default('success'),
  failureReason: text("failure_reason"),
  geoLocation: text("geo_location"),
  sessionDuration: integer("session_duration"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLoginHistorySchema = createInsertSchema(loginHistory).omit({ id: true, createdAt: true });
export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = z.infer<typeof insertLoginHistorySchema>;

// ============== TERRITORY BOUNDARIES ==============
export const boundaryTypeEnum = pgEnum('boundary_type', ['pincode_range', 'city_list', 'district_list', 'custom']);

export const territoryBoundaries = pgTable("territory_boundaries", {
  id: serial("id").primaryKey(),
  territoryId: integer("territory_id").notNull().references(() => territories.id, { onDelete: "cascade" }),
  boundaryType: boundaryTypeEnum("boundary_type").notNull(),
  label: text("label").notNull(),
  values: jsonb("values").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTerritoryBoundarySchema = createInsertSchema(territoryBoundaries).omit({ id: true, createdAt: true, updatedAt: true });
export type TerritoryBoundary = typeof territoryBoundaries.$inferSelect;
export type InsertTerritoryBoundary = z.infer<typeof insertTerritoryBoundarySchema>;

// ============== INTEGRATION SYNC RUNS ==============
export const syncRunStatusEnum = pgEnum('sync_run_status', ['running', 'success', 'failed', 'partial']);

export const integrationSyncRuns = pgTable("integration_sync_runs", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  status: syncRunStatusEnum("status").notNull().default('running'),
  direction: text("direction").notNull().default('outbound'),
  recordsProcessed: integer("records_processed").default(0),
  recordsFailed: integer("records_failed").default(0),
  errorMessage: text("error_message"),
  attempt: integer("attempt").notNull().default(1),
  triggeredBy: text("triggered_by"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export const insertIntegrationSyncRunSchema = createInsertSchema(integrationSyncRuns).omit({ id: true });
export type IntegrationSyncRun = typeof integrationSyncRuns.$inferSelect;
export type InsertIntegrationSyncRun = z.infer<typeof insertIntegrationSyncRunSchema>;

// ============== INTEGRATION WEBHOOK EVENTS ==============
export const webhookEventStatusEnum = pgEnum('webhook_event_status', ['received', 'processing', 'processed', 'failed', 'ignored']);

export const integrationWebhookEvents = pgTable("integration_webhook_events", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  status: webhookEventStatusEnum("status").notNull().default('received'),
  payload: jsonb("payload"),
  responseCode: integer("response_code"),
  errorMessage: text("error_message"),
  processingTimeMs: integer("processing_time_ms"),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertIntegrationWebhookEventSchema = createInsertSchema(integrationWebhookEvents).omit({ id: true });
export type IntegrationWebhookEvent = typeof integrationWebhookEvents.$inferSelect;
export type InsertIntegrationWebhookEvent = z.infer<typeof insertIntegrationWebhookEventSchema>;

// ============== INTEGRATION ALERTS ==============
export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'warning', 'critical']);
export const alertStatusEnum = pgEnum('alert_status', ['active', 'acknowledged', 'resolved', 'muted']);

export const integrationAlerts = pgTable("integration_alerts", {
  id: serial("id").primaryKey(),
  integrationId: integer("integration_id").notNull().references(() => integrations.id, { onDelete: "cascade" }),
  severity: alertSeverityEnum("severity").notNull().default('warning'),
  status: alertStatusEnum("status").notNull().default('active'),
  condition: text("condition").notNull(),
  message: text("message").notNull(),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  lastTriggeredAt: timestamp("last_triggered_at").defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertIntegrationAlertSchema = createInsertSchema(integrationAlerts).omit({ id: true, createdAt: true });
export type IntegrationAlert = typeof integrationAlerts.$inferSelect;
export type InsertIntegrationAlert = z.infer<typeof insertIntegrationAlertSchema>;

// ============== ROLE TEMPLATES ==============
export const roleTemplates = pgTable("role_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  modules: jsonb("modules").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRoleTemplateSchema = createInsertSchema(roleTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type RoleTemplate = typeof roleTemplates.$inferSelect;
export type InsertRoleTemplate = z.infer<typeof insertRoleTemplateSchema>;

export type ModulePermission = {
  module: string;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

// ============== REPLIT AUTH ==============
export * from "./models/auth";
