import { db } from "./db";
import * as schema from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function ensureAdminUser() {
  try {
    const existingAdmin = await db.select().from(schema.users).where(eq(schema.users.username, "admin")).limit(1);
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    if (existingAdmin.length === 0) {
      console.log("Creating default admin user...");
      await db.insert(schema.users).values({
        username: "admin",
        email: "admin@monoskin.com",
        password: hashedPassword,
        name: "Super Admin",
        role: "Super Admin",
      });
      console.log("Default admin user created successfully");
      console.log("Login credentials: username: admin, password: admin123");
    } else {
      const admin = existingAdmin[0];
      if (!admin.password.startsWith('$2')) {
        console.log("Updating admin password to proper bcrypt hash...");
        await db.update(schema.users)
          .set({ password: hashedPassword })
          .where(eq(schema.users.id, admin.id));
        console.log("Admin password updated successfully");
      }
    }
    
    // Seed demo data if SEED_DEMO_DATA is not explicitly set to 'false'
    const shouldSeedDemo = process.env.SEED_DEMO_DATA !== 'false';
    if (shouldSeedDemo) {
      await seedDemoData();
    }
  } catch (error) {
    console.error("Error ensuring admin user:", error);
  }
}

async function seedDemoData() {
  try {
    const existingUsers = await db.select().from(schema.users);
    const mrUsers = existingUsers.filter(u => u.role === "Medical Representative");
    const existingDoctors = await db.select().from(schema.doctors);
    const existingWarehouses = await db.select().from(schema.warehouses);
    const existingOrders = await db.select().from(schema.orders);
    const existingEmployees = await db.select().from(schema.employees);
    const existingProducts = await db.select().from(schema.products);
    const existingCarriers = await db.select().from(schema.carriers);
    const existingPricingSlabs = await db.select().from(schema.pricingSlabs);

    const existingMRs = await db.select().from(schema.mrs);
    if (existingMRs.length === 0) {
      console.log("Seeding MRs...");
      const mrsData = await db.insert(schema.mrs).values([
        { name: "Amit Sharma", employeeId: "MR001", phone: "9876543201", email: "amit.mr@monoskin.in", territory: "Madhya Pradesh", region: "Central", reportingManager: "Raj Kumar", managerRole: "RSM", status: "Active", joiningDate: "2022-01-15" },
        { name: "Priya Verma", employeeId: "MR002", phone: "9876543202", email: "priya.mr@monoskin.in", territory: "Maharashtra", region: "West", reportingManager: "Suresh Patel", managerRole: "RSM", status: "Active", joiningDate: "2023-03-20" },
        { name: "Rahul Kapoor", employeeId: "MR003", phone: "9876543203", email: "rahul.mr@monoskin.in", territory: "Delhi NCR", region: "North", reportingManager: "Vikram Yadav", managerRole: "ASM", status: "Active", joiningDate: "2023-06-10" },
        { name: "Sunita Reddy", employeeId: "MR004", phone: "9876543204", email: "sunita.mr@monoskin.in", territory: "Karnataka", region: "South", reportingManager: "Anitha Rao", managerRole: "ASM", status: "Active", joiningDate: "2022-08-05" },
        { name: "Vikram Singh", employeeId: "MR005", phone: "9876543205", email: "vikram.mr@monoskin.in", territory: "West Bengal", region: "East", reportingManager: "Raj Kumar", managerRole: "RSM", status: "Active", joiningDate: "2023-01-10" },
      ]).returning();
      console.log(`Created ${mrsData.length} MRs`);

      if (existingDoctors.length > 0) {
        await db.insert(schema.mrVisits).values([
          { mrId: mrsData[0].id, doctorId: existingDoctors[0]?.id, visitType: "Doctor Visit", outcome: "Positive", notes: "Doctor showed interest in 432one serum", location: "Indore" },
          { mrId: mrsData[0].id, doctorId: existingDoctors[Math.min(2, existingDoctors.length-1)]?.id, visitType: "Doctor Visit", outcome: "Positive", notes: "Placed order for Wecalm and Acnetech", location: "Delhi" },
          { mrId: mrsData[1].id, doctorId: existingDoctors[Math.min(1, existingDoctors.length-1)]?.id, visitType: "Doctor Visit", outcome: "Follow-up Required", notes: "Requested samples of Nanogrow", location: "Mumbai" },
          { mrId: mrsData[2].id, visitType: "Training", outcome: "Positive", notes: "New product training session", location: "Delhi Office" },
          { mrId: mrsData[4].id, visitType: "Conference", outcome: "Positive", notes: "Dermatology conference in Kolkata", location: "Kolkata" },
        ]);
      }

      await db.insert(schema.mrTargets).values([
        { mrId: mrsData[0].id, period: "2024-12", targetType: "Revenue", targetValue: "500000", achievedValue: "420000", status: "On Track" },
        { mrId: mrsData[1].id, period: "2024-12", targetType: "Revenue", targetValue: "450000", achievedValue: "380000", status: "At Risk" },
        { mrId: mrsData[2].id, period: "2024-12", targetType: "Revenue", targetValue: "400000", achievedValue: "350000", status: "At Risk" },
        { mrId: mrsData[3].id, period: "2024-12", targetType: "Revenue", targetValue: "480000", achievedValue: "450000", status: "On Track" },
        { mrId: mrsData[4].id, period: "2024-12", targetType: "Revenue", targetValue: "350000", achievedValue: "280000", status: "At Risk" },
      ]);
    }

    if (existingEmployees.length === 0) {
      const employeesData = await db.insert(schema.employees).values([
        { employeeCode: "EMP001", name: "Amit Sharma", email: "amit.emp@monoskin.in", phone: "9876543231", department: "Sales" as const, role: "Senior MR", joiningDate: new Date("2022-01-15"), status: "Active" as const },
        { employeeCode: "EMP002", name: "Priya Verma", email: "priya.emp@monoskin.in", phone: "9876543232", department: "Sales" as const, role: "MR", joiningDate: new Date("2023-03-20"), status: "Active" as const },
        { employeeCode: "EMP003", name: "Rahul Kapoor", email: "rahul.emp@monoskin.in", phone: "9876543233", department: "Sales" as const, role: "MR", joiningDate: new Date("2023-06-10"), status: "Active" as const },
        { employeeCode: "EMP004", name: "Warehouse Manager", email: "warehouse.emp@monoskin.in", phone: "9876543240", department: "Operations" as const, role: "Manager", joiningDate: new Date("2021-05-01"), status: "Active" as const },
        { employeeCode: "EMP005", name: "Finance Manager", email: "finance.emp@monoskin.in", phone: "9876543250", department: "Finance" as const, role: "Manager", joiningDate: new Date("2021-08-15"), status: "Active" as const },
      ]).returning();

      await db.insert(schema.hrAttendance).values([
        { employeeId: employeesData[0].id, date: new Date("2024-12-18"), checkIn: "09:15", checkOut: "18:30", status: "present", workHours: "9.25", location: "Indore Office" },
        { employeeId: employeesData[1].id, date: new Date("2024-12-18"), checkIn: "09:30", checkOut: "18:45", status: "present", workHours: "9.25", location: "Mumbai Office" },
        { employeeId: employeesData[2].id, date: new Date("2024-12-18"), checkIn: "09:00", checkOut: "18:00", status: "present", workHours: "9.0", location: "Delhi Office" },
      ]);
    }

    const existingLeaveRequests = await db.select().from(schema.leaveRequests);
    if (existingLeaveRequests.length === 0 && existingEmployees.length > 0) {
      await db.insert(schema.leaveRequests).values([
        { employeeId: existingEmployees[0].id, leaveType: 'annual' as const, startDate: new Date("2026-02-20"), endDate: new Date("2026-02-22"), totalDays: "3", reason: "Family function in hometown", status: 'pending' as const },
        { employeeId: existingEmployees[1].id, leaveType: 'sick' as const, startDate: new Date("2026-02-10"), endDate: new Date("2026-02-11"), totalDays: "2", reason: "Fever and cold", status: 'approved' as const },
        { employeeId: existingEmployees[2].id, leaveType: 'casual' as const, startDate: new Date("2026-02-05"), endDate: new Date("2026-02-05"), totalDays: "1", reason: "Personal work", status: 'approved' as const },
        { employeeId: existingEmployees[3].id, leaveType: 'annual' as const, startDate: new Date("2026-03-01"), endDate: new Date("2026-03-05"), totalDays: "5", reason: "Vacation planned", status: 'pending' as const },
        { employeeId: existingEmployees[0].id, leaveType: 'sick' as const, startDate: new Date("2026-01-28"), endDate: new Date("2026-01-29"), totalDays: "2", reason: "Doctor appointment", status: 'rejected' as const },
      ]);

      await db.insert(schema.leaveBalances).values([
        { employeeId: existingEmployees[0].id, leaveType: 'annual' as const, totalAllotted: "18", used: "3", remaining: "15", year: 2026 },
        { employeeId: existingEmployees[0].id, leaveType: 'sick' as const, totalAllotted: "12", used: "2", remaining: "10", year: 2026 },
        { employeeId: existingEmployees[0].id, leaveType: 'casual' as const, totalAllotted: "7", used: "1", remaining: "6", year: 2026 },
        { employeeId: existingEmployees[1].id, leaveType: 'annual' as const, totalAllotted: "18", used: "0", remaining: "18", year: 2026 },
        { employeeId: existingEmployees[1].id, leaveType: 'sick' as const, totalAllotted: "12", used: "2", remaining: "10", year: 2026 },
        { employeeId: existingEmployees[2].id, leaveType: 'annual' as const, totalAllotted: "18", used: "0", remaining: "18", year: 2026 },
        { employeeId: existingEmployees[2].id, leaveType: 'casual' as const, totalAllotted: "7", used: "1", remaining: "6", year: 2026 },
        { employeeId: existingEmployees[3].id, leaveType: 'annual' as const, totalAllotted: "18", used: "5", remaining: "13", year: 2026 },
        { employeeId: existingEmployees[4].id, leaveType: 'annual' as const, totalAllotted: "18", used: "0", remaining: "18", year: 2026 },
      ]);
    }

    const existingHolidays = await db.select().from(schema.companyHolidays);
    if (existingHolidays.length === 0) {
      await db.insert(schema.companyHolidays).values([
        { name: "Republic Day", date: new Date("2026-01-26"), type: "public", isOptional: false },
        { name: "Holi", date: new Date("2026-03-17"), type: "public", isOptional: false },
        { name: "Good Friday", date: new Date("2026-04-03"), type: "public", isOptional: true },
        { name: "Independence Day", date: new Date("2026-08-15"), type: "public", isOptional: false },
        { name: "Gandhi Jayanti", date: new Date("2026-10-02"), type: "public", isOptional: false },
        { name: "Diwali", date: new Date("2026-10-20"), type: "public", isOptional: false },
        { name: "Christmas", date: new Date("2026-12-25"), type: "public", isOptional: false },
      ]);
    }

    const existingCompliance = await db.select().from(schema.complianceItems);
    if (existingCompliance.length === 0) {
      await db.insert(schema.complianceItems).values([
        { category: "Drug License", requirement: "Drug License Renewal - Maharashtra", status: "compliant", dueDate: new Date("2025-06-30"), assignee: "Finance Manager", documents: 3 },
        { category: "GST", requirement: "Monthly GST Filing - December 2024", status: "pending", dueDate: new Date("2025-01-20"), assignee: "Finance Team", documents: 0 },
        { category: "Drug License", requirement: "Drug License Renewal - Delhi", status: "expiring", dueDate: new Date("2025-02-15"), assignee: "Compliance Officer", documents: 2 },
      ]);
    }

    const existingLicenses = await db.select().from(schema.licenses);
    if (existingLicenses.length === 0) {
      await db.insert(schema.licenses).values([
        { name: "Drug License - Maharashtra", type: "Drug License", licenseNumber: "DL-MH-2024-001", issueDate: new Date("2024-01-15"), expiryDate: new Date("2025-06-30"), status: "active", renewalStatus: "not-started" },
        { name: "Drug License - Delhi", type: "Drug License", licenseNumber: "DL-DL-2023-045", issueDate: new Date("2023-02-20"), expiryDate: new Date("2025-02-15"), status: "expiring", renewalStatus: "in-progress" },
        { name: "GST Registration", type: "GST", licenseNumber: "27AXXXX1234X1Z5", issueDate: new Date("2020-07-01"), status: "active", renewalStatus: "not-started" },
      ]);
    }

    const existingPickingTasks = await db.select().from(schema.pickingTasks);
    if (existingPickingTasks.length === 0 && existingWarehouses.length > 0) {
      const pickingTasks = await db.insert(schema.pickingTasks).values([
        { taskNumber: "PICK-2024-001", orderId: existingOrders[0]?.id, warehouseId: existingWarehouses[0]?.id, items: 8, zone: "Zone A", status: "in-progress", priority: "high" },
        { taskNumber: "PICK-2024-002", warehouseId: existingWarehouses[0]?.id, items: 5, zone: "Zone B", status: "completed", priority: "normal", completedAt: new Date("2024-12-17") },
        { taskNumber: "PICK-2024-003", warehouseId: existingWarehouses[0]?.id, items: 12, zone: "Zone A", status: "pending", priority: "urgent" },
      ]).returning();

      await db.insert(schema.packingTasks).values([
        { taskNumber: "PACK-2024-001", pickingTaskId: pickingTasks[1].id, warehouseId: existingWarehouses[0]?.id, items: 5, status: "completed", priority: "normal", completedAt: new Date("2024-12-17") },
        { taskNumber: "PACK-2024-002", warehouseId: existingWarehouses[0]?.id, items: 8, status: "in-progress", priority: "urgent" },
      ]);

      await db.insert(schema.dispatchTasks).values([
        { taskNumber: "DISP-2024-001", warehouseId: existingWarehouses[0]?.id, carrierId: existingCarriers[0]?.id, items: 5, destination: "Mumbai", status: "completed", priority: "normal", dispatchedAt: new Date("2024-12-17") },
        { taskNumber: "DISP-2024-002", warehouseId: existingWarehouses[0]?.id, items: 8, destination: "Delhi", status: "pending", priority: "urgent" },
      ]);
    }

    const existingReportTemplates = await db.select().from(schema.reportTemplates);
    if (existingReportTemplates.length === 0) {
      await db.insert(schema.reportTemplates).values([
        { name: "Monthly Sales Report", description: "Comprehensive monthly sales analysis", category: "sales", icon: "BarChart3", frequency: "monthly", isActive: true },
        { name: "Inventory Status Report", description: "Current stock levels and near-expiry items", category: "inventory", icon: "Package", frequency: "weekly", isActive: true },
        { name: "MR Performance Dashboard", description: "MR-wise sales and target achievement", category: "sales", icon: "Users", frequency: "monthly", isActive: true },
        { name: "Financial Summary", description: "Revenue, collections, and P&L summary", category: "finance", icon: "DollarSign", frequency: "monthly", isActive: true },
      ]);
    }

    const existingIntegrations = await db.select().from(schema.integrations);
    if (existingIntegrations.length === 0) {
      await db.insert(schema.integrations).values([
        { name: "Tally ERP", type: "erp", status: "disconnected", lastSyncAt: new Date("2026-02-10T09:00:00Z") },
        { name: "Shiprocket", type: "logistics", status: "connected", lastSyncAt: new Date("2026-02-17T08:30:00Z") },
        { name: "Razorpay", type: "payment", status: "disconnected", lastSyncAt: new Date("2026-02-15T12:00:00Z") },
        { name: "WhatsApp Business", type: "communication", status: "error", errorMessage: "Access token expired. Please refresh the token.", lastSyncAt: new Date("2026-02-12T16:45:00Z") },
        { name: "Google Sheets", type: "analytics", status: "disconnected", lastSyncAt: new Date("2026-02-16T09:00:00Z") },
      ]);
    }

    const existingRegulatoryAuditLogs = await db.select().from(schema.regulatoryAuditLogs);
    if (existingRegulatoryAuditLogs.length === 0) {
      await db.insert(schema.regulatoryAuditLogs).values([
        { category: "data_access", action: "export", entityType: "orders", entityId: "ORD-001", description: "Bulk export of order data for Q4 review", performedByEmail: "admin@monoskin.com", performedByName: "System Admin", regulation: "GDPR", complianceStatus: "compliant", riskLevel: "low" },
        { category: "data_modification", action: "update", entityType: "doctors", entityId: "DOC-005", description: "Updated doctor credit limit from 50000 to 75000", performedByEmail: "finance@monoskin.com", performedByName: "Finance Manager", regulation: "SOX", complianceStatus: "compliant", riskLevel: "medium" },
        { category: "user_access", action: "login", entityType: "users", entityId: "USR-012", description: "Admin login from new IP address 192.168.1.100", performedByEmail: "admin@monoskin.com", performedByName: "System Admin", regulation: "ISO 27001", complianceStatus: "under_review", riskLevel: "high" },
        { category: "data_access", action: "view", entityType: "invoices", entityId: "INV-003", description: "Accessed sensitive financial records", performedByEmail: "accountant@monoskin.com", performedByName: "Accountant", regulation: "GDPR", complianceStatus: "compliant", riskLevel: "low" },
        { category: "configuration", action: "update", entityType: "settings", entityId: "ROLE-PERM", description: "Modified role permissions for MR role", performedByEmail: "admin@monoskin.com", performedByName: "System Admin", regulation: "SOX", complianceStatus: "compliant", riskLevel: "medium" },
      ]);
    }

    const existingReportUsageLogs = await db.select().from(schema.reportUsageLogs);
    if (existingReportUsageLogs.length === 0) {
      await db.insert(schema.reportUsageLogs).values([
        { reportName: "Monthly Sales Report", generatedByEmail: "admin@monoskin.com", generatedByName: "System Admin", format: "PDF", status: "completed", rowCount: 245, durationMs: 1200 },
        { reportName: "Inventory Status Report", generatedByEmail: "warehouse@monoskin.com", generatedByName: "Warehouse Manager", format: "Excel", status: "completed", rowCount: 580, durationMs: 2100 },
        { reportName: "Financial Summary", generatedByEmail: "finance@monoskin.com", generatedByName: "Finance Manager", format: "PDF", status: "completed", rowCount: 120, durationMs: 800 },
        { reportName: "MR Performance Dashboard", generatedByEmail: "admin@monoskin.com", generatedByName: "System Admin", format: "PDF", status: "completed", rowCount: 30, durationMs: 650 },
      ]);
    }

    const existingAccessLogs = await db.select().from(schema.accessLogs);
    if (existingAccessLogs.length === 0) {
      await db.insert(schema.accessLogs).values([
        { action: "View", entityType: "doctor", entityId: "DOC-001", userEmail: "admin@monoskin.com", ipAddress: "192.168.1.10", geoLocation: "Mumbai, India", isSuspicious: false },
        { action: "Update", entityType: "order", entityId: "ORD-2024-001", userEmail: "admin@monoskin.com", ipAddress: "192.168.1.10", geoLocation: "Mumbai, India", isSuspicious: false },
        { action: "Delete", entityType: "lead", entityId: "LD-003", userEmail: "finance@monoskin.com", ipAddress: "10.0.0.5", geoLocation: "Delhi, India", isSuspicious: true, suspiciousReason: "Delete action on sensitive lead data" },
        { action: "Export", entityType: "invoices", entityId: "BULK", userEmail: "accountant@monoskin.com", ipAddress: "172.16.0.12", geoLocation: "Bangalore, India", isSuspicious: true, suspiciousReason: "Bulk data export of 5000+ records" },
        { action: "View", entityType: "employee", entityId: "EMP-005", userEmail: "hr@monoskin.com", ipAddress: "192.168.1.25", geoLocation: "Mumbai, India", isSuspicious: false },
        { action: "Create", entityType: "product", entityId: "PRD-012", userEmail: "admin@monoskin.com", ipAddress: "192.168.1.10", geoLocation: "Mumbai, India", isSuspicious: false },
      ]);
    }

    const existingSuspiciousActivities = await db.select().from(schema.suspiciousActivities);
    if (existingSuspiciousActivities.length === 0) {
      await db.insert(schema.suspiciousActivities).values([
        { type: "Multiple Failed Logins", description: "8 failed login attempts from IP 203.45.67.89 within 5 minutes", severity: "high" as const, status: "open" as const, ipAddress: "203.45.67.89", geoLocation: "Unknown Location", userEmail: "sales@monoskin.com", detectedAt: new Date("2026-02-16T03:22:00Z") },
        { type: "After-Hours Access", description: "Sensitive data accessed at 2:30 AM IST from unusual IP", severity: "medium" as const, status: "open" as const, ipAddress: "45.33.21.10", geoLocation: "Singapore", userEmail: "admin@monoskin.com", detectedAt: new Date("2026-02-15T21:00:00Z") },
        { type: "Bulk Data Export", description: "Export of 12,000 doctor records attempted", severity: "critical" as const, status: "investigating" as const, ipAddress: "10.0.0.5", geoLocation: "Delhi, India", userEmail: "accountant@monoskin.com", detectedAt: new Date("2026-02-14T14:30:00Z") },
        { type: "Geo Anomaly", description: "Login from Mumbai followed by login from London within 30 minutes", severity: "high" as const, status: "resolved" as const, ipAddress: "82.12.45.67", geoLocation: "London, UK", userEmail: "mr.west@monoskin.com", resolvedByEmail: "admin@monoskin.com", resolvedAt: new Date("2026-02-13T11:00:00Z"), resolutionNotes: "Confirmed VPN usage, false positive", detectedAt: new Date("2026-02-13T09:15:00Z") },
      ]);
    }

    const existingMaskedLogs = await db.select().from(schema.maskedDataAccessLogs);
    if (existingMaskedLogs.length === 0) {
      await db.insert(schema.maskedDataAccessLogs).values([
        { action: "click-to-call", fieldName: "phone", entityType: "Doctor", entityId: "DOC-001", userEmail: "mr.north@monoskin.com", maskedValue: "98XX XXX 234", accessReason: "Outbound sales call" },
        { action: "whatsapp", fieldName: "phone", entityType: "Doctor", entityId: "DOC-002", userEmail: "mr.south@monoskin.com", maskedValue: "87XX XXX 567", accessReason: "Order update notification" },
        { action: "view", fieldName: "email", entityType: "Lead", entityId: "LD-015", userEmail: "admin@monoskin.com", maskedValue: "ra***@gmail.com", accessReason: "Lead verification" },
        { action: "click-to-call", fieldName: "phone", entityType: "Pharmacy", entityId: "PHR-001", userEmail: "logistics@monoskin.com", maskedValue: "76XX XXX 890", accessReason: "Delivery confirmation call" },
      ]);
    }

    const existingMaskingRules = await db.select().from(schema.dataMaskingRules);
    if (existingMaskingRules.length === 0) {
      await db.insert(schema.dataMaskingRules).values([
        { fieldName: "phone", entity: "Doctor", maskType: "partial", roles: ["Admin Ops", "Finance Manager", "Warehouse Staff"], description: "Mask doctor phone numbers for non-sales roles", isActive: true },
        { fieldName: "email", entity: "Lead", maskType: "partial", roles: ["Warehouse Staff", "Finance Staff", "Analytics Viewer"], description: "Mask lead email addresses", isActive: true },
        { fieldName: "aadhaar", entity: "Employee", maskType: "full", roles: ["Admin Ops", "Finance Manager", "Warehouse Manager", "Warehouse Staff", "Analytics Viewer"], description: "Fully mask employee Aadhaar numbers", isActive: true },
        { fieldName: "bankAccount", entity: "Employee", maskType: "partial", roles: ["Admin Ops", "Warehouse Manager", "Warehouse Staff", "Analytics Viewer"], description: "Mask employee bank account numbers", isActive: true },
        { fieldName: "phone", entity: "Pharmacy", maskType: "partial", roles: ["Finance Staff", "Analytics Viewer"], description: "Mask pharmacy contact numbers", isActive: false },
      ]);
    }

    const existingExportControls = await db.select().from(schema.exportControls);
    if (existingExportControls.length === 0) {
      await db.insert(schema.exportControls).values([
        { entity: "Doctors", role: "Super Admin", canExport: true, watermark: false, maxRecords: 10000, formats: ["CSV", "Excel", "PDF", "JSON"], requiresApproval: false },
        { entity: "Doctors", role: "Finance Manager", canExport: true, watermark: true, maxRecords: 500, formats: ["CSV", "Excel"], requiresApproval: true },
        { entity: "Invoices", role: "Finance Manager", canExport: true, watermark: true, maxRecords: 5000, formats: ["CSV", "Excel", "PDF"], requiresApproval: false },
        { entity: "Employees", role: "HR/Compliance", canExport: true, watermark: true, maxRecords: 1000, formats: ["CSV", "Excel"], requiresApproval: true },
        { entity: "Orders", role: "Analytics Viewer", canExport: true, watermark: false, maxRecords: 2000, formats: ["CSV"], requiresApproval: false },
        { entity: "Leads", role: "Warehouse Staff", canExport: false, watermark: false, maxRecords: 0, formats: [], requiresApproval: false },
      ]);
    }

    const existingRetentionPolicies = await db.select().from(schema.dataRetentionPolicies);
    if (existingRetentionPolicies.length === 0) {
      await db.insert(schema.dataRetentionPolicies).values([
        { entityType: "Audit Logs", retentionDays: 365, description: "Retain audit logs for 1 year per compliance requirements", isActive: true, autoDelete: false, archiveBeforeDelete: true },
        { entityType: "Access Logs", retentionDays: 180, description: "Retain access logs for 6 months", isActive: true, autoDelete: true, archiveBeforeDelete: true },
        { entityType: "Session Data", retentionDays: 30, description: "Clean up expired sessions after 30 days", isActive: true, autoDelete: true, archiveBeforeDelete: false },
        { entityType: "Export Logs", retentionDays: 90, description: "Keep export activity records for 3 months", isActive: true, autoDelete: false, archiveBeforeDelete: true },
        { entityType: "Error Logs", retentionDays: 60, description: "Remove error logs after 60 days", isActive: false, autoDelete: true, archiveBeforeDelete: false },
      ]);
    }

    const existingTerritories = await db.select().from(schema.territories);
    if (existingTerritories.length === 0) {
      await db.insert(schema.territories).values([
        { code: "MUM-001", name: "Mumbai Metro", region: "West", state: "Maharashtra", isActive: true },
        { code: "DEL-001", name: "Delhi NCR", region: "North", state: "Delhi", isActive: true },
        { code: "BLR-001", name: "Bangalore Urban", region: "South", state: "Karnataka", isActive: true },
        { code: "CHN-001", name: "Chennai Metro", region: "South", state: "Tamil Nadu", isActive: true },
        { code: "KOL-001", name: "Kolkata Metro", region: "East", state: "West Bengal", isActive: true },
        { code: "HYD-001", name: "Hyderabad", region: "South", state: "Telangana", isActive: true },
        { code: "PNE-001", name: "Pune City", region: "West", state: "Maharashtra", isActive: true },
        { code: "AHM-001", name: "Ahmedabad", region: "West", state: "Gujarat", isActive: true },
        { code: "JAI-001", name: "Jaipur", region: "North", state: "Rajasthan", isActive: true },
        { code: "LKO-001", name: "Lucknow", region: "North", state: "Uttar Pradesh", isActive: false },
        { code: "BHO-001", name: "Bhopal", region: "Central", state: "Madhya Pradesh", isActive: true },
        { code: "NGP-001", name: "Nagpur", region: "Central", state: "Maharashtra", isActive: true },
      ]);
    }

    const seededTerritories = await db.select().from(schema.territories);
    const existingBoundaries = await db.select().from(schema.territoryBoundaries);
    if (existingBoundaries.length === 0 && seededTerritories.length > 0) {
      const mumId = seededTerritories.find(t => t.code === "MUM-001")?.id;
      const delId = seededTerritories.find(t => t.code === "DEL-001")?.id;
      const blrId = seededTerritories.find(t => t.code === "BLR-001")?.id;
      const pneId = seededTerritories.find(t => t.code === "PNE-001")?.id;
      const boundaryValues: { territoryId: number; boundaryType: "pincode_range" | "city_list" | "district_list" | "custom"; label: string; values: unknown; isActive: boolean }[] = [];
      if (mumId) boundaryValues.push(
        { territoryId: mumId, boundaryType: "pincode_range", label: "Mumbai Pincodes 400001-400099", values: [{ from: "400001", to: "400099" }], isActive: true },
        { territoryId: mumId, boundaryType: "city_list", label: "Mumbai Suburbs", values: ["Andheri", "Bandra", "Borivali", "Goregaon", "Malad"], isActive: true },
      );
      if (delId) boundaryValues.push(
        { territoryId: delId, boundaryType: "pincode_range", label: "Delhi Pincodes 110001-110096", values: [{ from: "110001", to: "110096" }], isActive: true },
        { territoryId: delId, boundaryType: "district_list", label: "Delhi Districts", values: ["Central Delhi", "South Delhi", "North Delhi", "East Delhi", "New Delhi"], isActive: true },
      );
      if (blrId) boundaryValues.push(
        { territoryId: blrId, boundaryType: "pincode_range", label: "Bangalore Pincodes 560001-560100", values: [{ from: "560001", to: "560100" }], isActive: true },
      );
      if (pneId) boundaryValues.push(
        { territoryId: pneId, boundaryType: "city_list", label: "Pune Areas", values: ["Hinjewadi", "Kothrud", "Wakad", "Baner", "Aundh"], isActive: true },
      );
      if (boundaryValues.length > 0) {
        await db.insert(schema.territoryBoundaries).values(boundaryValues);
      }
    }

    const existingLoginHistory = await db.select().from(schema.loginHistory);
    if (existingLoginHistory.length === 0) {
      const adminUser = await db.select().from(schema.users).where(eq(schema.users.username, "admin")).limit(1);
      const adminId = adminUser[0]?.id;
      if (adminId) {
        await db.insert(schema.loginHistory).values([
          { userId: adminId, userEmail: "admin@monoskin.com", ipAddress: "192.168.1.1", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0", status: "success" as const, geoLocation: "Mumbai, India" },
          { userId: adminId, userEmail: "admin@monoskin.com", ipAddress: "10.0.0.50", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/17.0", status: "success" as const, geoLocation: "Delhi, India" },
          { userId: adminId, userEmail: "admin@monoskin.com", ipAddress: "172.16.0.100", userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/120.0", status: "failed" as const, failureReason: "Invalid password", geoLocation: "Pune, India" },
          { userId: adminId, userEmail: "amit@monoskin.com", ipAddress: "192.168.2.10", userAgent: "Mozilla/5.0 (Windows NT 10.0) Edge/120.0", status: "success" as const, geoLocation: "Chennai, India" },
          { userId: adminId, userEmail: "priya@monoskin.com", ipAddress: "10.0.0.99", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17) Safari/17.0", status: "blocked" as const, failureReason: "Account locked after 5 attempts", geoLocation: "Kolkata, India" },
          { userId: adminId, userEmail: "admin@monoskin.com", ipAddress: "192.168.1.1", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0", status: "expired" as const, geoLocation: "Mumbai, India", sessionDuration: 28800 },
        ]);
      }
    }

    const existingSyncRuns = await db.select().from(schema.integrationSyncRuns);
    if (existingSyncRuns.length === 0) {
      const allIntegrations = await db.select().from(schema.integrations);
      const shiprocket = allIntegrations.find(i => i.name === 'Shiprocket');
      const razorpay = allIntegrations.find(i => i.name === 'Razorpay');
      const tally = allIntegrations.find(i => i.name === 'Tally ERP');
      const whatsapp = allIntegrations.find(i => i.name === 'WhatsApp Business');
      if (shiprocket && razorpay && tally && whatsapp) {
        await db.insert(schema.integrationSyncRuns).values([
          { integrationId: shiprocket.id, status: "success" as const, direction: "outbound", recordsProcessed: 45, recordsFailed: 0, attempt: 1, triggeredBy: "scheduled", startedAt: new Date("2026-02-17T08:30:00Z"), finishedAt: new Date("2026-02-17T08:30:12Z") },
          { integrationId: shiprocket.id, status: "success" as const, direction: "inbound", recordsProcessed: 120, recordsFailed: 2, attempt: 1, triggeredBy: "scheduled", startedAt: new Date("2026-02-16T08:30:00Z"), finishedAt: new Date("2026-02-16T08:31:05Z") },
          { integrationId: razorpay.id, status: "success" as const, direction: "inbound", recordsProcessed: 38, recordsFailed: 0, attempt: 1, triggeredBy: "webhook", startedAt: new Date("2026-02-15T12:00:00Z"), finishedAt: new Date("2026-02-15T12:00:03Z") },
          { integrationId: tally.id, status: "failed" as const, direction: "outbound", recordsProcessed: 0, recordsFailed: 15, attempt: 3, triggeredBy: "manual", errorMessage: "Connection refused: Tally server unreachable", startedAt: new Date("2026-02-10T09:00:00Z"), finishedAt: new Date("2026-02-10T09:00:08Z") },
          { integrationId: whatsapp.id, status: "partial" as const, direction: "outbound", recordsProcessed: 200, recordsFailed: 12, attempt: 1, triggeredBy: "scheduled", startedAt: new Date("2026-02-12T16:45:00Z"), finishedAt: new Date("2026-02-12T16:46:30Z") },
          { integrationId: razorpay.id, status: "running" as const, direction: "outbound", recordsProcessed: 10, recordsFailed: 0, attempt: 1, triggeredBy: "manual", startedAt: new Date("2026-02-17T10:00:00Z") },
        ]);
      }
    }

    const existingWebhookEvents = await db.select().from(schema.integrationWebhookEvents);
    if (existingWebhookEvents.length === 0) {
      const allIntegrations = await db.select().from(schema.integrations);
      const razorpay = allIntegrations.find(i => i.name === 'Razorpay');
      const shiprocket = allIntegrations.find(i => i.name === 'Shiprocket');
      const whatsapp = allIntegrations.find(i => i.name === 'WhatsApp Business');
      if (razorpay && shiprocket && whatsapp) {
        await db.insert(schema.integrationWebhookEvents).values([
          { integrationId: razorpay.id, eventType: "payment.captured", status: "processed" as const, payload: { id: "pay_Nx1234abcd", amount: 150000, currency: "INR", method: "upi", description: "Order ORD-2024-045" }, responseCode: 200, processingTimeMs: 45, receivedAt: new Date("2026-02-17T09:15:00Z"), processedAt: new Date("2026-02-17T09:15:00Z") },
          { integrationId: razorpay.id, eventType: "payment.failed", status: "processed" as const, payload: { id: "pay_Nx5678efgh", amount: 75000, currency: "INR", error_code: "BAD_REQUEST_ERROR", error_description: "Card declined" }, responseCode: 200, processingTimeMs: 32, receivedAt: new Date("2026-02-16T14:30:00Z"), processedAt: new Date("2026-02-16T14:30:00Z") },
          { integrationId: razorpay.id, eventType: "refund.processed", status: "processed" as const, payload: { id: "rfnd_Abc123", payment_id: "pay_Nx1234abcd", amount: 50000, currency: "INR" }, responseCode: 200, processingTimeMs: 60, receivedAt: new Date("2026-02-15T11:00:00Z"), processedAt: new Date("2026-02-15T11:00:00Z") },
          { integrationId: shiprocket.id, eventType: "shipment.delivered", status: "processed" as const, payload: { order_id: "ORD-2024-030", awb: "7890123456", courier: "Delhivery", delivered_at: "2026-02-16T18:00:00Z" }, responseCode: 200, processingTimeMs: 120, receivedAt: new Date("2026-02-16T18:05:00Z"), processedAt: new Date("2026-02-16T18:05:00Z") },
          { integrationId: shiprocket.id, eventType: "shipment.in_transit", status: "received" as const, payload: { order_id: "ORD-2024-042", awb: "7890456789", courier: "BlueDart" }, responseCode: null, processingTimeMs: null, receivedAt: new Date("2026-02-17T10:30:00Z") },
          { integrationId: whatsapp.id, eventType: "message.status", status: "failed" as const, payload: { message_id: "wamid.abc123", status: "failed", error: { code: 131047, title: "Re-engagement message" } }, responseCode: 400, errorMessage: "Message template not approved", processingTimeMs: 15, receivedAt: new Date("2026-02-14T09:00:00Z") },
        ]);
      }
    }

    const existingAlerts = await db.select().from(schema.integrationAlerts);
    if (existingAlerts.length === 0) {
      const allIntegrations = await db.select().from(schema.integrations);
      const whatsapp = allIntegrations.find(i => i.name === 'WhatsApp Business');
      const tally = allIntegrations.find(i => i.name === 'Tally ERP');
      const razorpay = allIntegrations.find(i => i.name === 'Razorpay');
      if (whatsapp && tally && razorpay) {
        await db.insert(schema.integrationAlerts).values([
          { integrationId: whatsapp.id, severity: "critical" as const, status: "active" as const, condition: "Access Token Expired", message: "WhatsApp Business API access token has expired. Message delivery will fail until renewed.", lastTriggeredAt: new Date("2026-02-17T06:00:00Z") },
          { integrationId: tally.id, severity: "warning" as const, status: "active" as const, condition: "Connection Timeout", message: "Tally ERP server is unreachable. Last 3 sync attempts failed. Check server status.", lastTriggeredAt: new Date("2026-02-10T09:01:00Z") },
          { integrationId: razorpay.id, severity: "info" as const, status: "acknowledged" as const, condition: "High Refund Rate", message: "Refund rate exceeded 5% threshold in the last 7 days (currently 6.2%).", acknowledgedBy: "admin", acknowledgedAt: new Date("2026-02-16T10:00:00Z"), lastTriggeredAt: new Date("2026-02-15T09:00:00Z") },
          { integrationId: whatsapp.id, severity: "warning" as const, status: "resolved" as const, condition: "Template Rejection", message: "Message template 'order_update_v2' was rejected by WhatsApp. Review and resubmit.", resolvedAt: new Date("2026-02-13T15:00:00Z"), lastTriggeredAt: new Date("2026-02-13T08:00:00Z") },
        ]);
      }
    }

    const existingNotifications = await db.select().from(schema.notifications);
    if (existingNotifications.length === 0) {
      await db.insert(schema.notifications).values([
        { userId: 1, category: 'Approvals' as const, title: 'New order approval pending', message: 'Order ORD-2026-045 from Dr. Mehta requires your approval. Amount: Rs. 45,000.', link: '/approvals', isRead: false },
        { userId: 1, category: 'Inventory' as const, title: 'Low stock alert: Hyaluronic Serum', message: 'Stock for Hyaluronic Serum (SKU: HS-500ML) has fallen below minimum threshold. Current qty: 12 units.', link: '/inventory', isRead: false },
        { userId: 1, category: 'Inventory' as const, title: 'Near-expiry batch detected', message: 'Batch B2025-089 of Retinol Cream expires in 30 days. 85 units remaining.', link: '/inventory', isRead: false },
        { userId: 1, category: 'Logistics' as const, title: 'Shipment delivered', message: 'Shipment SHP-2026-112 has been delivered to City Pharmacy, Mumbai.', link: '/shipments', isRead: true },
        { userId: 1, category: 'Finance' as const, title: 'Payment received: INV-2026-033', message: 'Payment of Rs. 1,25,000 received from Wellness Clinic against invoice INV-2026-033.', link: '/finance', isRead: true },
        { userId: 1, category: 'Orders' as const, title: 'New order placed', message: 'Dr. Sharma placed a new order for 50 units of Vitamin C Serum and 30 units of SPF 50 Sunscreen.', link: '/orders', isRead: false },
        { userId: 1, category: 'Security' as const, title: 'Unusual login detected', message: 'Login from new device detected for user sales_rep_01. IP: 103.21.xx.xx, Location: Pune.', link: '/security/access-logs', isRead: false },
        { userId: 1, category: 'CRM' as const, title: 'Lead follow-up reminder', message: 'Follow-up due today for Dr. Priya Kapoor. Last contact was 5 days ago regarding bulk pricing.', link: '/leads', isRead: false },
        { userId: 1, category: 'Approvals' as const, title: 'Credit note approved', message: 'Credit note CN-2026-008 for Rs. 12,500 has been approved by Finance Manager.', link: '/approvals', isRead: true },
        { userId: 1, category: 'Logistics' as const, title: 'AWB generated for shipment', message: 'AWB 7890456789 generated via BlueDart for order ORD-2026-042. Expected delivery: Feb 20.', link: '/shipments', isRead: false },
      ]);
    }

    const existingSettings = await db.select().from(schema.settings);
    if (existingSettings.length === 0) {
      await db.insert(schema.settings).values([
        { key: 'companyName', value: 'Monoskin Healthcare Pvt Ltd', category: 'company' },
        { key: 'gstin', value: '27AADCM9876F1ZH', category: 'company' },
        { key: 'email', value: 'support@monoskin.com', category: 'company' },
        { key: 'phone', value: '+91 22 4000 5000', category: 'company' },
        { key: 'address', value: '502, Trade Centre, Bandra Kurla Complex', category: 'company' },
        { key: 'city', value: 'Mumbai', category: 'company' },
        { key: 'state', value: 'Maharashtra', category: 'company' },
        { key: 'pincode', value: '400051', category: 'company' },
        { key: 'invoiceLogo', value: 'true', category: 'documents' },
        { key: 'bankDetails', value: 'true', category: 'documents' },
        { key: 'digitalSignature', value: 'false', category: 'documents' },
        { key: 'lowStockAlerts', value: 'true', category: 'notifications' },
        { key: 'expiryAlerts', value: 'true', category: 'notifications' },
        { key: 'orderUpdateAlerts', value: 'true', category: 'notifications' },
        { key: 'paymentReminders', value: 'false', category: 'notifications' },
        { key: 'orderPrefix', value: 'ORD-', category: 'numbering' },
        { key: 'invoicePrefix', value: 'INV-', category: 'numbering' },
        { key: 'grnPrefix', value: 'GRN-', category: 'numbering' },
        { key: 'transferPrefix', value: 'TRF-', category: 'numbering' },
        { key: 'resetNumberingYearly', value: 'true', category: 'numbering' },
        { key: 'smsGateway', value: 'false', category: 'integrations' },
        { key: 'emailService', value: 'true', category: 'integrations' },
        { key: 'whatsappBusiness', value: 'false', category: 'integrations' },
      ]);
    }

    console.log("Demo data seeding check completed");
  } catch (error) {
    console.error("Error seeding demo data:", error);
  }
}

export async function backfillProductInventory() {
  try {
    const allProducts = await db.select().from(schema.products);
    const activeWarehouses = await db.select().from(schema.warehouses).where(eq(schema.warehouses.isActive, true));
    if (allProducts.length === 0 || activeWarehouses.length === 0) return;

    let created = 0;
    for (const product of allProducts) {
      const existing = await db.select().from(schema.inventory)
        .where(eq(schema.inventory.productId, product.id))
        .limit(1);
      if (existing.length === 0) {
        const shelfLifeMonths = product.shelfLife ?? 24;
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + shelfLifeMonths);
        const expiryStr = expiryDate.toISOString().split('T')[0];
        const batchLabel = `INIT-${product.sku}`.substring(0, 50);
        for (const wh of activeWarehouses) {
          await db.insert(schema.inventory).values({
            productId: product.id,
            warehouseId: wh.id,
            batch: batchLabel,
            expiry: expiryStr,
            available: 0,
            reserved: 0,
            total: 0,
          });
          created++;
        }
      }
    }
    if (created > 0) {
      console.log(`Backfilled inventory: created ${created} placeholder records for products with no stock`);
    }
  } catch (err) {
    console.warn("Inventory backfill warning:", err);
  }
}
