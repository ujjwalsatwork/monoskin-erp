import { eq, desc, and, gte, lte, like, sql, or } from "drizzle-orm";
import { db } from "./db";
import * as schema from "../shared/schema";
import type {
  User, InsertUser,
  Session, InsertSession,
  Product, InsertProduct,
  Warehouse, InsertWarehouse,
  Inventory, InsertInventory,
  Doctor, InsertDoctor,
  Pharmacy, InsertPharmacy,
  Lead, InsertLead, LeadActivity, InsertLeadActivity,
  RoleTemplate, InsertRoleTemplate,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  Invoice, InsertInvoice,
  Approval, InsertApproval,
  Shipment, InsertShipment,
  GRN, InsertGRN,
  GRNItem,
  Transfer, InsertTransfer, TransferItem,
  PromoCode, InsertPromoCode,
  ClinicCode, InsertClinicCode,
  PricingSlab, InsertPricingSlab,
  Carrier, InsertCarrier,
  Notification, InsertNotification,
  AuditLog, InsertAuditLog,
  AccessLog, InsertAccessLog,
  Return, InsertReturn, ReturnItem, InsertReturnItem,
  Payment, InsertPayment,
  MR, InsertMR,
  MRVisit, InsertMRVisit,
  MRAttendance, InsertMRAttendance,
  MRTarget, InsertMRTarget,
  Employee, InsertEmployee,
  HRAttendance, InsertHRAttendance,
  ComplianceItem, InsertComplianceItem,
  License, InsertLicense,
  Scheme, InsertScheme,
  CreditNote, InsertCreditNote,
  TaxHSNCode, InsertTaxHSNCode,
  Territory, InsertTerritory,
  Settings, InsertSettings,
  DataMaskingRule, InsertDataMaskingRule,
  ExportControl, InsertExportControl,
  SavedReport, InsertSavedReport,
  Integration, InsertIntegration,
  ImportJob, InsertImportJob,
  ExportTemplate, InsertExportTemplate,
  PickingTask, InsertPickingTask,
  PackingTask, InsertPackingTask,
  DispatchTask, InsertDispatchTask,
  ExportJob, InsertExportJob,
  ReportTemplate, InsertReportTemplate,
  ARCollectionAccount, InsertARCollectionAccount,
  LeaveRequest, InsertLeaveRequest,
  LeaveBalance, InsertLeaveBalance,
  CompanyHoliday, InsertCompanyHoliday,
  OnboardingChecklist, InsertOnboardingChecklist,
  ExitWorkflow, InsertExitWorkflow,
  EmergencyContact, InsertEmergencyContact,
  ReportUsageLog, InsertReportUsageLog,
  RegulatoryAuditLog, InsertRegulatoryAuditLog,
  SuspiciousActivity, InsertSuspiciousActivity,
  DataRetentionPolicy, InsertDataRetentionPolicy,
  MaskedDataAccessLog, InsertMaskedDataAccessLog,
  LoginHistory, InsertLoginHistory,
  TerritoryBoundary, InsertTerritoryBoundary,
  IntegrationSyncRun, InsertIntegrationSyncRun,
  IntegrationWebhookEvent, InsertIntegrationWebhookEvent,
  IntegrationAlert, InsertIntegrationAlert,
} from "../shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;

  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<boolean>;
  deleteUserSessions(userId: number): Promise<boolean>;
  extendSession(token: string, expiresAt: Date): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Warehouses
  getWarehouses(): Promise<Warehouse[]>;
  getWarehouse(id: number): Promise<Warehouse | undefined>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, data: Partial<InsertWarehouse>): Promise<Warehouse | undefined>;

  // Inventory
  getInventory(warehouseId?: number, productId?: number): Promise<Inventory[]>;
  getInventoryById(id: number): Promise<Inventory | undefined>;
  createInventory(inv: InsertInventory): Promise<Inventory>;
  updateInventory(id: number, data: Partial<InsertInventory>): Promise<Inventory | undefined>;

  // Doctors
  getDoctors(): Promise<Doctor[]>;
  getDoctor(id: number): Promise<Doctor | undefined>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;
  updateDoctor(id: number, data: Partial<InsertDoctor>): Promise<Doctor | undefined>;
  deleteDoctor(id: number): Promise<boolean>;

  // Pharmacies
  getPharmacies(): Promise<Pharmacy[]>;
  getPharmacy(id: number): Promise<Pharmacy | undefined>;
  createPharmacy(pharmacy: InsertPharmacy): Promise<Pharmacy>;
  updatePharmacy(id: number, data: Partial<InsertPharmacy>): Promise<Pharmacy | undefined>;
  deletePharmacy(id: number): Promise<boolean>;

  // Leads
  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, data: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  getLeadActivities(leadId: number): Promise<LeadActivity[]>;
  createLeadActivity(activity: InsertLeadActivity): Promise<LeadActivity>;

  // Role Templates
  getRoleTemplates(): Promise<RoleTemplate[]>;
  getRoleTemplate(id: number): Promise<RoleTemplate | undefined>;
  createRoleTemplate(data: InsertRoleTemplate): Promise<RoleTemplate>;
  updateRoleTemplate(id: number, data: Partial<InsertRoleTemplate>): Promise<RoleTemplate | undefined>;
  deleteRoleTemplate(id: number): Promise<boolean>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order | undefined>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;

  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;

  // Approvals
  getApprovals(): Promise<Approval[]>;
  getApproval(id: number): Promise<Approval | undefined>;
  createApproval(approval: InsertApproval): Promise<Approval>;
  updateApproval(id: number, data: Partial<InsertApproval>): Promise<Approval | undefined>;

  // Shipments
  getShipments(): Promise<Shipment[]>;
  getShipment(id: number): Promise<Shipment | undefined>;
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  updateShipment(id: number, data: Partial<InsertShipment>): Promise<Shipment | undefined>;

  // GRNs
  getGRNs(): Promise<GRN[]>;
  getGRN(id: number): Promise<GRN | undefined>;
  createGRN(grn: InsertGRN): Promise<GRN>;
  updateGRN(id: number, data: Partial<InsertGRN>): Promise<GRN | undefined>;
  getGRNItems(): Promise<GRNItem[]>;
  getGRNItemsByGRN(grnId: number): Promise<GRNItem[]>;

  // Transfers
  getTransfers(): Promise<Transfer[]>;
  getTransfer(id: number): Promise<Transfer | undefined>;
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;
  updateTransfer(id: number, data: Partial<InsertTransfer>): Promise<Transfer | undefined>;
  getTransferItems(): Promise<TransferItem[]>;
  getTransferItemsByTransfer(transferId: number): Promise<TransferItem[]>;

  // Promo Codes
  getPromoCodes(): Promise<PromoCode[]>;
  getPromoCode(id: number): Promise<PromoCode | undefined>;
  createPromoCode(code: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: number, data: Partial<InsertPromoCode>): Promise<PromoCode | undefined>;

  // Clinic Codes
  getClinicCodes(): Promise<ClinicCode[]>;
  getClinicCode(id: number): Promise<ClinicCode | undefined>;
  createClinicCode(code: InsertClinicCode): Promise<ClinicCode>;
  updateClinicCode(id: number, data: Partial<InsertClinicCode>): Promise<ClinicCode | undefined>;

  // Pricing Slabs
  getPricingSlabs(): Promise<PricingSlab[]>;
  getPricingSlab(id: number): Promise<PricingSlab | undefined>;
  createPricingSlab(slab: InsertPricingSlab): Promise<PricingSlab>;

  // Schemes
  getSchemes(): Promise<Scheme[]>;
  getScheme(id: number): Promise<Scheme | undefined>;
  createScheme(scheme: InsertScheme): Promise<Scheme>;
  updateScheme(id: number, data: Partial<InsertScheme>): Promise<Scheme | undefined>;
  deleteScheme(id: number): Promise<boolean>;

  // Carriers
  getCarriers(): Promise<Carrier[]>;
  getCarrier(id: number): Promise<Carrier | undefined>;
  createCarrier(carrier: InsertCarrier): Promise<Carrier>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: number): Promise<void>;

  // Audit Logs
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Access Logs
  getAccessLogs(limit?: number): Promise<AccessLog[]>;
  createAccessLog(log: InsertAccessLog): Promise<AccessLog>;

  // Returns
  getReturns(): Promise<Return[]>;
  getReturn(id: number): Promise<Return | undefined>;
  createReturn(ret: InsertReturn): Promise<Return>;
  updateReturn(id: number, data: Partial<InsertReturn>): Promise<Return | undefined>;

  // Return Items
  getReturnItems(): Promise<ReturnItem[]>;
  getReturnItemsByReturnId(returnId: number): Promise<ReturnItem[]>;
  createReturnItem(item: InsertReturnItem): Promise<ReturnItem>;

  // Payments
  getPayments(invoiceId?: number): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, data: Partial<InsertPayment>): Promise<Payment | undefined>;

  // MRs (Medical Representatives)
  getMRs(): Promise<MR[]>;
  getMR(id: number): Promise<MR | undefined>;
  createMR(mr: InsertMR): Promise<MR>;
  updateMR(id: number, data: Partial<InsertMR>): Promise<MR | undefined>;
  getMRVisits(mrId?: number): Promise<MRVisit[]>;
  createMRVisit(visit: InsertMRVisit): Promise<MRVisit>;
  getMRAttendance(mrId: number): Promise<MRAttendance[]>;
  createMRAttendance(attendance: InsertMRAttendance): Promise<MRAttendance>;
  getMRTargets(mrId: number): Promise<MRTarget[]>;
  getAllMRTargets(): Promise<MRTarget[]>;
  createMRTarget(target: InsertMRTarget): Promise<MRTarget>;
  updateMRTarget(id: number, data: Partial<InsertMRTarget>): Promise<MRTarget | undefined>;
  getTerritories(): Promise<string[]>;

  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined>;

  // HR Attendance
  getHRAttendance(date?: string): Promise<HRAttendance[]>;
  getHRAttendanceByEmployee(employeeId: number): Promise<HRAttendance[]>;
  getHRAttendanceRange(startDate: string, endDate: string): Promise<HRAttendance[]>;
  createHRAttendance(attendance: InsertHRAttendance): Promise<HRAttendance>;
  updateHRAttendance(id: number, data: Partial<InsertHRAttendance>): Promise<HRAttendance | undefined>;

  // Leave Management
  getLeaveRequests(): Promise<LeaveRequest[]>;
  getLeaveRequestsByEmployee(employeeId: number): Promise<LeaveRequest[]>;
  getLeaveRequestsByApprover(approverId: number): Promise<LeaveRequest[]>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, data: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined>;
  getLeaveBalances(employeeId?: number, year?: number): Promise<LeaveBalance[]>;
  createLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance>;
  updateLeaveBalance(id: number, data: Partial<InsertLeaveBalance>): Promise<LeaveBalance | undefined>;
  getCompanyHolidays(year?: number): Promise<CompanyHoliday[]>;
  createCompanyHoliday(holiday: InsertCompanyHoliday): Promise<CompanyHoliday>;
  updateCompanyHoliday(id: number, data: Partial<InsertCompanyHoliday>): Promise<CompanyHoliday | undefined>;
  deleteCompanyHoliday(id: number): Promise<boolean>;

  // Compliance
  getComplianceItems(): Promise<ComplianceItem[]>;
  getComplianceItem(id: number): Promise<ComplianceItem | undefined>;
  createComplianceItem(item: InsertComplianceItem): Promise<ComplianceItem>;
  updateComplianceItem(id: number, data: Partial<InsertComplianceItem>): Promise<ComplianceItem | undefined>;

  // Licenses
  getLicenses(): Promise<License[]>;
  getLicense(id: number): Promise<License | undefined>;
  createLicense(license: InsertLicense): Promise<License>;
  updateLicense(id: number, data: Partial<InsertLicense>): Promise<License | undefined>;

  // Onboarding Checklists
  getOnboardingChecklists(employeeId?: number): Promise<OnboardingChecklist[]>;
  getOnboardingChecklist(id: number): Promise<OnboardingChecklist | undefined>;
  createOnboardingChecklist(item: InsertOnboardingChecklist): Promise<OnboardingChecklist>;
  updateOnboardingChecklist(id: number, data: Partial<InsertOnboardingChecklist>): Promise<OnboardingChecklist | undefined>;
  deleteOnboardingChecklist(id: number): Promise<boolean>;

  // Exit Workflows
  getExitWorkflows(employeeId?: number): Promise<ExitWorkflow[]>;
  getExitWorkflow(id: number): Promise<ExitWorkflow | undefined>;
  createExitWorkflow(workflow: InsertExitWorkflow): Promise<ExitWorkflow>;
  updateExitWorkflow(id: number, data: Partial<InsertExitWorkflow>): Promise<ExitWorkflow | undefined>;

  // Emergency Contacts
  getEmergencyContacts(employeeId: number): Promise<EmergencyContact[]>;
  createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact>;
  updateEmergencyContact(id: number, data: Partial<InsertEmergencyContact>): Promise<EmergencyContact | undefined>;
  deleteEmergencyContact(id: number): Promise<boolean>;

  // Credit Notes
  getCreditNotes(): Promise<CreditNote[]>;
  getCreditNote(id: number): Promise<CreditNote | undefined>;
  createCreditNote(creditNote: InsertCreditNote): Promise<CreditNote>;
  updateCreditNote(id: number, data: Partial<InsertCreditNote>): Promise<CreditNote | undefined>;

  // Tax HSN Codes
  getTaxHSNCodes(): Promise<TaxHSNCode[]>;
  getTaxHSNCode(id: number): Promise<TaxHSNCode | undefined>;
  createTaxHSNCode(code: InsertTaxHSNCode): Promise<TaxHSNCode>;
  updateTaxHSNCode(id: number, data: Partial<InsertTaxHSNCode>): Promise<TaxHSNCode | undefined>;

  // Territories (full CRUD)
  getTerritoriesList(): Promise<Territory[]>;
  getTerritory(id: number): Promise<Territory | undefined>;
  createTerritory(territory: InsertTerritory): Promise<Territory>;
  updateTerritory(id: number, data: Partial<InsertTerritory>): Promise<Territory | undefined>;

  // AR Ageing Report
  getARAgeing(): Promise<{
    customerId: number;
    customerName: string;
    customerType: 'doctor' | 'pharmacy';
    totalOutstanding: number;
    current: number;
    days30: number;
    days60: number;
    days90: number;
    days90Plus: number;
    lastPaymentDate: string | null;
    creditLimit: number;
  }[]>;

  // KPIs and Dashboard
  getDashboardKPIs(): Promise<{
    ordersToday: number;
    ordersTrend: number;
    revenueMonth: number;
    revenueTrend: number;
    inventoryValue: number;
    lowStockItems: number;
    pendingApprovals: number;
    delayedShipments: number;
    overdueAR: number;
    arAgeing30: number;
    arAgeing60: number;
    arAgeing90: number;
    newLeads: number;
    totalDoctors: number;
    pendingOrders: number;
    totalProducts: number;
  }>;

  // AR Collection Accounts
  getARCollectionAccounts(): Promise<ARCollectionAccount[]>;
  getARCollectionAccount(customerId: number, customerType: string): Promise<ARCollectionAccount | undefined>;
  upsertARCollectionAccount(customerId: number, customerType: string, data: Partial<InsertARCollectionAccount>): Promise<ARCollectionAccount>;

  // Export Jobs
  getExportJobs(): Promise<ExportJob[]>;
  getExportJob(id: number): Promise<ExportJob | undefined>;
  createExportJob(job: InsertExportJob): Promise<ExportJob>;
  updateExportJob(id: number, data: Partial<InsertExportJob>): Promise<ExportJob | undefined>;

  // Settings
  getSettings(): Promise<Settings[]>;
  getSetting(key: string): Promise<Settings | undefined>;
  upsertSetting(key: string, value: string, category?: string, description?: string): Promise<Settings>;

  // Data Masking Rules
  getDataMaskingRules(): Promise<DataMaskingRule[]>;
  getDataMaskingRule(id: number): Promise<DataMaskingRule | undefined>;
  createDataMaskingRule(rule: InsertDataMaskingRule): Promise<DataMaskingRule>;
  updateDataMaskingRule(id: number, data: Partial<InsertDataMaskingRule>): Promise<DataMaskingRule | undefined>;
  deleteDataMaskingRule(id: number): Promise<boolean>;

  // Export Controls
  getExportControls(): Promise<ExportControl[]>;
  getExportControl(id: number): Promise<ExportControl | undefined>;
  createExportControl(control: InsertExportControl): Promise<ExportControl>;
  updateExportControl(id: number, data: Partial<InsertExportControl>): Promise<ExportControl | undefined>;
  deleteExportControl(id: number): Promise<boolean>;

  // Saved Reports
  getSavedReports(): Promise<SavedReport[]>;
  getSavedReport(id: number): Promise<SavedReport | undefined>;
  createSavedReport(report: InsertSavedReport): Promise<SavedReport>;
  updateSavedReport(id: number, data: Partial<InsertSavedReport>): Promise<SavedReport | undefined>;
  deleteSavedReport(id: number): Promise<boolean>;

  // Integrations
  getIntegrations(): Promise<Integration[]>;
  getIntegration(id: number): Promise<Integration | undefined>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: number, data: Partial<InsertIntegration>): Promise<Integration | undefined>;

  // Import Jobs
  getImportJobs(): Promise<ImportJob[]>;
  getImportJob(id: number): Promise<ImportJob | undefined>;
  createImportJob(job: InsertImportJob): Promise<ImportJob>;
  updateImportJob(id: number, data: Partial<InsertImportJob>): Promise<ImportJob | undefined>;

  // Export Templates
  getExportTemplates(): Promise<ExportTemplate[]>;
  getExportTemplate(id: number): Promise<ExportTemplate | undefined>;
  createExportTemplate(template: InsertExportTemplate): Promise<ExportTemplate>;
  updateExportTemplate(id: number, data: Partial<InsertExportTemplate>): Promise<ExportTemplate | undefined>;
  deleteExportTemplate(id: number): Promise<boolean>;

  // Picking Tasks
  getPickingTasks(): Promise<PickingTask[]>;
  getPickingTask(id: number): Promise<PickingTask | undefined>;
  createPickingTask(task: InsertPickingTask): Promise<PickingTask>;
  updatePickingTask(id: number, data: Partial<InsertPickingTask>): Promise<PickingTask | undefined>;
  deletePickingTask(id: number): Promise<boolean>;

  // Packing Tasks
  getPackingTasks(): Promise<PackingTask[]>;
  getPackingTask(id: number): Promise<PackingTask | undefined>;
  createPackingTask(task: InsertPackingTask): Promise<PackingTask>;
  updatePackingTask(id: number, data: Partial<InsertPackingTask>): Promise<PackingTask | undefined>;
  deletePackingTask(id: number): Promise<boolean>;

  // Dispatch Tasks
  getDispatchTasks(): Promise<DispatchTask[]>;
  getDispatchTask(id: number): Promise<DispatchTask | undefined>;
  createDispatchTask(task: InsertDispatchTask): Promise<DispatchTask>;
  updateDispatchTask(id: number, data: Partial<InsertDispatchTask>): Promise<DispatchTask | undefined>;
  deleteDispatchTask(id: number): Promise<boolean>;

  // Report Templates
  getReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplate(id: number): Promise<ReportTemplate | undefined>;
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  updateReportTemplate(id: number, data: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined>;
  deleteReportTemplate(id: number): Promise<boolean>;

  // Report Usage Logs
  getReportUsageLogs(): Promise<ReportUsageLog[]>;
  createReportUsageLog(log: InsertReportUsageLog): Promise<ReportUsageLog>;

  // Regulatory Audit Logs
  getRegulatoryAuditLogs(): Promise<RegulatoryAuditLog[]>;
  createRegulatoryAuditLog(log: InsertRegulatoryAuditLog): Promise<RegulatoryAuditLog>;

  // Suspicious Activities
  getSuspiciousActivities(): Promise<SuspiciousActivity[]>;
  createSuspiciousActivity(activity: InsertSuspiciousActivity): Promise<SuspiciousActivity>;
  updateSuspiciousActivity(id: number, data: Partial<InsertSuspiciousActivity>): Promise<SuspiciousActivity | undefined>;

  // Data Retention Policies
  getDataRetentionPolicies(): Promise<DataRetentionPolicy[]>;
  createDataRetentionPolicy(policy: InsertDataRetentionPolicy): Promise<DataRetentionPolicy>;
  updateDataRetentionPolicy(id: number, data: Partial<InsertDataRetentionPolicy>): Promise<DataRetentionPolicy | undefined>;
  deleteDataRetentionPolicy(id: number): Promise<boolean>;

  // Masked Data Access Logs
  getMaskedDataAccessLogs(): Promise<MaskedDataAccessLog[]>;
  createMaskedDataAccessLog(log: InsertMaskedDataAccessLog): Promise<MaskedDataAccessLog>;

  // Login History
  getLoginHistory(userId?: number): Promise<LoginHistory[]>;
  createLoginHistory(entry: InsertLoginHistory): Promise<LoginHistory>;

  // Territory Boundaries
  getTerritoryBoundaries(territoryId?: number): Promise<TerritoryBoundary[]>;
  createTerritoryBoundary(boundary: InsertTerritoryBoundary): Promise<TerritoryBoundary>;
  updateTerritoryBoundary(id: number, data: Partial<InsertTerritoryBoundary>): Promise<TerritoryBoundary | undefined>;
  deleteTerritoryBoundary(id: number): Promise<boolean>;

  // Integration Sync Runs
  getIntegrationSyncRuns(integrationId?: number): Promise<IntegrationSyncRun[]>;
  createIntegrationSyncRun(run: InsertIntegrationSyncRun): Promise<IntegrationSyncRun>;
  updateIntegrationSyncRun(id: number, data: Partial<InsertIntegrationSyncRun>): Promise<IntegrationSyncRun | undefined>;

  // Integration Webhook Events
  getIntegrationWebhookEvents(integrationId?: number): Promise<IntegrationWebhookEvent[]>;
  createIntegrationWebhookEvent(event: InsertIntegrationWebhookEvent): Promise<IntegrationWebhookEvent>;

  // Integration Alerts
  getIntegrationAlerts(integrationId?: number): Promise<IntegrationAlert[]>;
  createIntegrationAlert(alert: InsertIntegrationAlert): Promise<IntegrationAlert>;
  updateIntegrationAlert(id: number, data: Partial<InsertIntegrationAlert>): Promise<IntegrationAlert | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.phone, phone));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(schema.users).set({ ...data, updatedAt: new Date() }).where(eq(schema.users.id, id)).returning();
    return user;
  }

  // Sessions
  async createSession(session: InsertSession): Promise<Session> {
    const [created] = await db.insert(schema.sessions).values(session).returning();
    return created;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const [session] = await db.select().from(schema.sessions).where(eq(schema.sessions.token, token));
    return session;
  }

  async deleteSession(token: string): Promise<boolean> {
    const result = await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
    return true;
  }

  async deleteUserSessions(userId: number): Promise<boolean> {
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    return true;
  }

  async extendSession(token: string, expiresAt: Date): Promise<void> {
    await db.update(schema.sessions).set({ expiresAt }).where(eq(schema.sessions.token, token));
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return db.select().from(schema.products).where(eq(schema.products.isActive, true)).orderBy(schema.products.name);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(schema.products).where(eq(schema.products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(schema.products).values(product).returning();
    return created;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db.update(schema.products).set({ ...data, updatedAt: new Date() }).where(eq(schema.products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const [product] = await db.update(schema.products).set({ isActive: false, updatedAt: new Date() }).where(eq(schema.products.id, id)).returning();
    return !!product;
  }

  // Warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    return db.select().from(schema.warehouses).where(eq(schema.warehouses.isActive, true)).orderBy(schema.warehouses.name);
  }

  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    const [warehouse] = await db.select().from(schema.warehouses).where(eq(schema.warehouses.id, id));
    return warehouse;
  }

  async createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse> {
    const [created] = await db.insert(schema.warehouses).values(warehouse).returning();
    return created;
  }

  async updateWarehouse(id: number, data: Partial<InsertWarehouse>): Promise<Warehouse | undefined> {
    const [warehouse] = await db.update(schema.warehouses).set({ ...data, updatedAt: new Date() }).where(eq(schema.warehouses.id, id)).returning();
    return warehouse;
  }

  // Inventory
  async getInventory(warehouseId?: number, productId?: number): Promise<Inventory[]> {
    let query = db.select().from(schema.inventory);
    const conditions = [];
    if (warehouseId) conditions.push(eq(schema.inventory.warehouseId, warehouseId));
    if (productId) conditions.push(eq(schema.inventory.productId, productId));
    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    return query;
  }

  async getInventoryById(id: number): Promise<Inventory | undefined> {
    const [inv] = await db.select().from(schema.inventory).where(eq(schema.inventory.id, id));
    return inv;
  }

  async createInventory(inv: InsertInventory): Promise<Inventory> {
    const [created] = await db.insert(schema.inventory).values(inv).returning();
    return created;
  }

  async updateInventory(id: number, data: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const [inv] = await db.update(schema.inventory).set({ ...data, updatedAt: new Date() }).where(eq(schema.inventory.id, id)).returning();
    return inv;
  }

  // Doctors
  async getDoctors(): Promise<Doctor[]> {
    return db.select().from(schema.doctors).where(eq(schema.doctors.isActive, true)).orderBy(schema.doctors.name);
  }

  async getDoctor(id: number): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(schema.doctors).where(eq(schema.doctors.id, id));
    return doctor;
  }

  async createDoctor(doctor: InsertDoctor): Promise<Doctor> {
    const [created] = await db.insert(schema.doctors).values(doctor).returning();
    return created;
  }

  async updateDoctor(id: number, data: Partial<InsertDoctor>): Promise<Doctor | undefined> {
    const [doctor] = await db.update(schema.doctors).set({ ...data, updatedAt: new Date() }).where(eq(schema.doctors.id, id)).returning();
    return doctor;
  }

  async deleteDoctor(id: number): Promise<boolean> {
    const [doctor] = await db.update(schema.doctors).set({ isActive: false, updatedAt: new Date() }).where(eq(schema.doctors.id, id)).returning();
    return !!doctor;
  }

  // Pharmacies
  async getPharmacies(): Promise<Pharmacy[]> {
    return db.select().from(schema.pharmacies).where(eq(schema.pharmacies.isActive, true)).orderBy(schema.pharmacies.name);
  }

  async getPharmacy(id: number): Promise<Pharmacy | undefined> {
    const [pharmacy] = await db.select().from(schema.pharmacies).where(eq(schema.pharmacies.id, id));
    return pharmacy;
  }

  async createPharmacy(pharmacy: InsertPharmacy): Promise<Pharmacy> {
    const [created] = await db.insert(schema.pharmacies).values(pharmacy).returning();
    return created;
  }

  async updatePharmacy(id: number, data: Partial<InsertPharmacy>): Promise<Pharmacy | undefined> {
    const [pharmacy] = await db.update(schema.pharmacies).set({ ...data, updatedAt: new Date() }).where(eq(schema.pharmacies.id, id)).returning();
    return pharmacy;
  }

  async deletePharmacy(id: number): Promise<boolean> {
    const [pharmacy] = await db.update(schema.pharmacies).set({ isActive: false, updatedAt: new Date() }).where(eq(schema.pharmacies.id, id)).returning();
    return !!pharmacy;
  }

  // Leads
  async getLeads(): Promise<Lead[]> {
    return db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt));
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, id));
    return lead;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(schema.leads).values(lead).returning();
    return created;
  }

  async updateLead(id: number, data: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db.update(schema.leads).set({ ...data, updatedAt: new Date() }).where(eq(schema.leads.id, id)).returning();
    return lead;
  }

  async deleteLead(id: number): Promise<boolean> {
    const result = await db.delete(schema.leads).where(eq(schema.leads.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getLeadActivities(leadId: number): Promise<LeadActivity[]> {
    return db.select().from(schema.leadActivities)
      .where(eq(schema.leadActivities.leadId, leadId))
      .orderBy(desc(schema.leadActivities.createdAt));
  }

  async createLeadActivity(activity: InsertLeadActivity): Promise<LeadActivity> {
    const [result] = await db.insert(schema.leadActivities).values(activity).returning();
    return result;
  }

  // Role Templates
  async getRoleTemplates(): Promise<RoleTemplate[]> {
    return db.select().from(schema.roleTemplates).orderBy(schema.roleTemplates.name);
  }

  async getRoleTemplate(id: number): Promise<RoleTemplate | undefined> {
    const [template] = await db.select().from(schema.roleTemplates).where(eq(schema.roleTemplates.id, id));
    return template;
  }

  async createRoleTemplate(data: InsertRoleTemplate): Promise<RoleTemplate> {
    const [template] = await db.insert(schema.roleTemplates).values(data).returning();
    return template;
  }

  async updateRoleTemplate(id: number, data: Partial<InsertRoleTemplate>): Promise<RoleTemplate | undefined> {
    const [template] = await db.update(schema.roleTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.roleTemplates.id, id))
      .returning();
    return template;
  }

  async deleteRoleTemplate(id: number): Promise<boolean> {
    // Clear any users assigned to this template first
    await db.update(schema.users).set({ roleTemplateId: null }).where(eq(schema.users.roleTemplateId as any, id));
    const result = await db.delete(schema.roleTemplates).where(eq(schema.roleTemplates.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(schema.orders).values(order).returning();
    return created;
  }

  async updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const [order] = await db.update(schema.orders).set({ ...data, updatedAt: new Date() }).where(eq(schema.orders.id, id)).returning();
    return order;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(schema.orderItems).values(item).returning();
    return created;
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    return db.select().from(schema.invoices).orderBy(desc(schema.invoices.createdAt));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(schema.invoices).values(invoice).returning();
    return created;
  }

  async updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [invoice] = await db.update(schema.invoices).set({ ...data, updatedAt: new Date() }).where(eq(schema.invoices.id, id)).returning();
    return invoice;
  }

  // Approvals
  async getApprovals(): Promise<Approval[]> {
    return db.select().from(schema.approvals).orderBy(desc(schema.approvals.createdAt));
  }

  async getApproval(id: number): Promise<Approval | undefined> {
    const [approval] = await db.select().from(schema.approvals).where(eq(schema.approvals.id, id));
    return approval;
  }

  async createApproval(approval: InsertApproval): Promise<Approval> {
    const [created] = await db.insert(schema.approvals).values(approval).returning();
    return created;
  }

  async updateApproval(id: number, data: Partial<InsertApproval>): Promise<Approval | undefined> {
    const [approval] = await db.update(schema.approvals).set({ ...data, updatedAt: new Date() }).where(eq(schema.approvals.id, id)).returning();
    return approval;
  }

  // Shipments
  async getShipments(): Promise<Shipment[]> {
    return db.select().from(schema.shipments).orderBy(desc(schema.shipments.createdAt));
  }

  async getShipment(id: number): Promise<Shipment | undefined> {
    const [shipment] = await db.select().from(schema.shipments).where(eq(schema.shipments.id, id));
    return shipment;
  }

  async createShipment(shipment: InsertShipment): Promise<Shipment> {
    const [created] = await db.insert(schema.shipments).values(shipment).returning();
    return created;
  }

  async updateShipment(id: number, data: Partial<InsertShipment>): Promise<Shipment | undefined> {
    const [shipment] = await db.update(schema.shipments).set({ ...data, updatedAt: new Date() }).where(eq(schema.shipments.id, id)).returning();
    return shipment;
  }

  // GRNs
  async getGRNs(): Promise<GRN[]> {
    return db.select().from(schema.grns).orderBy(desc(schema.grns.createdAt));
  }

  async getGRN(id: number): Promise<GRN | undefined> {
    const [grn] = await db.select().from(schema.grns).where(eq(schema.grns.id, id));
    return grn;
  }

  async createGRN(grn: InsertGRN): Promise<GRN> {
    const [created] = await db.insert(schema.grns).values(grn).returning();
    return created;
  }

  async updateGRN(id: number, data: Partial<InsertGRN>): Promise<GRN | undefined> {
    const [grn] = await db.update(schema.grns).set(data).where(eq(schema.grns.id, id)).returning();
    return grn;
  }

  async getGRNItems(): Promise<GRNItem[]> {
    return db.select().from(schema.grnItems).orderBy(desc(schema.grnItems.createdAt));
  }

  async getGRNItemsByGRN(grnId: number): Promise<GRNItem[]> {
    return db.select().from(schema.grnItems).where(eq(schema.grnItems.grnId, grnId));
  }

  // Transfers
  async getTransfers(): Promise<Transfer[]> {
    return db.select().from(schema.transfers).orderBy(desc(schema.transfers.createdAt));
  }

  async getTransfer(id: number): Promise<Transfer | undefined> {
    const [transfer] = await db.select().from(schema.transfers).where(eq(schema.transfers.id, id));
    return transfer;
  }

  async createTransfer(transfer: InsertTransfer): Promise<Transfer> {
    const [created] = await db.insert(schema.transfers).values(transfer).returning();
    return created;
  }

  async updateTransfer(id: number, data: Partial<InsertTransfer>): Promise<Transfer | undefined> {
    const [transfer] = await db.update(schema.transfers).set({ ...data, updatedAt: new Date() }).where(eq(schema.transfers.id, id)).returning();
    return transfer;
  }

  async getTransferItems(): Promise<TransferItem[]> {
    return db.select().from(schema.transferItems).orderBy(desc(schema.transferItems.createdAt));
  }

  async getTransferItemsByTransfer(transferId: number): Promise<TransferItem[]> {
    return db.select().from(schema.transferItems).where(eq(schema.transferItems.transferId, transferId));
  }

  // Promo Codes
  async getPromoCodes(): Promise<PromoCode[]> {
    return db.select().from(schema.promoCodes).orderBy(desc(schema.promoCodes.createdAt));
  }

  async getPromoCode(id: number): Promise<PromoCode | undefined> {
    const [code] = await db.select().from(schema.promoCodes).where(eq(schema.promoCodes.id, id));
    return code;
  }

  async createPromoCode(code: InsertPromoCode): Promise<PromoCode> {
    const [created] = await db.insert(schema.promoCodes).values(code).returning();
    return created;
  }

  async updatePromoCode(id: number, data: Partial<InsertPromoCode>): Promise<PromoCode | undefined> {
    const [code] = await db.update(schema.promoCodes).set({ ...data, updatedAt: new Date() }).where(eq(schema.promoCodes.id, id)).returning();
    return code;
  }

  // Clinic Codes
  async getClinicCodes(): Promise<ClinicCode[]> {
    return db.select().from(schema.clinicCodes).orderBy(desc(schema.clinicCodes.createdAt));
  }

  async getClinicCode(id: number): Promise<ClinicCode | undefined> {
    const [code] = await db.select().from(schema.clinicCodes).where(eq(schema.clinicCodes.id, id));
    return code;
  }

  async createClinicCode(code: InsertClinicCode): Promise<ClinicCode> {
    const [created] = await db.insert(schema.clinicCodes).values(code).returning();
    return created;
  }

  async updateClinicCode(id: number, data: Partial<InsertClinicCode>): Promise<ClinicCode | undefined> {
    const [code] = await db.update(schema.clinicCodes).set({ ...data, updatedAt: new Date() }).where(eq(schema.clinicCodes.id, id)).returning();
    return code;
  }

  // Pricing Slabs
  async getPricingSlabs(): Promise<PricingSlab[]> {
    return db.select().from(schema.pricingSlabs).where(eq(schema.pricingSlabs.isActive, true)).orderBy(schema.pricingSlabs.name);
  }

  async getPricingSlab(id: number): Promise<PricingSlab | undefined> {
    const [slab] = await db.select().from(schema.pricingSlabs).where(eq(schema.pricingSlabs.id, id));
    return slab;
  }

  async createPricingSlab(slab: InsertPricingSlab): Promise<PricingSlab> {
    const [created] = await db.insert(schema.pricingSlabs).values(slab).returning();
    return created;
  }

  // Schemes
  async getSchemes(): Promise<Scheme[]> {
    return db.select().from(schema.schemes).orderBy(desc(schema.schemes.createdAt));
  }

  async getScheme(id: number): Promise<Scheme | undefined> {
    const [scheme] = await db.select().from(schema.schemes).where(eq(schema.schemes.id, id));
    return scheme;
  }

  async createScheme(scheme: InsertScheme): Promise<Scheme> {
    const [created] = await db.insert(schema.schemes).values(scheme).returning();
    return created;
  }

  async updateScheme(id: number, data: Partial<InsertScheme>): Promise<Scheme | undefined> {
    const [updated] = await db.update(schema.schemes).set({ ...data, updatedAt: new Date() }).where(eq(schema.schemes.id, id)).returning();
    return updated;
  }

  async deleteScheme(id: number): Promise<boolean> {
    const result = await db.delete(schema.schemes).where(eq(schema.schemes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Carriers
  async getCarriers(): Promise<Carrier[]> {
    return db.select().from(schema.carriers).where(eq(schema.carriers.isActive, true)).orderBy(schema.carriers.name);
  }

  async getCarrier(id: number): Promise<Carrier | undefined> {
    const [carrier] = await db.select().from(schema.carriers).where(eq(schema.carriers.id, id));
    return carrier;
  }

  async createCarrier(carrier: InsertCarrier): Promise<Carrier> {
    const [created] = await db.insert(schema.carriers).values(carrier).returning();
    return created;
  }

  // Notifications
  async getNotifications(userId: number): Promise<Notification[]> {
    return db.select().from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(schema.notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: number): Promise<Notification | undefined> {
    const [notification] = await db.update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.id, id))
      .returning();
    return notification;
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.userId, userId));
  }

  // Audit Logs
  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return db.select().from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit);
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(schema.auditLogs).values(log).returning();
    return created;
  }

  // Access Logs
  async getAccessLogs(limit = 100): Promise<AccessLog[]> {
    return db.select().from(schema.accessLogs)
      .orderBy(desc(schema.accessLogs.createdAt))
      .limit(limit);
  }

  async createAccessLog(log: InsertAccessLog): Promise<AccessLog> {
    const [created] = await db.insert(schema.accessLogs).values(log).returning();
    return created;
  }

  // Returns
  async getReturns(): Promise<Return[]> {
    return db.select().from(schema.returns).orderBy(desc(schema.returns.createdAt));
  }

  async getReturn(id: number): Promise<Return | undefined> {
    const [ret] = await db.select().from(schema.returns).where(eq(schema.returns.id, id));
    return ret;
  }

  async createReturn(ret: InsertReturn): Promise<Return> {
    const [result] = await db.insert(schema.returns).values(ret).returning();
    return result;
  }

  async updateReturn(id: number, data: Partial<InsertReturn>): Promise<Return | undefined> {
    const [result] = await db.update(schema.returns).set({ ...data, updatedAt: new Date() }).where(eq(schema.returns.id, id)).returning();
    return result;
  }

  // Return Items
  async getReturnItems(): Promise<ReturnItem[]> {
    return db.select().from(schema.returnItems).orderBy(schema.returnItems.id);
  }

  async getReturnItemsByReturnId(returnId: number): Promise<ReturnItem[]> {
    return db.select().from(schema.returnItems).where(eq(schema.returnItems.returnId, returnId));
  }

  async createReturnItem(item: InsertReturnItem): Promise<ReturnItem> {
    const [result] = await db.insert(schema.returnItems).values(item).returning();
    return result;
  }

  // Payments
  async getPayments(invoiceId?: number): Promise<Payment[]> {
    if (invoiceId) {
      return db.select().from(schema.payments).where(eq(schema.payments.invoiceId, invoiceId)).orderBy(desc(schema.payments.createdAt));
    }
    return db.select().from(schema.payments).orderBy(desc(schema.payments.createdAt));
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.id, id));
    return payment;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [result] = await db.insert(schema.payments).values(payment).returning();
    return result;
  }

  async updatePayment(id: number, data: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updated] = await db.update(schema.payments).set(data).where(eq(schema.payments.id, id)).returning();
    return updated;
  }

  // Dashboard KPIs
  async getDashboardKPIs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get counts
    const [ordersResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.orders).where(gte(schema.orders.createdAt, today));
    const [pendingOrdersResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.orders).where(eq(schema.orders.status, 'Pending Approval'));
    const [pendingApprovalsResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.approvals).where(eq(schema.approvals.status, 'Pending'));
    const [delayedShipmentsResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.shipments).where(
      and(
        or(eq(schema.shipments.status, 'Pending'), eq(schema.shipments.status, 'Ready for Dispatch')),
        lte(schema.shipments.createdAt, thirtyDaysAgo)
      )
    );
    const [leadsResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.leads).where(eq(schema.leads.stage, 'New'));
    const [doctorsResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.doctors).where(eq(schema.doctors.isActive, true));
    const [productsResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.products).where(eq(schema.products.isActive, true));
    
    // Low stock items
    const [lowStockResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.inventory)
      .innerJoin(schema.products, eq(schema.inventory.productId, schema.products.id))
      .where(sql`${schema.inventory.available} < ${schema.products.minStockThreshold}`);
    
    // Revenue calculations
    const [revenueResult] = await db.select({ 
      total: sql<string>`COALESCE(SUM(${schema.orders.total}), 0)` 
    }).from(schema.orders).where(gte(schema.orders.createdAt, thirtyDaysAgo));
    
    // Inventory value
    const [inventoryValueResult] = await db.select({ 
      total: sql<string>`COALESCE(SUM(${schema.inventory.total}::numeric * COALESCE(${schema.inventory.costPrice}, 0)), 0)` 
    }).from(schema.inventory);

    // AR Aging
    const [overdueResult] = await db.select({ 
      total: sql<string>`COALESCE(SUM(${schema.invoices.amount} - COALESCE(${schema.invoices.paidAmount}, 0)), 0)` 
    }).from(schema.invoices).where(
      and(
        eq(schema.invoices.status, 'Overdue'),
        lte(sql`${schema.invoices.dueDate}::date`, today)
      )
    );
    
    const [ar30Result] = await db.select({ 
      total: sql<string>`COALESCE(SUM(${schema.invoices.amount} - COALESCE(${schema.invoices.paidAmount}, 0)), 0)` 
    }).from(schema.invoices).where(
      and(
        or(eq(schema.invoices.status, 'Pending'), eq(schema.invoices.status, 'Overdue')),
        lte(sql`${schema.invoices.dueDate}::date`, thirtyDaysAgo)
      )
    );
    
    const [ar60Result] = await db.select({ 
      total: sql<string>`COALESCE(SUM(${schema.invoices.amount} - COALESCE(${schema.invoices.paidAmount}, 0)), 0)` 
    }).from(schema.invoices).where(
      and(
        or(eq(schema.invoices.status, 'Pending'), eq(schema.invoices.status, 'Overdue')),
        lte(sql`${schema.invoices.dueDate}::date`, sixtyDaysAgo)
      )
    );
    
    const [ar90Result] = await db.select({ 
      total: sql<string>`COALESCE(SUM(${schema.invoices.amount} - COALESCE(${schema.invoices.paidAmount}, 0)), 0)` 
    }).from(schema.invoices).where(
      and(
        or(eq(schema.invoices.status, 'Pending'), eq(schema.invoices.status, 'Overdue')),
        lte(sql`${schema.invoices.dueDate}::date`, ninetyDaysAgo)
      )
    );

    return {
      ordersToday: Number(ordersResult?.count ?? 0),
      ordersTrend: 12, // Would need historical data for actual trend
      revenueMonth: parseFloat(revenueResult?.total ?? '0'),
      revenueTrend: 8.5, // Would need historical data for actual trend
      inventoryValue: parseFloat(inventoryValueResult?.total ?? '0'),
      lowStockItems: Number(lowStockResult?.count ?? 0),
      pendingApprovals: Number(pendingApprovalsResult?.count ?? 0),
      delayedShipments: Number(delayedShipmentsResult?.count ?? 0),
      overdueAR: parseFloat(overdueResult?.total ?? '0'),
      arAgeing30: parseFloat(ar30Result?.total ?? '0'),
      arAgeing60: parseFloat(ar60Result?.total ?? '0'),
      arAgeing90: parseFloat(ar90Result?.total ?? '0'),
      newLeads: Number(leadsResult?.count ?? 0),
      totalDoctors: Number(doctorsResult?.count ?? 0),
      pendingOrders: Number(pendingOrdersResult?.count ?? 0),
      totalProducts: Number(productsResult?.count ?? 0),
    };
  }

  // MRs (Medical Representatives)
  async getMRs(): Promise<MR[]> {
    return db.select().from(schema.mrs).orderBy(desc(schema.mrs.createdAt));
  }

  async getMR(id: number): Promise<MR | undefined> {
    const [mr] = await db.select().from(schema.mrs).where(eq(schema.mrs.id, id));
    return mr;
  }

  async createMR(mr: InsertMR): Promise<MR> {
    const [created] = await db.insert(schema.mrs).values(mr).returning();
    return created;
  }

  async updateMR(id: number, data: Partial<InsertMR>): Promise<MR | undefined> {
    const [updated] = await db.update(schema.mrs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.mrs.id, id))
      .returning();
    return updated;
  }

  async getMRVisits(mrId?: number): Promise<MRVisit[]> {
    if (mrId !== undefined) {
      return db.select().from(schema.mrVisits)
        .where(eq(schema.mrVisits.mrId, mrId))
        .orderBy(desc(schema.mrVisits.createdAt));
    }
    return db.select().from(schema.mrVisits)
      .orderBy(desc(schema.mrVisits.createdAt));
  }

  async createMRVisit(visit: InsertMRVisit): Promise<MRVisit> {
    const [created] = await db.insert(schema.mrVisits).values(visit).returning();
    // Update MR's visits count and last activity
    await db.update(schema.mrs)
      .set({ 
        visitsLogged: sql`${schema.mrs.visitsLogged} + 1`,
        lastActivity: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.mrs.id, visit.mrId));
    return created;
  }

  async getMRAttendance(mrId: number): Promise<MRAttendance[]> {
    return db.select().from(schema.mrAttendance)
      .where(eq(schema.mrAttendance.mrId, mrId))
      .orderBy(desc(schema.mrAttendance.date));
  }

  async createMRAttendance(attendance: InsertMRAttendance): Promise<MRAttendance> {
    const [created] = await db.insert(schema.mrAttendance).values(attendance).returning();
    return created;
  }

  async getMRTargets(mrId: number): Promise<MRTarget[]> {
    return db.select().from(schema.mrTargets)
      .where(eq(schema.mrTargets.mrId, mrId))
      .orderBy(desc(schema.mrTargets.period));
  }

  async getAllMRTargets(): Promise<MRTarget[]> {
    return db.select().from(schema.mrTargets)
      .orderBy(desc(schema.mrTargets.period));
  }

  async createMRTarget(target: InsertMRTarget): Promise<MRTarget> {
    const [created] = await db.insert(schema.mrTargets).values(target).returning();
    return created;
  }

  async updateMRTarget(id: number, data: Partial<InsertMRTarget>): Promise<MRTarget | undefined> {
    const [updated] = await db.update(schema.mrTargets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.mrTargets.id, id))
      .returning();
    return updated;
  }

  async getTerritories(): Promise<string[]> {
    const result = await db.selectDistinct({ territory: schema.mrs.territory }).from(schema.mrs);
    return result.map(r => r.territory);
  }

  // Employees
  async getEmployees(): Promise<Employee[]> {
    return db.select().from(schema.employees).orderBy(desc(schema.employees.createdAt));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(schema.employees).where(eq(schema.employees.id, id));
    return employee;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [created] = await db.insert(schema.employees).values(employee).returning();
    return created;
  }

  async updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updated] = await db.update(schema.employees)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.employees.id, id))
      .returning();
    return updated;
  }

  // HR Attendance
  async getHRAttendance(date?: string): Promise<HRAttendance[]> {
    if (date) {
      const dateObj = new Date(date);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      return db.select().from(schema.hrAttendance)
        .where(and(gte(schema.hrAttendance.date, dateObj), lte(schema.hrAttendance.date, nextDay)))
        .orderBy(desc(schema.hrAttendance.date));
    }
    return db.select().from(schema.hrAttendance).orderBy(desc(schema.hrAttendance.date));
  }

  async getHRAttendanceByEmployee(employeeId: number): Promise<HRAttendance[]> {
    return db.select().from(schema.hrAttendance)
      .where(eq(schema.hrAttendance.employeeId, employeeId))
      .orderBy(desc(schema.hrAttendance.date));
  }

  async getHRAttendanceRange(startDate: string, endDate: string): Promise<HRAttendance[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    return db.select().from(schema.hrAttendance)
      .where(and(gte(schema.hrAttendance.date, start), lte(schema.hrAttendance.date, end)))
      .orderBy(desc(schema.hrAttendance.date));
  }

  async createHRAttendance(attendance: InsertHRAttendance): Promise<HRAttendance> {
    const [created] = await db.insert(schema.hrAttendance).values(attendance).returning();
    return created;
  }

  async updateHRAttendance(id: number, data: Partial<InsertHRAttendance>): Promise<HRAttendance | undefined> {
    const [updated] = await db.update(schema.hrAttendance)
      .set(data)
      .where(eq(schema.hrAttendance.id, id))
      .returning();
    return updated;
  }

  // Leave Management
  async getLeaveRequests(): Promise<LeaveRequest[]> {
    return db.select().from(schema.leaveRequests).orderBy(desc(schema.leaveRequests.createdAt));
  }

  async getLeaveRequestsByEmployee(employeeId: number): Promise<LeaveRequest[]> {
    return db.select().from(schema.leaveRequests)
      .where(eq(schema.leaveRequests.employeeId, employeeId))
      .orderBy(desc(schema.leaveRequests.createdAt));
  }

  async getLeaveRequestsByApprover(approverId: number): Promise<LeaveRequest[]> {
    return db.select().from(schema.leaveRequests)
      .where(eq(schema.leaveRequests.approverId, approverId))
      .orderBy(desc(schema.leaveRequests.createdAt));
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const [created] = await db.insert(schema.leaveRequests).values(request).returning();
    return created;
  }

  async updateLeaveRequest(id: number, data: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined> {
    const [updated] = await db.update(schema.leaveRequests)
      .set(data)
      .where(eq(schema.leaveRequests.id, id))
      .returning();
    return updated;
  }

  async getLeaveBalances(employeeId?: number, year?: number): Promise<LeaveBalance[]> {
    const conditions = [];
    if (employeeId) conditions.push(eq(schema.leaveBalances.employeeId, employeeId));
    if (year) conditions.push(eq(schema.leaveBalances.year, year));
    if (conditions.length > 0) {
      return db.select().from(schema.leaveBalances).where(and(...conditions));
    }
    return db.select().from(schema.leaveBalances);
  }

  async createLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance> {
    const [created] = await db.insert(schema.leaveBalances).values(balance).returning();
    return created;
  }

  async updateLeaveBalance(id: number, data: Partial<InsertLeaveBalance>): Promise<LeaveBalance | undefined> {
    const [updated] = await db.update(schema.leaveBalances)
      .set(data)
      .where(eq(schema.leaveBalances.id, id))
      .returning();
    return updated;
  }

  async getCompanyHolidays(year?: number): Promise<CompanyHoliday[]> {
    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      return db.select().from(schema.companyHolidays)
        .where(and(gte(schema.companyHolidays.date, startOfYear), lte(schema.companyHolidays.date, endOfYear)))
        .orderBy(schema.companyHolidays.date);
    }
    return db.select().from(schema.companyHolidays).orderBy(schema.companyHolidays.date);
  }

  async createCompanyHoliday(holiday: InsertCompanyHoliday): Promise<CompanyHoliday> {
    const [created] = await db.insert(schema.companyHolidays).values(holiday).returning();
    return created;
  }

  async updateCompanyHoliday(id: number, data: Partial<InsertCompanyHoliday>): Promise<CompanyHoliday | undefined> {
    const [updated] = await db.update(schema.companyHolidays)
      .set(data)
      .where(eq(schema.companyHolidays.id, id))
      .returning();
    return updated;
  }

  async deleteCompanyHoliday(id: number): Promise<boolean> {
    const result = await db.delete(schema.companyHolidays).where(eq(schema.companyHolidays.id, id));
    return true;
  }

  // Compliance
  async getComplianceItems(): Promise<ComplianceItem[]> {
    return db.select().from(schema.complianceItems).orderBy(desc(schema.complianceItems.createdAt));
  }

  async getComplianceItem(id: number): Promise<ComplianceItem | undefined> {
    const [item] = await db.select().from(schema.complianceItems).where(eq(schema.complianceItems.id, id));
    return item;
  }

  async createComplianceItem(item: InsertComplianceItem): Promise<ComplianceItem> {
    const [created] = await db.insert(schema.complianceItems).values(item).returning();
    return created;
  }

  async updateComplianceItem(id: number, data: Partial<InsertComplianceItem>): Promise<ComplianceItem | undefined> {
    const [updated] = await db.update(schema.complianceItems)
      .set({ ...data, lastUpdated: new Date() })
      .where(eq(schema.complianceItems.id, id))
      .returning();
    return updated;
  }

  // Licenses
  async getLicenses(): Promise<License[]> {
    return db.select().from(schema.licenses).orderBy(desc(schema.licenses.createdAt));
  }

  async getLicense(id: number): Promise<License | undefined> {
    const [license] = await db.select().from(schema.licenses).where(eq(schema.licenses.id, id));
    return license;
  }

  async createLicense(license: InsertLicense): Promise<License> {
    const [created] = await db.insert(schema.licenses).values(license).returning();
    return created;
  }

  async updateLicense(id: number, data: Partial<InsertLicense>): Promise<License | undefined> {
    const [updated] = await db.update(schema.licenses)
      .set(data)
      .where(eq(schema.licenses.id, id))
      .returning();
    return updated;
  }

  // Credit Notes
  async getCreditNotes(): Promise<CreditNote[]> {
    return db.select().from(schema.creditNotes).orderBy(desc(schema.creditNotes.createdAt));
  }

  async getCreditNote(id: number): Promise<CreditNote | undefined> {
    const [creditNote] = await db.select().from(schema.creditNotes).where(eq(schema.creditNotes.id, id));
    return creditNote;
  }

  async createCreditNote(creditNote: InsertCreditNote): Promise<CreditNote> {
    const [created] = await db.insert(schema.creditNotes).values(creditNote).returning();
    return created;
  }

  async updateCreditNote(id: number, data: Partial<InsertCreditNote>): Promise<CreditNote | undefined> {
    const [updated] = await db.update(schema.creditNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.creditNotes.id, id))
      .returning();
    return updated;
  }

  // Tax HSN Codes
  async getTaxHSNCodes(): Promise<TaxHSNCode[]> {
    return db.select().from(schema.taxHSNCodes).orderBy(schema.taxHSNCodes.hsnCode);
  }

  async getTaxHSNCode(id: number): Promise<TaxHSNCode | undefined> {
    const [code] = await db.select().from(schema.taxHSNCodes).where(eq(schema.taxHSNCodes.id, id));
    return code;
  }

  async createTaxHSNCode(code: InsertTaxHSNCode): Promise<TaxHSNCode> {
    const [created] = await db.insert(schema.taxHSNCodes).values(code).returning();
    return created;
  }

  async updateTaxHSNCode(id: number, data: Partial<InsertTaxHSNCode>): Promise<TaxHSNCode | undefined> {
    const [updated] = await db.update(schema.taxHSNCodes)
      .set(data)
      .where(eq(schema.taxHSNCodes.id, id))
      .returning();
    return updated;
  }

  // Territories (full CRUD)
  async getTerritoriesList(): Promise<Territory[]> {
    return db.select().from(schema.territories).orderBy(schema.territories.name);
  }

  async getTerritory(id: number): Promise<Territory | undefined> {
    const [territory] = await db.select().from(schema.territories).where(eq(schema.territories.id, id));
    return territory;
  }

  async createTerritory(territory: InsertTerritory): Promise<Territory> {
    const [created] = await db.insert(schema.territories).values(territory).returning();
    return created;
  }

  async updateTerritory(id: number, data: Partial<InsertTerritory>): Promise<Territory | undefined> {
    const [updated] = await db.update(schema.territories)
      .set(data)
      .where(eq(schema.territories.id, id))
      .returning();
    return updated;
  }

  // AR Ageing Report - calculates real-time from invoices and payments
  async getARAgeing(): Promise<{
    customerId: number;
    customerName: string;
    customerType: 'doctor' | 'pharmacy';
    totalOutstanding: number;
    current: number;
    days30: number;
    days60: number;
    days90: number;
    days90Plus: number;
    lastPaymentDate: string | null;
    creditLimit: number;
  }[]> {
    const now = new Date();
    const invoices = await db.select().from(schema.invoices).where(
      or(eq(schema.invoices.status, 'Pending'), eq(schema.invoices.status, 'Partially Paid'), eq(schema.invoices.status, 'Overdue'))
    );
    const doctors = await db.select().from(schema.doctors);
    const pharmacies = await db.select().from(schema.pharmacies);
    let payments: typeof schema.payments.$inferSelect[] = [];
    try {
      payments = await db.select().from(schema.payments);
    } catch (_e) {
      // payments query is optional — proceed without last-payment data
    }

    const customerMap = new Map<string, {
      customerId: number;
      customerName: string;
      customerType: 'doctor' | 'pharmacy';
      current: number;
      days30: number;
      days60: number;
      days90: number;
      days90Plus: number;
      lastPaymentDate: string | null;
      creditLimit: number;
    }>();

    for (const inv of invoices) {
      const outstanding = Number(inv.amount) - Number(inv.paidAmount || 0);
      if (outstanding <= 0) continue;

      const dueDate = new Date(inv.dueDate);
      const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      let doctor = null, pharmacy = null, key = '', name = '', type: 'doctor' | 'pharmacy' = 'doctor', creditLimit = 0;
      if (inv.doctorId) {
        doctor = doctors.find(d => d.id === inv.doctorId);
        if (doctor) {
          key = `doctor-${doctor.id}`;
          name = doctor.name;
          type = 'doctor';
          creditLimit = Number(doctor.creditLimit || 0);
        }
      } else if (inv.pharmacyId) {
        pharmacy = pharmacies.find(p => p.id === inv.pharmacyId);
        if (pharmacy) {
          key = `pharmacy-${pharmacy.id}`;
          name = pharmacy.name;
          type = 'pharmacy';
          creditLimit = Number(pharmacy.creditLimit || 0);
        }
      }
      if (!key) continue;

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerId: type === 'doctor' ? inv.doctorId! : inv.pharmacyId!,
          customerName: name,
          customerType: type,
          current: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          days90Plus: 0,
          lastPaymentDate: null,
          creditLimit,
        });
      }

      const entry = customerMap.get(key)!;
      if (daysPastDue <= 0) {
        entry.current += outstanding;
      } else if (daysPastDue <= 30) {
        entry.days30 += outstanding;
      } else if (daysPastDue <= 60) {
        entry.days60 += outstanding;
      } else if (daysPastDue <= 90) {
        entry.days90 += outstanding;
      } else {
        entry.days90Plus += outstanding;
      }

      // Find last payment for this invoice
      const invPayments = payments.filter(p => p.invoiceId === inv.id);
      for (const p of invPayments) {
        const payDate = new Date(p.createdAt).toISOString();
        if (!entry.lastPaymentDate || payDate > entry.lastPaymentDate) {
          entry.lastPaymentDate = payDate;
        }
      }
    }

    return Array.from(customerMap.values()).map(e => ({
      ...e,
      totalOutstanding: e.current + e.days30 + e.days60 + e.days90 + e.days90Plus,
    }));
  }

  // Settings
  async getSettings(): Promise<Settings[]> {
    return db.select().from(schema.settings).orderBy(schema.settings.category, schema.settings.key);
  }

  async getSetting(key: string): Promise<Settings | undefined> {
    const [setting] = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
    return setting;
  }

  async upsertSetting(key: string, value: string, category = 'general', description?: string): Promise<Settings> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db.update(schema.settings)
        .set({ value, category, description, updatedAt: new Date() })
        .where(eq(schema.settings.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(schema.settings).values({ key, value, category, description }).returning();
    return created;
  }

  // Data Masking Rules
  async getDataMaskingRules(): Promise<DataMaskingRule[]> {
    return db.select().from(schema.dataMaskingRules).orderBy(schema.dataMaskingRules.entity);
  }

  async getDataMaskingRule(id: number): Promise<DataMaskingRule | undefined> {
    const [rule] = await db.select().from(schema.dataMaskingRules).where(eq(schema.dataMaskingRules.id, id));
    return rule;
  }

  async createDataMaskingRule(rule: InsertDataMaskingRule): Promise<DataMaskingRule> {
    const [created] = await db.insert(schema.dataMaskingRules).values(rule).returning();
    return created;
  }

  async updateDataMaskingRule(id: number, data: Partial<InsertDataMaskingRule>): Promise<DataMaskingRule | undefined> {
    const [updated] = await db.update(schema.dataMaskingRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.dataMaskingRules.id, id))
      .returning();
    return updated;
  }

  async deleteDataMaskingRule(id: number): Promise<boolean> {
    const result = await db.delete(schema.dataMaskingRules).where(eq(schema.dataMaskingRules.id, id));
    return true;
  }

  // Export Controls
  async getExportControls(): Promise<ExportControl[]> {
    return db.select().from(schema.exportControls).orderBy(schema.exportControls.entity);
  }

  async getExportControl(id: number): Promise<ExportControl | undefined> {
    const [control] = await db.select().from(schema.exportControls).where(eq(schema.exportControls.id, id));
    return control;
  }

  async createExportControl(control: InsertExportControl): Promise<ExportControl> {
    const [created] = await db.insert(schema.exportControls).values(control).returning();
    return created;
  }

  async updateExportControl(id: number, data: Partial<InsertExportControl>): Promise<ExportControl | undefined> {
    const [updated] = await db.update(schema.exportControls)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.exportControls.id, id))
      .returning();
    return updated;
  }

  async deleteExportControl(id: number): Promise<boolean> {
    await db.delete(schema.exportControls).where(eq(schema.exportControls.id, id));
    return true;
  }

  // Saved Reports
  async getSavedReports(): Promise<SavedReport[]> {
    return db.select().from(schema.savedReports).orderBy(desc(schema.savedReports.createdAt));
  }

  async getSavedReport(id: number): Promise<SavedReport | undefined> {
    const [report] = await db.select().from(schema.savedReports).where(eq(schema.savedReports.id, id));
    return report;
  }

  async createSavedReport(report: InsertSavedReport): Promise<SavedReport> {
    const [created] = await db.insert(schema.savedReports).values(report).returning();
    return created;
  }

  async updateSavedReport(id: number, data: Partial<InsertSavedReport>): Promise<SavedReport | undefined> {
    const [updated] = await db.update(schema.savedReports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.savedReports.id, id))
      .returning();
    return updated;
  }

  async deleteSavedReport(id: number): Promise<boolean> {
    await db.delete(schema.savedReports).where(eq(schema.savedReports.id, id));
    return true;
  }

  // Integrations
  async getIntegrations(): Promise<Integration[]> {
    return db.select().from(schema.integrations).orderBy(schema.integrations.name);
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    const [integration] = await db.select().from(schema.integrations).where(eq(schema.integrations.id, id));
    return integration;
  }

  async createIntegration(integration: InsertIntegration): Promise<Integration> {
    const [created] = await db.insert(schema.integrations).values(integration).returning();
    return created;
  }

  async updateIntegration(id: number, data: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const [updated] = await db.update(schema.integrations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.integrations.id, id))
      .returning();
    return updated;
  }

  // Import Jobs
  async getImportJobs(): Promise<ImportJob[]> {
    return db.select().from(schema.importJobs).orderBy(desc(schema.importJobs.createdAt));
  }

  async getImportJob(id: number): Promise<ImportJob | undefined> {
    const [job] = await db.select().from(schema.importJobs).where(eq(schema.importJobs.id, id));
    return job;
  }

  async createImportJob(job: InsertImportJob): Promise<ImportJob> {
    const [created] = await db.insert(schema.importJobs).values(job).returning();
    return created;
  }

  async updateImportJob(id: number, data: Partial<InsertImportJob>): Promise<ImportJob | undefined> {
    const [updated] = await db.update(schema.importJobs)
      .set(data)
      .where(eq(schema.importJobs.id, id))
      .returning();
    return updated;
  }

  // Export Templates
  async getExportTemplates(): Promise<ExportTemplate[]> {
    return db.select().from(schema.exportTemplates).orderBy(schema.exportTemplates.entity, schema.exportTemplates.name);
  }

  async getExportTemplate(id: number): Promise<ExportTemplate | undefined> {
    const [template] = await db.select().from(schema.exportTemplates).where(eq(schema.exportTemplates.id, id));
    return template;
  }

  async createExportTemplate(template: InsertExportTemplate): Promise<ExportTemplate> {
    const [created] = await db.insert(schema.exportTemplates).values(template).returning();
    return created;
  }

  async updateExportTemplate(id: number, data: Partial<InsertExportTemplate>): Promise<ExportTemplate | undefined> {
    const [updated] = await db.update(schema.exportTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.exportTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteExportTemplate(id: number): Promise<boolean> {
    await db.delete(schema.exportTemplates).where(eq(schema.exportTemplates.id, id));
    return true;
  }

  // Picking Tasks
  async getPickingTasks(): Promise<PickingTask[]> {
    return db.select().from(schema.pickingTasks).orderBy(desc(schema.pickingTasks.createdAt));
  }

  async getPickingTask(id: number): Promise<PickingTask | undefined> {
    const [task] = await db.select().from(schema.pickingTasks).where(eq(schema.pickingTasks.id, id));
    return task;
  }

  async createPickingTask(task: InsertPickingTask): Promise<PickingTask> {
    const [created] = await db.insert(schema.pickingTasks).values(task).returning();
    return created;
  }

  async updatePickingTask(id: number, data: Partial<InsertPickingTask>): Promise<PickingTask | undefined> {
    const [updated] = await db.update(schema.pickingTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.pickingTasks.id, id))
      .returning();
    return updated;
  }

  async deletePickingTask(id: number): Promise<boolean> {
    await db.delete(schema.pickingTasks).where(eq(schema.pickingTasks.id, id));
    return true;
  }

  // Packing Tasks
  async getPackingTasks(): Promise<PackingTask[]> {
    return db.select().from(schema.packingTasks).orderBy(desc(schema.packingTasks.createdAt));
  }

  async getPackingTask(id: number): Promise<PackingTask | undefined> {
    const [task] = await db.select().from(schema.packingTasks).where(eq(schema.packingTasks.id, id));
    return task;
  }

  async createPackingTask(task: InsertPackingTask): Promise<PackingTask> {
    const [created] = await db.insert(schema.packingTasks).values(task).returning();
    return created;
  }

  async updatePackingTask(id: number, data: Partial<InsertPackingTask>): Promise<PackingTask | undefined> {
    const [updated] = await db.update(schema.packingTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.packingTasks.id, id))
      .returning();
    return updated;
  }

  async deletePackingTask(id: number): Promise<boolean> {
    await db.delete(schema.packingTasks).where(eq(schema.packingTasks.id, id));
    return true;
  }

  // Dispatch Tasks
  async getDispatchTasks(): Promise<DispatchTask[]> {
    return db.select().from(schema.dispatchTasks).orderBy(desc(schema.dispatchTasks.createdAt));
  }

  async getDispatchTask(id: number): Promise<DispatchTask | undefined> {
    const [task] = await db.select().from(schema.dispatchTasks).where(eq(schema.dispatchTasks.id, id));
    return task;
  }

  async createDispatchTask(task: InsertDispatchTask): Promise<DispatchTask> {
    const [created] = await db.insert(schema.dispatchTasks).values(task).returning();
    return created;
  }

  async updateDispatchTask(id: number, data: Partial<InsertDispatchTask>): Promise<DispatchTask | undefined> {
    const [updated] = await db.update(schema.dispatchTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.dispatchTasks.id, id))
      .returning();
    return updated;
  }

  async deleteDispatchTask(id: number): Promise<boolean> {
    await db.delete(schema.dispatchTasks).where(eq(schema.dispatchTasks.id, id));
    return true;
  }

  // Report Templates
  async getReportTemplates(): Promise<ReportTemplate[]> {
    return db.select().from(schema.reportTemplates).orderBy(desc(schema.reportTemplates.createdAt));
  }

  async getReportTemplate(id: number): Promise<ReportTemplate | undefined> {
    const [template] = await db.select().from(schema.reportTemplates).where(eq(schema.reportTemplates.id, id));
    return template;
  }

  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const [created] = await db.insert(schema.reportTemplates).values(template).returning();
    return created;
  }

  async updateReportTemplate(id: number, data: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined> {
    const [updated] = await db.update(schema.reportTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.reportTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteReportTemplate(id: number): Promise<boolean> {
    await db.delete(schema.reportTemplates).where(eq(schema.reportTemplates.id, id));
    return true;
  }

  // Export Jobs
  async getExportJobs(): Promise<ExportJob[]> {
    return db.select().from(schema.exportJobs).orderBy(desc(schema.exportJobs.createdAt));
  }

  async getExportJob(id: number): Promise<ExportJob | undefined> {
    const [job] = await db.select().from(schema.exportJobs).where(eq(schema.exportJobs.id, id));
    return job;
  }

  async createExportJob(job: InsertExportJob): Promise<ExportJob> {
    const [created] = await db.insert(schema.exportJobs).values(job).returning();
    return created;
  }

  async updateExportJob(id: number, data: Partial<InsertExportJob>): Promise<ExportJob | undefined> {
    const [updated] = await db.update(schema.exportJobs)
      .set(data)
      .where(eq(schema.exportJobs.id, id))
      .returning();
    return updated;
  }

  async getARCollectionAccounts(): Promise<ARCollectionAccount[]> {
    return db.select().from(schema.arCollectionAccounts);
  }

  async getARCollectionAccount(customerId: number, customerType: string): Promise<ARCollectionAccount | undefined> {
    const [account] = await db.select().from(schema.arCollectionAccounts)
      .where(and(
        eq(schema.arCollectionAccounts.customerId, customerId),
        eq(schema.arCollectionAccounts.customerType, customerType)
      ));
    return account;
  }

  async upsertARCollectionAccount(customerId: number, customerType: string, data: Partial<InsertARCollectionAccount>): Promise<ARCollectionAccount> {
    const existing = await this.getARCollectionAccount(customerId, customerType);
    if (existing) {
      const [updated] = await db.update(schema.arCollectionAccounts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(schema.arCollectionAccounts.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(schema.arCollectionAccounts)
      .values({ customerId, customerType, ...data })
      .returning();
    return created;
  }
  // ============== ONBOARDING CHECKLISTS ==============
  async getOnboardingChecklists(employeeId?: number): Promise<OnboardingChecklist[]> {
    if (employeeId) {
      return db.select().from(schema.onboardingChecklists)
        .where(eq(schema.onboardingChecklists.employeeId, employeeId))
        .orderBy(schema.onboardingChecklists.createdAt);
    }
    return db.select().from(schema.onboardingChecklists).orderBy(desc(schema.onboardingChecklists.createdAt));
  }

  async getOnboardingChecklist(id: number): Promise<OnboardingChecklist | undefined> {
    const [item] = await db.select().from(schema.onboardingChecklists).where(eq(schema.onboardingChecklists.id, id));
    return item;
  }

  async createOnboardingChecklist(item: InsertOnboardingChecklist): Promise<OnboardingChecklist> {
    const [created] = await db.insert(schema.onboardingChecklists).values(item).returning();
    return created;
  }

  async updateOnboardingChecklist(id: number, data: Partial<InsertOnboardingChecklist>): Promise<OnboardingChecklist | undefined> {
    const [updated] = await db.update(schema.onboardingChecklists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.onboardingChecklists.id, id))
      .returning();
    return updated;
  }

  async deleteOnboardingChecklist(id: number): Promise<boolean> {
    const result = await db.delete(schema.onboardingChecklists).where(eq(schema.onboardingChecklists.id, id));
    return true;
  }

  // ============== EXIT WORKFLOWS ==============
  async getExitWorkflows(employeeId?: number): Promise<ExitWorkflow[]> {
    if (employeeId) {
      return db.select().from(schema.exitWorkflows)
        .where(eq(schema.exitWorkflows.employeeId, employeeId))
        .orderBy(desc(schema.exitWorkflows.createdAt));
    }
    return db.select().from(schema.exitWorkflows).orderBy(desc(schema.exitWorkflows.createdAt));
  }

  async getExitWorkflow(id: number): Promise<ExitWorkflow | undefined> {
    const [item] = await db.select().from(schema.exitWorkflows).where(eq(schema.exitWorkflows.id, id));
    return item;
  }

  async createExitWorkflow(workflow: InsertExitWorkflow): Promise<ExitWorkflow> {
    const [created] = await db.insert(schema.exitWorkflows).values(workflow).returning();
    return created;
  }

  async updateExitWorkflow(id: number, data: Partial<InsertExitWorkflow>): Promise<ExitWorkflow | undefined> {
    const [updated] = await db.update(schema.exitWorkflows)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.exitWorkflows.id, id))
      .returning();
    return updated;
  }

  // ============== EMERGENCY CONTACTS ==============
  async getEmergencyContacts(employeeId: number): Promise<EmergencyContact[]> {
    return db.select().from(schema.emergencyContacts)
      .where(eq(schema.emergencyContacts.employeeId, employeeId))
      .orderBy(schema.emergencyContacts.createdAt);
  }

  async createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact> {
    const [created] = await db.insert(schema.emergencyContacts).values(contact).returning();
    return created;
  }

  async updateEmergencyContact(id: number, data: Partial<InsertEmergencyContact>): Promise<EmergencyContact | undefined> {
    const [updated] = await db.update(schema.emergencyContacts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.emergencyContacts.id, id))
      .returning();
    return updated;
  }

  async deleteEmergencyContact(id: number): Promise<boolean> {
    await db.delete(schema.emergencyContacts).where(eq(schema.emergencyContacts.id, id));
    return true;
  }

  // Report Usage Logs
  async getReportUsageLogs(): Promise<ReportUsageLog[]> {
    return db.select().from(schema.reportUsageLogs).orderBy(desc(schema.reportUsageLogs.createdAt));
  }

  async createReportUsageLog(log: InsertReportUsageLog): Promise<ReportUsageLog> {
    const [created] = await db.insert(schema.reportUsageLogs).values(log).returning();
    return created;
  }

  // Regulatory Audit Logs
  async getRegulatoryAuditLogs(): Promise<RegulatoryAuditLog[]> {
    return db.select().from(schema.regulatoryAuditLogs).orderBy(desc(schema.regulatoryAuditLogs.createdAt));
  }

  async createRegulatoryAuditLog(log: InsertRegulatoryAuditLog): Promise<RegulatoryAuditLog> {
    const [created] = await db.insert(schema.regulatoryAuditLogs).values(log).returning();
    return created;
  }

  // Suspicious Activities
  async getSuspiciousActivities(): Promise<SuspiciousActivity[]> {
    return db.select().from(schema.suspiciousActivities).orderBy(desc(schema.suspiciousActivities.createdAt));
  }

  async createSuspiciousActivity(activity: InsertSuspiciousActivity): Promise<SuspiciousActivity> {
    const [created] = await db.insert(schema.suspiciousActivities).values(activity).returning();
    return created;
  }

  async updateSuspiciousActivity(id: number, data: Partial<InsertSuspiciousActivity>): Promise<SuspiciousActivity | undefined> {
    const [updated] = await db.update(schema.suspiciousActivities).set(data).where(eq(schema.suspiciousActivities.id, id)).returning();
    return updated;
  }

  // Data Retention Policies
  async getDataRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    return db.select().from(schema.dataRetentionPolicies).orderBy(desc(schema.dataRetentionPolicies.createdAt));
  }

  async createDataRetentionPolicy(policy: InsertDataRetentionPolicy): Promise<DataRetentionPolicy> {
    const [created] = await db.insert(schema.dataRetentionPolicies).values(policy).returning();
    return created;
  }

  async updateDataRetentionPolicy(id: number, data: Partial<InsertDataRetentionPolicy>): Promise<DataRetentionPolicy | undefined> {
    const [updated] = await db.update(schema.dataRetentionPolicies).set(data).where(eq(schema.dataRetentionPolicies.id, id)).returning();
    return updated;
  }

  async deleteDataRetentionPolicy(id: number): Promise<boolean> {
    await db.delete(schema.dataRetentionPolicies).where(eq(schema.dataRetentionPolicies.id, id));
    return true;
  }

  // Masked Data Access Logs
  async getMaskedDataAccessLogs(): Promise<MaskedDataAccessLog[]> {
    return db.select().from(schema.maskedDataAccessLogs).orderBy(desc(schema.maskedDataAccessLogs.createdAt));
  }

  async createMaskedDataAccessLog(log: InsertMaskedDataAccessLog): Promise<MaskedDataAccessLog> {
    const [created] = await db.insert(schema.maskedDataAccessLogs).values(log).returning();
    return created;
  }

  // Login History
  async getLoginHistory(userId?: number): Promise<LoginHistory[]> {
    if (userId) {
      return db.select().from(schema.loginHistory).where(eq(schema.loginHistory.userId, userId)).orderBy(desc(schema.loginHistory.createdAt));
    }
    return db.select().from(schema.loginHistory).orderBy(desc(schema.loginHistory.createdAt));
  }

  async createLoginHistory(entry: InsertLoginHistory): Promise<LoginHistory> {
    const [created] = await db.insert(schema.loginHistory).values(entry).returning();
    return created;
  }

  // Territory Boundaries
  async getTerritoryBoundaries(territoryId?: number): Promise<TerritoryBoundary[]> {
    if (territoryId) {
      return db.select().from(schema.territoryBoundaries).where(eq(schema.territoryBoundaries.territoryId, territoryId)).orderBy(desc(schema.territoryBoundaries.createdAt));
    }
    return db.select().from(schema.territoryBoundaries).orderBy(desc(schema.territoryBoundaries.createdAt));
  }

  async createTerritoryBoundary(boundary: InsertTerritoryBoundary): Promise<TerritoryBoundary> {
    const [created] = await db.insert(schema.territoryBoundaries).values(boundary).returning();
    return created;
  }

  async updateTerritoryBoundary(id: number, data: Partial<InsertTerritoryBoundary>): Promise<TerritoryBoundary | undefined> {
    const [updated] = await db.update(schema.territoryBoundaries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.territoryBoundaries.id, id))
      .returning();
    return updated;
  }

  async deleteTerritoryBoundary(id: number): Promise<boolean> {
    await db.delete(schema.territoryBoundaries).where(eq(schema.territoryBoundaries.id, id));
    return true;
  }

  // Integration Sync Runs
  async getIntegrationSyncRuns(integrationId?: number): Promise<IntegrationSyncRun[]> {
    if (integrationId) {
      return db.select().from(schema.integrationSyncRuns).where(eq(schema.integrationSyncRuns.integrationId, integrationId)).orderBy(desc(schema.integrationSyncRuns.startedAt));
    }
    return db.select().from(schema.integrationSyncRuns).orderBy(desc(schema.integrationSyncRuns.startedAt));
  }

  async createIntegrationSyncRun(run: InsertIntegrationSyncRun): Promise<IntegrationSyncRun> {
    const [created] = await db.insert(schema.integrationSyncRuns).values(run).returning();
    return created;
  }

  async updateIntegrationSyncRun(id: number, data: Partial<InsertIntegrationSyncRun>): Promise<IntegrationSyncRun | undefined> {
    const [updated] = await db.update(schema.integrationSyncRuns)
      .set(data)
      .where(eq(schema.integrationSyncRuns.id, id))
      .returning();
    return updated;
  }

  // Integration Webhook Events
  async getIntegrationWebhookEvents(integrationId?: number): Promise<IntegrationWebhookEvent[]> {
    if (integrationId) {
      return db.select().from(schema.integrationWebhookEvents).where(eq(schema.integrationWebhookEvents.integrationId, integrationId)).orderBy(desc(schema.integrationWebhookEvents.receivedAt));
    }
    return db.select().from(schema.integrationWebhookEvents).orderBy(desc(schema.integrationWebhookEvents.receivedAt));
  }

  async createIntegrationWebhookEvent(event: InsertIntegrationWebhookEvent): Promise<IntegrationWebhookEvent> {
    const [created] = await db.insert(schema.integrationWebhookEvents).values(event).returning();
    return created;
  }

  // Integration Alerts
  async getIntegrationAlerts(integrationId?: number): Promise<IntegrationAlert[]> {
    if (integrationId) {
      return db.select().from(schema.integrationAlerts).where(eq(schema.integrationAlerts.integrationId, integrationId)).orderBy(desc(schema.integrationAlerts.createdAt));
    }
    return db.select().from(schema.integrationAlerts).orderBy(desc(schema.integrationAlerts.createdAt));
  }

  async createIntegrationAlert(alert: InsertIntegrationAlert): Promise<IntegrationAlert> {
    const [created] = await db.insert(schema.integrationAlerts).values(alert).returning();
    return created;
  }

  async updateIntegrationAlert(id: number, data: Partial<InsertIntegrationAlert>): Promise<IntegrationAlert | undefined> {
    const [updated] = await db.update(schema.integrationAlerts)
      .set(data)
      .where(eq(schema.integrationAlerts.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
