import { db } from "./db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedExtra() {
  console.log("🌱 Adding extra demo data to empty tables...");
  
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

    console.log("Seeding MR visits...");
    await db.insert(schema.mrVisits).values([
      { mrId: mrsData[0].id, doctorId: existingDoctors[0]?.id, visitType: "Doctor Visit", outcome: "Positive", notes: "Doctor showed interest in 432one serum", location: "Indore" },
      { mrId: mrsData[0].id, doctorId: existingDoctors[2]?.id, visitType: "Doctor Visit", outcome: "Positive", notes: "Placed order for Wecalm and Acnetech", location: "Delhi" },
      { mrId: mrsData[1].id, doctorId: existingDoctors[1]?.id, visitType: "Doctor Visit", outcome: "Follow-up Required", notes: "Requested samples of Nanogrow", location: "Mumbai" },
      { mrId: mrsData[1].id, doctorId: existingDoctors[4]?.id, visitType: "Doctor Visit", outcome: "Positive", notes: "Addressed packaging concern, provided replacement", location: "Mumbai" },
      { mrId: mrsData[2].id, doctorId: existingDoctors[3]?.id, visitType: "Doctor Visit", outcome: "Follow-up Required", notes: "Presented Winter Sale scheme", location: "Delhi" },
      { mrId: mrsData[0].id, doctorId: existingDoctors[0]?.id, visitType: "Doctor Visit", outcome: "Positive", notes: "Monthly reorder collected", location: "Indore" },
      { mrId: mrsData[3].id, doctorId: existingDoctors[1]?.id, visitType: "Doctor Visit", outcome: "Neutral", notes: "Discussed credit limit increase request", location: "Bangalore" },
      { mrId: mrsData[4].id, visitType: "Conference", outcome: "Positive", notes: "Dermatology conference in Kolkata, met 15 doctors", location: "Kolkata" },
      { mrId: mrsData[2].id, visitType: "Training", outcome: "Positive", notes: "New product training session", location: "Delhi Office" },
    ]);
    console.log("Created MR visits");

    console.log("Seeding MR targets...");
    await db.insert(schema.mrTargets).values([
      { mrId: mrsData[0].id, period: "2024-12", targetType: "Revenue", targetValue: "500000", achievedValue: "420000", status: "On Track" },
      { mrId: mrsData[0].id, period: "2024-12", targetType: "Visits", targetValue: "25", achievedValue: "22", status: "On Track" },
      { mrId: mrsData[0].id, period: "2024-12", targetType: "Conversions", targetValue: "8", achievedValue: "6", status: "On Track" },
      { mrId: mrsData[1].id, period: "2024-12", targetType: "Revenue", targetValue: "450000", achievedValue: "380000", status: "At Risk" },
      { mrId: mrsData[1].id, period: "2024-12", targetType: "Visits", targetValue: "22", achievedValue: "20", status: "On Track" },
      { mrId: mrsData[2].id, period: "2024-12", targetType: "Revenue", targetValue: "400000", achievedValue: "350000", status: "At Risk" },
      { mrId: mrsData[2].id, period: "2024-12", targetType: "New Leads", targetValue: "10", achievedValue: "8", status: "On Track" },
      { mrId: mrsData[3].id, period: "2024-12", targetType: "Revenue", targetValue: "480000", achievedValue: "450000", status: "On Track" },
      { mrId: mrsData[3].id, period: "2024-12", targetType: "Conversions", targetValue: "10", achievedValue: "9", status: "On Track" },
      { mrId: mrsData[4].id, period: "2024-12", targetType: "Revenue", targetValue: "350000", achievedValue: "280000", status: "At Risk" },
      { mrId: mrsData[0].id, period: "2024-11", targetType: "Revenue", targetValue: "500000", achievedValue: "520000", status: "Achieved" },
      { mrId: mrsData[1].id, period: "2024-11", targetType: "Revenue", targetValue: "450000", achievedValue: "440000", status: "On Track" },
    ]);
    console.log("Created MR targets");
  } else {
    console.log("MRs already exist, skipping...");
  }

  if (existingEmployees.length === 0) {
    console.log("Seeding employees...");
    const employeesData = await db.insert(schema.employees).values([
      { employeeCode: "EMP001", name: "Amit Sharma", email: "amit.emp@monoskin.in", phone: "9876543231", department: "Sales" as const, role: "Senior MR", joiningDate: new Date("2022-01-15"), status: "Active" as const },
      { employeeCode: "EMP002", name: "Priya Verma", email: "priya.emp@monoskin.in", phone: "9876543232", department: "Sales" as const, role: "MR", joiningDate: new Date("2023-03-20"), status: "Active" as const },
      { employeeCode: "EMP003", name: "Rahul Kapoor", email: "rahul.emp@monoskin.in", phone: "9876543233", department: "Sales" as const, role: "MR", joiningDate: new Date("2023-06-10"), status: "Active" as const },
      { employeeCode: "EMP004", name: "Warehouse Manager", email: "warehouse.emp@monoskin.in", phone: "9876543240", department: "Operations" as const, role: "Manager", joiningDate: new Date("2021-05-01"), status: "Active" as const },
      { employeeCode: "EMP005", name: "Finance Manager", email: "finance.emp@monoskin.in", phone: "9876543250", department: "Finance" as const, role: "Manager", joiningDate: new Date("2021-08-15"), status: "Active" as const },
      { employeeCode: "EMP006", name: "Sunita Reddy", email: "sunita.emp@monoskin.in", phone: "9876543234", department: "Sales" as const, role: "Area Manager", joiningDate: new Date("2022-08-05"), status: "Active" as const },
      { employeeCode: "EMP007", name: "Vikram Singh", email: "vikram.emp@monoskin.in", phone: "9876543235", department: "Sales" as const, role: "MR", joiningDate: new Date("2023-01-10"), status: "Active" as const },
      { employeeCode: "EMP008", name: "Neha Gupta", email: "neha.emp@monoskin.in", phone: "9876543241", department: "Warehouse" as const, role: "Warehouse Staff", joiningDate: new Date("2022-11-01"), status: "Active" as const },
    ]).returning();
    console.log(`Created ${employeesData.length} employees`);

    console.log("Seeding HR attendance...");
    await db.insert(schema.hrAttendance).values([
      { employeeId: employeesData[0].id, date: new Date("2024-12-18"), checkIn: "09:15", checkOut: "18:30", status: "present", workHours: "9.25", location: "Indore Office" },
      { employeeId: employeesData[0].id, date: new Date("2024-12-17"), checkIn: "09:00", checkOut: "18:00", status: "present", workHours: "9.0", location: "Field Visit" },
      { employeeId: employeesData[1].id, date: new Date("2024-12-18"), checkIn: "09:30", checkOut: "18:45", status: "present", workHours: "9.25", location: "Mumbai Office" },
      { employeeId: employeesData[1].id, date: new Date("2024-12-17"), status: "leave", notes: "Sick leave" },
      { employeeId: employeesData[2].id, date: new Date("2024-12-18"), checkIn: "09:00", checkOut: "13:00", status: "half-day", workHours: "4.0", location: "Delhi Office" },
      { employeeId: employeesData[3].id, date: new Date("2024-12-18"), checkIn: "08:45", checkOut: "17:30", status: "present", workHours: "8.75", location: "Indore Warehouse" },
      { employeeId: employeesData[4].id, date: new Date("2024-12-18"), checkIn: "09:00", checkOut: "18:00", status: "present", workHours: "9.0", location: "Head Office" },
      { employeeId: employeesData[0].id, date: new Date("2024-12-16"), checkIn: "09:00", checkOut: "18:15", status: "present", workHours: "9.25", location: "Field Visit" },
      { employeeId: employeesData[1].id, date: new Date("2024-12-16"), checkIn: "09:15", checkOut: "18:30", status: "present", workHours: "9.25", location: "Mumbai Office" },
      { employeeId: employeesData[5].id, date: new Date("2024-12-18"), checkIn: "09:00", checkOut: "18:00", status: "present", workHours: "9.0", location: "South Region" },
      { employeeId: employeesData[6].id, date: new Date("2024-12-18"), checkIn: "09:15", checkOut: "18:15", status: "present", workHours: "9.0", location: "East Region" },
      { employeeId: employeesData[7].id, date: new Date("2024-12-18"), checkIn: "08:30", checkOut: "17:00", status: "present", workHours: "8.5", location: "Indore Warehouse" },
    ]);
    console.log("Created attendance records");
  } else {
    console.log("Employees already exist, skipping...");
  }

  const existingCompliance = await db.select().from(schema.complianceItems);
  if (existingCompliance.length === 0) {
    console.log("Seeding compliance items...");
    await db.insert(schema.complianceItems).values([
      { category: "Drug License", requirement: "Drug License Renewal - Maharashtra", status: "compliant", dueDate: new Date("2025-06-30"), assignee: "Finance Manager", documents: 3, notes: "License valid until June 2025" },
      { category: "GST", requirement: "Monthly GST Filing - December 2024", status: "pending", dueDate: new Date("2025-01-20"), assignee: "Finance Team", documents: 0 },
      { category: "Drug License", requirement: "Drug License Renewal - Delhi", status: "expiring", dueDate: new Date("2025-02-15"), assignee: "Compliance Officer", documents: 2, notes: "Renewal application to be filed" },
      { category: "Statutory", requirement: "Annual Return Filing - FY 2023-24", status: "compliant", dueDate: new Date("2024-11-30"), assignee: "Finance Manager", documents: 5 },
      { category: "Quality", requirement: "ISO Certification Audit", status: "pending", dueDate: new Date("2025-03-15"), assignee: "Quality Team", documents: 1, notes: "Pre-audit scheduled for Feb" },
      { category: "Tax", requirement: "TDS Return Filing Q3", status: "compliant", dueDate: new Date("2025-01-15"), assignee: "Finance Team", documents: 2 },
      { category: "Statutory", requirement: "PF/ESI Monthly Compliance", status: "compliant", dueDate: new Date("2025-01-15"), assignee: "HR Team", documents: 2 },
    ]);
    console.log("Created compliance items");
  }

  const existingLicenses = await db.select().from(schema.licenses);
  if (existingLicenses.length === 0) {
    console.log("Seeding licenses...");
    await db.insert(schema.licenses).values([
      { name: "Drug License - Maharashtra", type: "Drug License", licenseNumber: "DL-MH-2024-001", issueDate: new Date("2024-01-15"), expiryDate: new Date("2025-06-30"), status: "active", renewalStatus: "not-started" },
      { name: "Drug License - Delhi", type: "Drug License", licenseNumber: "DL-DL-2023-045", issueDate: new Date("2023-02-20"), expiryDate: new Date("2025-02-15"), status: "expiring", renewalStatus: "in-progress" },
      { name: "Drug License - Madhya Pradesh", type: "Drug License", licenseNumber: "DL-MP-2024-023", issueDate: new Date("2024-03-10"), expiryDate: new Date("2026-03-10"), status: "active", renewalStatus: "not-started" },
      { name: "GST Registration", type: "GST", licenseNumber: "27AXXXX1234X1Z5", issueDate: new Date("2020-07-01"), status: "active", renewalStatus: "not-started" },
      { name: "FSSAI License", type: "FSSAI", licenseNumber: "10024999000123", issueDate: new Date("2023-08-15"), expiryDate: new Date("2028-08-14"), status: "active", renewalStatus: "not-started" },
    ]);
    console.log("Created licenses");
  }

  const existingPickingTasks = await db.select().from(schema.pickingTasks);
  if (existingPickingTasks.length === 0) {
    console.log("Seeding picking tasks...");
    const pickingTasks = await db.insert(schema.pickingTasks).values([
      { taskNumber: "PICK-2024-001", orderId: existingOrders[2]?.id, warehouseId: existingWarehouses[2]?.id, items: 8, zone: "Zone A", status: "in-progress", priority: "high" },
      { taskNumber: "PICK-2024-002", orderId: existingOrders[4]?.id, warehouseId: existingWarehouses[1]?.id, items: 5, zone: "Zone B", status: "completed", priority: "normal", completedAt: new Date("2024-12-17") },
      { taskNumber: "PICK-2024-003", warehouseId: existingWarehouses[0]?.id, items: 12, zone: "Zone A", status: "pending", priority: "urgent" },
      { taskNumber: "PICK-2024-004", warehouseId: existingWarehouses[1]?.id, items: 6, zone: "Zone C", status: "pending", priority: "normal" },
      { taskNumber: "PICK-2024-005", warehouseId: existingWarehouses[2]?.id, items: 10, zone: "Zone B", status: "completed", priority: "high", completedAt: new Date("2024-12-16") },
    ]).returning();
    console.log(`Created ${pickingTasks.length} picking tasks`);

    console.log("Seeding packing tasks...");
    const packingTasks = await db.insert(schema.packingTasks).values([
      { taskNumber: "PACK-2024-001", pickingTaskId: pickingTasks[1].id, orderId: existingOrders[4]?.id, warehouseId: existingWarehouses[1]?.id, items: 5, status: "completed", priority: "normal", completedAt: new Date("2024-12-17") },
      { taskNumber: "PACK-2024-002", pickingTaskId: pickingTasks[4].id, warehouseId: existingWarehouses[2]?.id, items: 10, status: "completed", priority: "high", completedAt: new Date("2024-12-16") },
      { taskNumber: "PACK-2024-003", warehouseId: existingWarehouses[0]?.id, items: 8, status: "in-progress", priority: "urgent" },
      { taskNumber: "PACK-2024-004", warehouseId: existingWarehouses[1]?.id, items: 4, status: "pending", priority: "normal" },
    ]).returning();
    console.log(`Created ${packingTasks.length} packing tasks`);

    console.log("Seeding dispatch tasks...");
    await db.insert(schema.dispatchTasks).values([
      { taskNumber: "DISP-2024-001", packingTaskId: packingTasks[0].id, orderId: existingOrders[4]?.id, warehouseId: existingWarehouses[1]?.id, carrierId: existingCarriers[0]?.id, items: 5, destination: "Mumbai - Dr. Vikram Mehta", status: "completed", priority: "normal", dispatchedAt: new Date("2024-12-17") },
      { taskNumber: "DISP-2024-002", packingTaskId: packingTasks[1].id, warehouseId: existingWarehouses[2]?.id, carrierId: existingCarriers[1]?.id, items: 10, destination: "Delhi - Dr. Priya Sharma", status: "in-progress", priority: "high", scheduledAt: new Date("2024-12-19") },
      { taskNumber: "DISP-2024-003", warehouseId: existingWarehouses[0]?.id, items: 8, destination: "Indore - Dr. Ananya Patel", status: "pending", priority: "urgent", scheduledAt: new Date("2024-12-20") },
      { taskNumber: "DISP-2024-004", warehouseId: existingWarehouses[1]?.id, carrierId: existingCarriers[2]?.id, items: 6, destination: "Pune - Dr. Rahul Gupta", status: "pending", priority: "normal" },
    ]);
    console.log("Created dispatch tasks");
  }

  const existingReportTemplates = await db.select().from(schema.reportTemplates);
  if (existingReportTemplates.length === 0) {
    console.log("Seeding report templates...");
    await db.insert(schema.reportTemplates).values([
      { name: "Monthly Sales Report", description: "Comprehensive monthly sales analysis by territory, MR, and product", category: "sales", icon: "BarChart3", frequency: "monthly", isActive: true },
      { name: "Inventory Status Report", description: "Current stock levels, near-expiry items, and reorder suggestions", category: "inventory", icon: "Package", frequency: "weekly", isActive: true },
      { name: "MR Performance Dashboard", description: "MR-wise sales, visits, and target achievement analysis", category: "sales", icon: "Users", frequency: "monthly", isActive: true },
      { name: "Financial Summary", description: "Revenue, collections, outstanding, and P&L summary", category: "finance", icon: "DollarSign", frequency: "monthly", isActive: true },
      { name: "Doctor Engagement Report", description: "Doctor ordering patterns and engagement metrics", category: "crm", icon: "Stethoscope", frequency: "quarterly", isActive: true },
      { name: "Warehouse Operations Report", description: "GRN, transfers, picking efficiency, and dispatch metrics", category: "operations", icon: "Warehouse", frequency: "weekly", isActive: true },
      { name: "GST Report", description: "GST liability and input tax credit summary", category: "finance", icon: "FileText", frequency: "monthly", isActive: true },
      { name: "HR Compliance Report", description: "Attendance, leave, and compliance status", category: "hr", icon: "ClipboardCheck", frequency: "monthly", isActive: true },
    ]);
    console.log("Created report templates");
  }

  const existingIntegrations = await db.select().from(schema.integrations);
  if (existingIntegrations.length === 0) {
    console.log("Seeding integrations...");
    await db.insert(schema.integrations).values([
      { name: "Tally ERP", type: "accounting", status: "connected", lastSyncAt: new Date("2024-12-18T10:30:00") },
      { name: "Shiprocket", type: "logistics", status: "connected", lastSyncAt: new Date("2024-12-18T14:15:00") },
      { name: "Razorpay", type: "payment", status: "connected", lastSyncAt: new Date("2024-12-17T16:45:00") },
      { name: "WhatsApp Business", type: "communication", status: "disconnected", errorMessage: "Token expired" },
      { name: "Google Sheets", type: "export", status: "connected", lastSyncAt: new Date("2024-12-16T09:00:00") },
    ]);
    console.log("Created integrations");
  }

  if (existingProducts.length < 10) {
    console.log("Adding more products...");
    await db.insert(schema.products).values([
      { code: "PRD008", name: "Vitamin C Serum", sku: "VITC-30ML", category: "Serums", hsnCode: "33049990", gst: "18", mrp: "1199", packSize: "30ml", shelfLife: 18, barcode: "8901234567897", minStockThreshold: 120, description: "Brightening serum with 15% L-Ascorbic Acid and Ferulic Acid.", clinicalIndications: ["Brightening", "Anti-oxidant", "Pigmentation", "Dull Skin"] },
      { code: "PRD009", name: "Retinol Night Cream", sku: "RETN-50G", category: "Treatment", hsnCode: "33049990", gst: "18", mrp: "1599", packSize: "50g", shelfLife: 24, barcode: "8901234567898", minStockThreshold: 80, description: "Advanced retinol cream for overnight skin renewal and anti-aging.", clinicalIndications: ["Anti-aging", "Wrinkles", "Skin Renewal", "Night Care"] },
      { code: "PRD010", name: "Sunscreen SPF 50", sku: "SUNS-50ML", category: "Sun Care", hsnCode: "33049990", gst: "18", mrp: "699", packSize: "50ml", shelfLife: 24, barcode: "8901234567899", minStockThreshold: 200, description: "Broad spectrum UVA/UVB protection with PA+++ rating.", clinicalIndications: ["Sun Protection", "Anti-aging", "Pigmentation Prevention"] },
    ]).returning();
    console.log("Created additional products");
  }

  if (existingDoctors.length < 10) {
    console.log("Adding more doctors...");
    await db.insert(schema.doctors).values([
      { code: "DOC006", name: "Dr. Kavitha Menon", specialization: "Dermatologist", clinic: "Skin Wellness Center", city: "Bangalore", state: "Karnataka", phone: "9876543206", email: "kavitha@example.com", pricingSlabId: existingPricingSlabs[1]?.id, creditLimit: "60000", outstanding: "18000", importance: "Medium" },
      { code: "DOC007", name: "Dr. Arun Kumar", specialization: "Cosmetologist", clinic: "Aesthetic Solutions", city: "Chennai", state: "Tamil Nadu", phone: "9876543207", email: "arun@example.com", pricingSlabId: existingPricingSlabs[0]?.id, creditLimit: "120000", outstanding: "35000", importance: "High" },
      { code: "DOC008", name: "Dr. Fatima Sheikh", specialization: "Trichologist", clinic: "Hair & Scalp Clinic", city: "Hyderabad", state: "Telangana", phone: "9876543208", email: "fatima@example.com", pricingSlabId: existingPricingSlabs[2]?.id, creditLimit: "45000", outstanding: "12000", importance: "Medium" },
      { code: "DOC009", name: "Dr. Ravi Shankar", specialization: "Dermatologist", clinic: "Skin Care Institute", city: "Kolkata", state: "West Bengal", phone: "9876543209", email: "ravi@example.com", pricingSlabId: existingPricingSlabs[1]?.id, creditLimit: "80000", outstanding: "22000", importance: "High" },
      { code: "DOC010", name: "Dr. Anjali Deshmukh", specialization: "Cosmetologist", clinic: "Beauty & Beyond", city: "Pune", state: "Maharashtra", phone: "9876543210", email: "anjali@example.com", pricingSlabId: existingPricingSlabs[0]?.id, creditLimit: "100000", outstanding: "28000", importance: "High" },
    ]).returning();
    console.log("Created additional doctors");
  }

  const existingLeads = await db.select().from(schema.leads);
  if (existingLeads.length < 10) {
    console.log("Adding more leads...");
    await db.insert(schema.leads).values([
      { code: "LED006", name: "Dr. Prashant Yadav", clinic: "Skin First Clinic", city: "Ahmedabad", state: "Gujarat", phone: "9876543226", stage: "Contacted", priority: "High", source: "Referral", assignedMRId: mrUsers[1]?.id, nextFollowUp: "2024-12-23" },
      { code: "LED007", name: "Dr. Meghna Chopra", clinic: "Derma Experts", city: "Lucknow", state: "Uttar Pradesh", phone: "9876543227", stage: "Qualified", priority: "Medium", source: "Conference" },
      { code: "LED008", name: "Dr. Sandeep Nair", clinic: "Skin Solutions Plus", city: "Kochi", state: "Kerala", phone: "9876543228", stage: "Proposal", priority: "High", source: "Website", assignedMRId: mrUsers[0]?.id, nextFollowUp: "2024-12-21" },
      { code: "LED009", name: "Dr. Pooja Sharma", clinic: "Cosmo Derm", city: "Jaipur", state: "Rajasthan", phone: "9876543229", stage: "New", priority: "Low", source: "Cold Call" },
      { code: "LED010", name: "Dr. Ashok Patel", clinic: "Advanced Skin Care", city: "Surat", state: "Gujarat", phone: "9876543230", stage: "Negotiation", priority: "High", source: "Referral", assignedMRId: mrUsers[2]?.id, nextFollowUp: "2024-12-20" },
    ]).returning();
    console.log("Created additional leads");
  }

  console.log("✅ Extra demo data seeding completed!");
}

seedExtra()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
