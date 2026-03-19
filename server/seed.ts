import { db } from "./db";
import * as schema from "../shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Starting database seeding...");
  
  // Hash password for all users
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // Seed Pricing Slabs
  console.log("Seeding pricing slabs...");
  const pricingSlabs = await db.insert(schema.pricingSlabs).values([
    { name: "Tier 1", discount: "25", minOrderValue: "50000", description: "Premium doctors" },
    { name: "Tier 2", discount: "20", minOrderValue: "25000", description: "Regular doctors" },
    { name: "Tier 3", discount: "15", minOrderValue: "10000", description: "New doctors" },
    { name: "Retail", discount: "10", minOrderValue: "5000", description: "Pharmacy orders" },
  ]).returning();
  console.log(`Created ${pricingSlabs.length} pricing slabs`);

  // Seed Carriers
  console.log("Seeding carriers...");
  const carriers = await db.insert(schema.carriers).values([
    { name: "Delhivery", phone: "1800-123-4567", email: "support@delhivery.com" },
    { name: "BlueDart", phone: "1800-234-5678", email: "support@bluedart.com" },
    { name: "DTDC", phone: "1800-345-6789", email: "support@dtdc.com" },
    { name: "Ecom Express", phone: "1800-456-7890", email: "support@ecomexpress.com" },
  ]).returning();
  console.log(`Created ${carriers.length} carriers`);

  // Seed Users (Admin + MRs)
  console.log("Seeding users...");
  const users = await db.insert(schema.users).values([
    { username: "admin", email: "admin@monoskin.com", password: hashedPassword, name: "Super Admin", role: "Super Admin" },
    { username: "amit.sharma", email: "amit@monoskin.in", password: hashedPassword, name: "Amit Sharma", phone: "98XXXXXX31", role: "Medical Representative" },
    { username: "priya.verma", email: "priya.v@monoskin.in", password: hashedPassword, name: "Priya Verma", phone: "98XXXXXX32", role: "Medical Representative" },
    { username: "rahul.kapoor", email: "rahul@monoskin.in", password: hashedPassword, name: "Rahul Kapoor", phone: "98XXXXXX33", role: "Medical Representative" },
    { username: "warehouse", email: "warehouse@monoskin.in", password: hashedPassword, name: "Warehouse Manager", role: "Warehouse Manager" },
    { username: "finance", email: "finance@monoskin.in", password: hashedPassword, name: "Finance Manager", role: "Finance Manager" },
  ]).returning();
  console.log(`Created ${users.length} users`);
  const mrUsers = users.filter(u => u.role === "Medical Representative");

  // Seed Products
  console.log("Seeding products...");
  const products = await db.insert(schema.products).values([
    { code: "PRD001", name: "432one", sku: "432ONE-30ML", category: "Serums", hsnCode: "33049990", gst: "18", mrp: "1299", packSize: "30ml", shelfLife: 24, barcode: "8901234567890", minStockThreshold: 100, description: "Advanced anti-aging serum with 4 peptides and 32 actives for comprehensive skin rejuvenation.", clinicalIndications: ["Anti-aging", "Fine Lines", "Wrinkles", "Skin Firmness"], avgMonthlySales3m: "450", avgMonthlySales6m: "420", avgMonthlySales12m: "380" },
    { code: "PRD002", name: "4zero1", sku: "4ZERO1-50ML", category: "Moisturizers", hsnCode: "33049990", gst: "18", mrp: "899", packSize: "50ml", shelfLife: 24, barcode: "8901234567891", minStockThreshold: 150, description: "Lightweight hydrating moisturizer with ceramides and hyaluronic acid.", clinicalIndications: ["Hydration", "Dry Skin", "Barrier Repair"], avgMonthlySales3m: "320", avgMonthlySales6m: "310", avgMonthlySales12m: "290" },
    { code: "PRD003", name: "Wecalm", sku: "WECALM-50ML", category: "Serums", hsnCode: "33049990", gst: "18", mrp: "1499", packSize: "50ml", shelfLife: 24, barcode: "8901234567892", minStockThreshold: 80, description: "Calming serum with centella asiatica and niacinamide for sensitive skin.", clinicalIndications: ["Redness", "Sensitivity", "Rosacea", "Irritation"], avgMonthlySales3m: "280", avgMonthlySales6m: "265", avgMonthlySales12m: "250" },
    { code: "PRD004", name: "Acnetech", sku: "ACNETECH-30ML", category: "Treatment", hsnCode: "33049990", gst: "18", mrp: "799", packSize: "30ml", shelfLife: 18, barcode: "8901234567893", minStockThreshold: 200, description: "Targeted acne treatment gel with salicylic acid and tea tree oil.", clinicalIndications: ["Acne", "Pimples", "Oily Skin", "Blackheads"], avgMonthlySales3m: "520", avgMonthlySales6m: "480", avgMonthlySales12m: "450" },
    { code: "PRD005", name: "Nanogrow", sku: "NANOGROW-60ML", category: "Hair Care", hsnCode: "33059090", gst: "18", mrp: "1899", packSize: "60ml", shelfLife: 24, barcode: "8901234567894", minStockThreshold: 100, description: "Hair growth serum with minoxidil alternative and biotin for thicker hair.", clinicalIndications: ["Hair Loss", "Thinning Hair", "Alopecia", "Hair Growth"], avgMonthlySales3m: "180", avgMonthlySales6m: "170", avgMonthlySales12m: "160" },
    { code: "PRD006", name: "Azelaic + Tranexamic", sku: "AZTR-30ML", category: "Treatment", hsnCode: "33049990", gst: "18", mrp: "1099", packSize: "30ml", shelfLife: 18, barcode: "8901234567895", minStockThreshold: 120, description: "Dual-action brightening serum for pigmentation and melasma.", clinicalIndications: ["Pigmentation", "Melasma", "Dark Spots", "Uneven Tone"], avgMonthlySales3m: "340", avgMonthlySales6m: "320", avgMonthlySales12m: "300" },
    { code: "PRD007", name: "Glycolic Acid Face Wash", sku: "GAFW-100ML", category: "Cleansers", hsnCode: "34013011", gst: "18", mrp: "599", packSize: "100ml", shelfLife: 24, barcode: "8901234567896", minStockThreshold: 250, description: "Exfoliating face wash with 2% glycolic acid for smoother skin texture.", clinicalIndications: ["Exfoliation", "Dull Skin", "Texture", "Pores"], avgMonthlySales3m: "420", avgMonthlySales6m: "400", avgMonthlySales12m: "380" },
  ]).returning();
  console.log(`Created ${products.length} products`);

  // Seed Warehouses
  console.log("Seeding warehouses...");
  const warehouses = await db.insert(schema.warehouses).values([
    { code: "IND", name: "Indore WH", city: "Indore", state: "Madhya Pradesh", pincode: "452001", capacity: 5000, managerId: users.find(u => u.role === "Warehouse Manager")?.id },
    { code: "MUM", name: "Mumbai WH", city: "Mumbai", state: "Maharashtra", pincode: "400001", capacity: 8000 },
    { code: "DEL", name: "Delhi WH", city: "Delhi", state: "Delhi", pincode: "110001", capacity: 6000 },
  ]).returning();
  console.log(`Created ${warehouses.length} warehouses`);

  // Seed Inventory
  console.log("Seeding inventory...");
  const inventoryData = await db.insert(schema.inventory).values([
    { productId: products[0].id, warehouseId: warehouses[0].id, batch: "B2024001", expiry: "2026-03-15", available: 450, reserved: 50, total: 500, costPrice: "800" },
    { productId: products[1].id, warehouseId: warehouses[0].id, batch: "B2024002", expiry: "2026-02-28", available: 280, reserved: 20, total: 300, costPrice: "550" },
    { productId: products[2].id, warehouseId: warehouses[1].id, batch: "B2024003", expiry: "2026-04-10", available: 600, reserved: 100, total: 700, costPrice: "900" },
    { productId: products[3].id, warehouseId: warehouses[1].id, batch: "B2024004", expiry: "2025-06-20", available: 150, reserved: 25, total: 175, costPrice: "500" },
    { productId: products[4].id, warehouseId: warehouses[2].id, batch: "B2024005", expiry: "2026-01-05", available: 320, reserved: 30, total: 350, costPrice: "1200" },
    { productId: products[5].id, warehouseId: warehouses[2].id, batch: "B2024006", expiry: "2025-08-15", available: 200, reserved: 40, total: 240, costPrice: "700" },
    { productId: products[6].id, warehouseId: warehouses[0].id, batch: "B2024007", expiry: "2026-05-30", available: 500, reserved: 0, total: 500, costPrice: "350" },
    { productId: products[0].id, warehouseId: warehouses[1].id, batch: "B2024008", expiry: "2026-04-20", available: 300, reserved: 25, total: 325, costPrice: "800" },
    { productId: products[0].id, warehouseId: warehouses[2].id, batch: "B2024009", expiry: "2026-05-10", available: 200, reserved: 15, total: 215, costPrice: "800" },
  ]).returning();
  console.log(`Created ${inventoryData.length} inventory records`);

  // Seed Doctors
  console.log("Seeding doctors...");
  const doctors = await db.insert(schema.doctors).values([
    { code: "DOC001", name: "Dr. Ananya Patel", specialization: "Dermatologist", clinic: "SkinCare Plus", city: "Indore", state: "Madhya Pradesh", phone: "98XXXXXX01", email: "ananya@example.com", gstin: "23XXXXX1234X1ZX", pricingSlabId: pricingSlabs[0].id, creditLimit: "100000", outstanding: "25000", importance: "High", assignedMRId: mrUsers[0]?.id },
    { code: "DOC002", name: "Dr. Vikram Mehta", specialization: "Dermatologist", clinic: "Dermis Clinic", city: "Mumbai", state: "Maharashtra", phone: "98XXXXXX02", email: "vikram@example.com", gstin: "27XXXXX5678X1ZX", pricingSlabId: pricingSlabs[1].id, creditLimit: "75000", outstanding: "15000", importance: "Medium", assignedMRId: mrUsers[1]?.id },
    { code: "DOC003", name: "Dr. Priya Sharma", specialization: "Cosmetologist", clinic: "Glow Aesthetics", city: "Delhi", state: "Delhi", phone: "98XXXXXX03", email: "priya@example.com", gstin: "07XXXXX9012X1ZX", pricingSlabId: pricingSlabs[0].id, creditLimit: "150000", outstanding: "45000", importance: "High", assignedMRId: mrUsers[0]?.id },
    { code: "DOC004", name: "Dr. Rahul Gupta", specialization: "Dermatologist", clinic: "Skin Solutions", city: "Indore", state: "Madhya Pradesh", phone: "98XXXXXX04", email: "rahul@example.com", gstin: "23XXXXX3456X1ZX", pricingSlabId: pricingSlabs[2].id, creditLimit: "50000", outstanding: "8000", importance: "Low", assignedMRId: mrUsers[2]?.id },
    { code: "DOC005", name: "Dr. Neha Singh", specialization: "Trichologist", clinic: "Hair Care Center", city: "Mumbai", state: "Maharashtra", phone: "98XXXXXX05", email: "neha@example.com", gstin: "27XXXXX7890X1ZX", pricingSlabId: pricingSlabs[1].id, creditLimit: "80000", outstanding: "32000", importance: "Medium", assignedMRId: mrUsers[1]?.id },
  ]).returning();
  console.log(`Created ${doctors.length} doctors`);

  // Seed Pharmacies
  console.log("Seeding pharmacies...");
  const pharmacies = await db.insert(schema.pharmacies).values([
    { code: "PHA001", name: "MedPlus Pharmacy", doctorId: doctors[0].id, city: "Indore", state: "Madhya Pradesh", phone: "98XXXXXX11", gstin: "23XXXXX1111X1ZX", pricingSlabId: pricingSlabs[3].id, creditLimit: "30000", outstanding: "5000" },
    { code: "PHA002", name: "Apollo Pharmacy", doctorId: doctors[1].id, city: "Mumbai", state: "Maharashtra", phone: "98XXXXXX12", gstin: "27XXXXX2222X1ZX", pricingSlabId: pricingSlabs[3].id, creditLimit: "50000", outstanding: "12000" },
    { code: "PHA003", name: "Wellness Forever", doctorId: doctors[2].id, city: "Delhi", state: "Delhi", phone: "98XXXXXX13", gstin: "07XXXXX3333X1ZX", pricingSlabId: pricingSlabs[3].id, creditLimit: "40000", outstanding: "8000" },
  ]).returning();
  console.log(`Created ${pharmacies.length} pharmacies`);

  // Seed Leads
  console.log("Seeding leads...");
  const leads = await db.insert(schema.leads).values([
    { code: "LED001", name: "Dr. Sunita Reddy", clinic: "Aura Skin Clinic", city: "Hyderabad", state: "Telangana", phone: "98XXXXXX21", stage: "Qualified", priority: "High", source: "Referral", assignedMRId: mrUsers[0]?.id, nextFollowUp: "2024-12-20" },
    { code: "LED002", name: "Dr. Karan Malhotra", clinic: "DermaCare", city: "Bangalore", state: "Karnataka", phone: "98XXXXXX22", stage: "Contacted", priority: "Medium", source: "Conference", assignedMRId: mrUsers[1]?.id, nextFollowUp: "2024-12-22" },
    { code: "LED003", name: "Dr. Meera Joshi", clinic: "Skin & Hair Solutions", city: "Pune", state: "Maharashtra", phone: "98XXXXXX23", stage: "New", priority: "Low", source: "Website" },
    { code: "LED004", name: "Dr. Arjun Nair", clinic: "CosmoDerm", city: "Chennai", state: "Tamil Nadu", phone: "98XXXXXX24", stage: "Proposal", priority: "High", source: "Referral", assignedMRId: mrUsers[0]?.id, nextFollowUp: "2024-12-19" },
    { code: "LED005", name: "Dr. Sneha Agarwal", clinic: "Radiance Clinic", city: "Kolkata", state: "West Bengal", phone: "98XXXXXX25", stage: "Negotiation", priority: "High", source: "Cold Call", assignedMRId: mrUsers[2]?.id, nextFollowUp: "2024-12-18" },
  ]).returning();
  console.log(`Created ${leads.length} leads`);

  // Seed Orders
  console.log("Seeding orders...");
  const orders = await db.insert(schema.orders).values([
    { orderNumber: "ORD-2024-001", doctorId: doctors[0].id, warehouseId: warehouses[0].id, status: "Delivered", subtotal: "45000", total: "45000", mrId: mrUsers[0]?.id, deliveredAt: new Date("2024-12-14") },
    { orderNumber: "ORD-2024-002", doctorId: doctors[1].id, warehouseId: warehouses[1].id, status: "Dispatched", subtotal: "32000", total: "32000", mrId: mrUsers[1]?.id },
    { orderNumber: "ORD-2024-003", doctorId: doctors[2].id, warehouseId: warehouses[2].id, status: "Picking", subtotal: "78000", total: "78000", mrId: mrUsers[0]?.id },
    { orderNumber: "ORD-2024-004", doctorId: doctors[3].id, warehouseId: warehouses[0].id, status: "Pending Approval", subtotal: "52000", total: "52000", mrId: mrUsers[2]?.id },
    { orderNumber: "ORD-2024-005", doctorId: doctors[4].id, warehouseId: warehouses[1].id, status: "Packed", subtotal: "28000", total: "28000", mrId: mrUsers[1]?.id },
  ]).returning();
  console.log(`Created ${orders.length} orders`);

  // Seed Order Items
  console.log("Seeding order items...");
  const orderItems = await db.insert(schema.orderItems).values([
    { orderId: orders[0].id, productId: products[0].id, quantity: 20, unitPrice: "1299", total: "25980" },
    { orderId: orders[0].id, productId: products[1].id, quantity: 15, unitPrice: "899", total: "13485" },
    { orderId: orders[1].id, productId: products[2].id, quantity: 10, unitPrice: "1499", total: "14990" },
    { orderId: orders[2].id, productId: products[3].id, quantity: 25, unitPrice: "799", total: "19975" },
    { orderId: orders[2].id, productId: products[4].id, quantity: 12, unitPrice: "1899", total: "22788" },
  ]).returning();
  console.log(`Created ${orderItems.length} order items`);

  // Seed Invoices
  console.log("Seeding invoices...");
  const invoices = await db.insert(schema.invoices).values([
    { invoiceNumber: "INV-2024-001", orderId: orders[0].id, doctorId: doctors[0].id, amount: "45000", status: "Paid", dueDate: "2024-12-25", paidAt: new Date("2024-12-20") },
    { invoiceNumber: "INV-2024-002", orderId: orders[1].id, doctorId: doctors[1].id, amount: "32000", status: "Pending", dueDate: "2024-12-28" },
    { invoiceNumber: "INV-2024-003", doctorId: doctors[2].id, amount: "25000", status: "Overdue", dueDate: "2024-12-10" },
  ]).returning();
  console.log(`Created ${invoices.length} invoices`);

  // Seed Approvals
  console.log("Seeding approvals...");
  const approvals = await db.insert(schema.approvals).values([
    { type: "Credit Limit", entityType: "doctor", entityId: doctors[3].id, status: "Pending", requestReason: "Good payment history", beforeValue: "50000", afterValue: "75000" },
    { type: "Price Override", entityType: "order", entityId: orders[3].id, status: "Pending", requestReason: "Bulk order", beforeValue: "15% discount", afterValue: "20% discount" },
    { type: "Stock Adjustment", entityType: "warehouse", entityId: warehouses[0].id, status: "Approved", requestReason: "Damaged goods", beforeValue: "500 units", afterValue: "485 units" },
    { type: "Return Request", entityType: "order", entityId: orders[0].id, status: "Pending", requestReason: "Near expiry received", afterValue: "5 units return" },
  ]).returning();
  console.log(`Created ${approvals.length} approvals`);

  // Seed Shipments
  console.log("Seeding shipments...");
  const shipments = await db.insert(schema.shipments).values([
    { orderId: orders[0].id, warehouseId: warehouses[0].id, status: "Delivered", carrierId: carriers[0].id, trackingId: "DL123456789", weight: "2.5", packages: 1, sealNumber: "SEAL-001", dispatchedAt: new Date("2024-12-12"), deliveredAt: new Date("2024-12-14") },
    { orderId: orders[1].id, warehouseId: warehouses[1].id, status: "In Transit", carrierId: carriers[1].id, trackingId: "BD987654321", weight: "1.8", packages: 1, sealNumber: "SEAL-002", dispatchedAt: new Date("2024-12-15") },
    { orderId: orders[4].id, warehouseId: warehouses[1].id, status: "Ready for Dispatch", weight: "1.2", packages: 1 },
    { orderId: orders[2].id, warehouseId: warehouses[2].id, status: "Pending" },
  ]).returning();
  console.log(`Created ${shipments.length} shipments`);

  // Seed GRNs
  console.log("Seeding GRNs...");
  const grns = await db.insert(schema.grns).values([
    { grnNumber: "GRN-2024-001", warehouseId: warehouses[0].id, supplier: "Monoskin Manufacturing", status: "Completed", receivedAt: new Date("2024-12-05") },
    { grnNumber: "GRN-2024-002", warehouseId: warehouses[1].id, supplier: "Monoskin Manufacturing", status: "Completed", receivedAt: new Date("2024-12-08") },
    { grnNumber: "GRN-2024-003", warehouseId: warehouses[2].id, supplier: "Monoskin Manufacturing", status: "Pending Verification", receivedAt: new Date("2024-12-15") },
  ]).returning();
  console.log(`Created ${grns.length} GRNs`);

  // Seed Transfers
  console.log("Seeding transfers...");
  const transfers = await db.insert(schema.transfers).values([
    { transferNumber: "TRF-2024-001", fromWarehouseId: warehouses[0].id, toWarehouseId: warehouses[1].id, status: "Completed", completedAt: new Date("2024-12-13") },
    { transferNumber: "TRF-2024-002", fromWarehouseId: warehouses[1].id, toWarehouseId: warehouses[2].id, status: "In Transit" },
    { transferNumber: "TRF-2024-003", fromWarehouseId: warehouses[2].id, toWarehouseId: warehouses[0].id, status: "Pending Dispatch" },
  ]).returning();
  console.log(`Created ${transfers.length} transfers`);

  // Seed Promo Codes
  console.log("Seeding promo codes...");
  const promoCodes = await db.insert(schema.promoCodes).values([
    { code: "PROMO10", discount: "10", type: "Percentage", status: "Active", usageLimit: 1000, usedCount: 45, validFrom: "2024-01-01", validTo: "2024-12-31", purposeChannel: "Both", schemeStackability: "Allow", perCustomerLimit: 5 },
    { code: "FIRST50", discount: "50", type: "Fixed", status: "Active", usageLimit: 500, usedCount: 120, validFrom: "2024-01-01", validTo: "2024-12-31", purposeChannel: "Online", schemeStackability: "Block", perCustomerLimit: 1 },
    { code: "WINTER25", discount: "25", type: "Percentage", status: "Scheduled", usageLimit: 200, usedCount: 0, validFrom: "2025-01-01", validTo: "2025-02-28", purposeChannel: "Doctor/Pharmacy", schemeStackability: "Allow", perCustomerLimit: 3 },
  ]).returning();
  console.log(`Created ${promoCodes.length} promo codes`);

  // Seed Clinic Codes
  console.log("Seeding clinic codes...");
  const clinicCodes = await db.insert(schema.clinicCodes).values([
    { code: "MONO-DOC001-001", type: "Bulk", doctorId: doctors[0].id, promoCodeId: promoCodes[0].id, discount: "10", status: "Active", usageCount: 15, sharedCount: 50, convertedToOrders: 8, totalRevenue: "360000", avgOrderValue: "45000" },
    { code: "MONO-DOC002-001", type: "Retail", doctorId: doctors[1].id, promoCodeId: promoCodes[0].id, discount: "10", status: "Active", usageCount: 8, sharedCount: 30, convertedToOrders: 5, totalRevenue: "140000", avgOrderValue: "28000" },
    { code: "MONO-DOC003-001", type: "Bulk", doctorId: doctors[2].id, promoCodeId: promoCodes[0].id, discount: "10", status: "Active", usageCount: 22, sharedCount: 80, convertedToOrders: 12, totalRevenue: "936000", avgOrderValue: "78000" },
  ]).returning();
  console.log(`Created ${clinicCodes.length} clinic codes`);

  // Seed Schemes - handled via individual inserts to avoid TS issues with union types
  console.log("Seeding schemes...");
  const schemeValues = [
    { name: "Winter Sale 2025", type: "percentage", discount: "20", minOrderValue: "25000", validFrom: "2025-01-01", validTo: "2025-02-28", description: "Winter season promotional discount" },
    { name: "Doctor Loyalty Program", type: "percentage", discount: "15", minOrderValue: "50000", validFrom: "2024-01-01", validTo: "2025-12-31", description: "Special discount for loyal doctors" },
    { name: "First Order Bonus", type: "fixed", discount: "2500", minOrderValue: "10000", validFrom: "2024-01-01", validTo: "2025-12-31", description: "First-time customer bonus discount" },
    { name: "Bulk Purchase Deal", type: "percentage", discount: "30", minOrderValue: "100000", validFrom: "2024-06-01", validTo: "2025-06-30", description: "Volume-based discount for bulk orders" },
    { name: "Holiday Bundle", type: "bundle", discount: "40", minOrderValue: "20000", validFrom: "2024-11-01", validTo: "2024-12-31", description: "Holiday promotional bundle deal" },
  ] as const;
  for (const s of schemeValues) {
    await db.insert(schema.schemes).values(s as any);
  }
  console.log("Created 5 schemes");

  // Seed Returns
  console.log("Seeding returns...");
  const returnsData = await db.insert(schema.returns).values([
    { returnNumber: "RET-2024-001", orderId: orders[0].id, doctorId: doctors[0].id, warehouseId: warehouses[0].id, status: "Completed", reason: "Damaged packaging", receivedAt: new Date("2024-12-16") },
    { returnNumber: "RET-2024-002", orderId: orders[1].id, doctorId: doctors[1].id, warehouseId: warehouses[1].id, status: "In Transit", reason: "Near expiry" },
    { returnNumber: "RET-2024-003", orderId: orders[2].id, doctorId: doctors[2].id, warehouseId: warehouses[2].id, status: "Pending Pickup", reason: "Wrong product" },
  ]).returning();
  console.log(`Created ${returnsData.length} returns`);

  // Seed Employees
  console.log("Seeding employees...");
  const employeesData = await db.insert(schema.employees).values([
    { employeeCode: "EMP001", name: "Amit Sharma", email: "amit.emp@monoskin.in", phone: "98XXXXXX31", department: "Sales" as const, role: "Senior MR", joiningDate: new Date("2022-01-15"), status: "Active" as const },
    { employeeCode: "EMP002", name: "Priya Verma", email: "priya.emp@monoskin.in", phone: "98XXXXXX32", department: "Sales" as const, role: "MR", joiningDate: new Date("2023-03-20"), status: "Active" as const },
    { employeeCode: "EMP003", name: "Rahul Kapoor", email: "rahul.emp@monoskin.in", phone: "98XXXXXX33", department: "Sales" as const, role: "MR", joiningDate: new Date("2023-06-10"), status: "Active" as const },
    { employeeCode: "EMP004", name: "Warehouse Manager", email: "warehouse.emp@monoskin.in", phone: "98XXXXXX40", department: "Operations" as const, role: "Manager", joiningDate: new Date("2021-05-01"), status: "Active" as const },
    { employeeCode: "EMP005", name: "Finance Manager", email: "finance.emp@monoskin.in", phone: "98XXXXXX50", department: "Finance" as const, role: "Manager", joiningDate: new Date("2021-08-15"), status: "Active" as const },
  ]).returning();
  console.log(`Created ${employeesData.length} employees`);

  // Seed Audit Logs
  console.log("Seeding audit logs...");
  const auditLogs = await db.insert(schema.auditLogs).values([
    { action: "Order Created", entityType: "order", entityId: orders[3].id.toString(), userEmail: "admin@monoskin.in", afterValue: `Order created for ${doctors[3].name}` },
    { action: "Credit Limit Update", entityType: "doctor", entityId: doctors[0].id.toString(), userEmail: "finance@monoskin.in", reason: "Good payment history", beforeValue: "75000", afterValue: "100000" },
    { action: "Stock Adjustment", entityType: "warehouse", entityId: warehouses[0].id.toString(), userEmail: "warehouse@monoskin.in", reason: "Damaged goods", beforeValue: "500", afterValue: "485" },
    { action: "Approval Approved", entityType: "approval", entityId: approvals[2].id.toString(), userEmail: "admin@monoskin.in", reason: "Verified damage report", beforeValue: "Pending", afterValue: "Approved" },
  ]).returning();
  console.log(`Created ${auditLogs.length} audit logs`);

  // Seed Access Logs
  console.log("Seeding access logs...");
  const accessLogs = await db.insert(schema.accessLogs).values([
    { action: "Sensitive Data Revealed", entityType: "doctor", entityId: doctors[0].id.toString(), field: "Phone Number", userEmail: "sales@monoskin.in", ipAddress: "192.168.1.100" },
    { action: "Export Downloaded", entityType: "Orders Report", entityId: "report", field: "CSV", userEmail: "admin@monoskin.in", ipAddress: "192.168.1.101" },
    { action: "Sensitive Data Revealed", entityType: "doctor", entityId: doctors[2].id.toString(), field: "GSTIN", userEmail: "finance@monoskin.in", ipAddress: "192.168.1.102" },
  ]).returning();
  console.log(`Created ${accessLogs.length} access logs`);

  // Seed Tax HSN Codes
  console.log("Seeding tax HSN codes...");
  const taxHSNCodes = await db.insert(schema.taxHSNCodes).values([
    { hsnCode: "33049990", description: "Beauty and skin care preparations", gstRate: "18", cgst: "9", sgst: "9", igst: "18" },
    { hsnCode: "33059090", description: "Hair care preparations", gstRate: "18", cgst: "9", sgst: "9", igst: "18" },
    { hsnCode: "34013011", description: "Medicated soaps", gstRate: "18", cgst: "9", sgst: "9", igst: "18" },
    { hsnCode: "30049099", description: "Pharmaceutical preparations", gstRate: "12", cgst: "6", sgst: "6", igst: "12" },
    { hsnCode: "33030010", description: "Perfumes and toilet waters", gstRate: "28", cgst: "14", sgst: "14", igst: "28" },
  ]).returning();
  console.log(`Created ${taxHSNCodes.length} tax HSN codes`);

  // Seed Credit Notes
  console.log("Seeding credit notes...");
  const creditNotesData = await db.insert(schema.creditNotes).values([
    { creditNoteNumber: "CN-2024-0001", invoiceId: invoices[0]?.id, doctorId: doctors[0].id, amount: "5000", reason: "Product Return - Damaged", status: "approved", approvedAt: new Date("2024-12-10") },
    { creditNoteNumber: "CN-2024-0002", invoiceId: invoices[1]?.id, doctorId: doctors[1].id, amount: "3500", reason: "Near-Expiry Return", status: "applied", approvedAt: new Date("2024-12-12"), appliedAt: new Date("2024-12-15") },
    { creditNoteNumber: "CN-2024-0003", doctorId: doctors[2].id, amount: "7500", reason: "Price Adjustment", status: "draft" },
    { creditNoteNumber: "CN-2024-0004", invoiceId: invoices[2]?.id, doctorId: doctors[3].id, amount: "2000", reason: "Billing Error", status: "approved", approvedAt: new Date("2024-12-20") },
    { creditNoteNumber: "CN-2025-0001", pharmacyId: pharmacies[0]?.id, amount: "4500", reason: "Product Return - Wrong Item", status: "draft" },
  ]).returning();
  console.log(`Created ${creditNotesData.length} credit notes`);

  // Seed Territories
  console.log("Seeding territories...");
  const territoriesData = await db.insert(schema.territories).values([
    { code: "NORTH", name: "North Zone", region: "North", state: "Delhi", isActive: true },
    { code: "WEST", name: "West Zone", region: "West", state: "Maharashtra", isActive: true },
    { code: "SOUTH", name: "South Zone", region: "South", state: "Karnataka", isActive: true },
    { code: "EAST", name: "East Zone", region: "East", state: "West Bengal", isActive: true },
    { code: "MP", name: "Madhya Pradesh", region: "Central", state: "Madhya Pradesh", isActive: true },
    { code: "GJ", name: "Gujarat", region: "West", state: "Gujarat", isActive: true },
    { code: "TN", name: "Tamil Nadu", region: "South", state: "Tamil Nadu", isActive: true },
    { code: "UP", name: "Uttar Pradesh", region: "North", state: "Uttar Pradesh", isActive: true },
  ]).returning();
  console.log(`Created ${territoriesData.length} territories`);

  // Seed MRs (Medical Representatives)
  console.log("Seeding MRs...");
  const mrsData = await db.insert(schema.mrs).values([
    { code: "MR001", name: "Amit Sharma", phone: "9876543201", email: "amit.mr@monoskin.in", territory: "MP", manager: "Regional Sales Head", status: "Active", joiningDate: new Date("2022-01-15") },
    { code: "MR002", name: "Priya Verma", phone: "9876543202", email: "priya.mr@monoskin.in", territory: "WEST", manager: "Regional Sales Head", status: "Active", joiningDate: new Date("2023-03-20") },
    { code: "MR003", name: "Rahul Kapoor", phone: "9876543203", email: "rahul.mr@monoskin.in", territory: "NORTH", manager: "Zonal Sales Manager", status: "Active", joiningDate: new Date("2023-06-10") },
    { code: "MR004", name: "Sunita Reddy", phone: "9876543204", email: "sunita.mr@monoskin.in", territory: "SOUTH", manager: "Zonal Sales Manager", status: "Active", joiningDate: new Date("2022-08-05") },
    { code: "MR005", name: "Vikram Singh", phone: "9876543205", email: "vikram.mr@monoskin.in", territory: "EAST", manager: "Regional Sales Head", status: "Active", joiningDate: new Date("2023-01-10") },
  ]).returning();
  console.log(`Created ${mrsData.length} MRs`);

  // Seed MR Visits
  console.log("Seeding MR visits...");
  const mrVisitsData = await db.insert(schema.mrVisits).values([
    { mrId: mrsData[0].id, doctorId: doctors[0].id, visitDate: new Date("2024-12-18"), purpose: "Product Demo", outcome: "Interested", notes: "Doctor showed interest in 432one serum", nextVisitDate: new Date("2024-12-25") },
    { mrId: mrsData[0].id, doctorId: doctors[2].id, visitDate: new Date("2024-12-17"), purpose: "Follow-up", outcome: "Order Placed", notes: "Placed order for Wecalm and Acnetech", orderValue: "45000" },
    { mrId: mrsData[1].id, doctorId: doctors[1].id, visitDate: new Date("2024-12-16"), purpose: "New Product Introduction", outcome: "Sample Requested", notes: "Requested samples of Nanogrow" },
    { mrId: mrsData[1].id, doctorId: doctors[4].id, visitDate: new Date("2024-12-15"), purpose: "Complaint Resolution", outcome: "Resolved", notes: "Addressed packaging concern, provided replacement" },
    { mrId: mrsData[2].id, doctorId: doctors[3].id, visitDate: new Date("2024-12-18"), purpose: "Scheme Presentation", outcome: "Interested", notes: "Presented Winter Sale scheme", nextVisitDate: new Date("2024-12-22") },
    { mrId: mrsData[0].id, doctorId: doctors[0].id, visitDate: new Date("2024-12-10"), purpose: "Order Collection", outcome: "Order Placed", notes: "Monthly reorder collected", orderValue: "78000" },
    { mrId: mrsData[3].id, doctorId: doctors[1].id, visitDate: new Date("2024-12-12"), purpose: "Credit Discussion", outcome: "Follow-up Needed", notes: "Discussed credit limit increase request" },
  ]).returning();
  console.log(`Created ${mrVisitsData.length} MR visits`);

  // Seed MR Targets
  console.log("Seeding MR targets...");
  const mrTargetsData = await db.insert(schema.mrTargets).values([
    { mrId: mrsData[0].id, month: "2024-12", salesTarget: "500000", salesAchieved: "420000", visitTarget: 25, visitsCompleted: 22, newDoctorTarget: 3, newDoctorsAcquired: 2, collectionTarget: "400000", collectionAchieved: "380000" },
    { mrId: mrsData[1].id, month: "2024-12", salesTarget: "450000", salesAchieved: "380000", visitTarget: 22, visitsCompleted: 20, newDoctorTarget: 2, newDoctorsAcquired: 2, collectionTarget: "350000", collectionAchieved: "320000" },
    { mrId: mrsData[2].id, month: "2024-12", salesTarget: "400000", salesAchieved: "350000", visitTarget: 20, visitsCompleted: 18, newDoctorTarget: 2, newDoctorsAcquired: 1, collectionTarget: "320000", collectionAchieved: "290000" },
    { mrId: mrsData[3].id, month: "2024-12", salesTarget: "480000", salesAchieved: "450000", visitTarget: 24, visitsCompleted: 23, newDoctorTarget: 3, newDoctorsAcquired: 3, collectionTarget: "380000", collectionAchieved: "370000" },
    { mrId: mrsData[4].id, month: "2024-12", salesTarget: "350000", salesAchieved: "280000", visitTarget: 18, visitsCompleted: 15, newDoctorTarget: 2, newDoctorsAcquired: 1, collectionTarget: "280000", collectionAchieved: "240000" },
    { mrId: mrsData[0].id, month: "2024-11", salesTarget: "500000", salesAchieved: "520000", visitTarget: 25, visitsCompleted: 26, newDoctorTarget: 3, newDoctorsAcquired: 4, collectionTarget: "400000", collectionAchieved: "420000" },
    { mrId: mrsData[1].id, month: "2024-11", salesTarget: "450000", salesAchieved: "440000", visitTarget: 22, visitsCompleted: 22, newDoctorTarget: 2, newDoctorsAcquired: 2, collectionTarget: "350000", collectionAchieved: "360000" },
  ]).returning();
  console.log(`Created ${mrTargetsData.length} MR targets`);

  // Seed HR Attendance
  console.log("Seeding HR attendance...");
  const attendanceData = await db.insert(schema.hrAttendance).values([
    { employeeId: employeesData[0].id, date: new Date("2024-12-18"), checkIn: "09:15", checkOut: "18:30", status: "present", workHours: "9.25", location: "Indore Office" },
    { employeeId: employeesData[0].id, date: new Date("2024-12-17"), checkIn: "09:00", checkOut: "18:00", status: "present", workHours: "9.0", location: "Field Visit" },
    { employeeId: employeesData[1].id, date: new Date("2024-12-18"), checkIn: "09:30", checkOut: "18:45", status: "present", workHours: "9.25", location: "Mumbai Office" },
    { employeeId: employeesData[1].id, date: new Date("2024-12-17"), status: "leave", notes: "Sick leave" },
    { employeeId: employeesData[2].id, date: new Date("2024-12-18"), checkIn: "09:00", checkOut: "13:00", status: "half-day", workHours: "4.0", location: "Delhi Office" },
    { employeeId: employeesData[3].id, date: new Date("2024-12-18"), checkIn: "08:45", checkOut: "17:30", status: "present", workHours: "8.75", location: "Indore Warehouse" },
    { employeeId: employeesData[4].id, date: new Date("2024-12-18"), checkIn: "09:00", checkOut: "18:00", status: "present", workHours: "9.0", location: "Head Office" },
    { employeeId: employeesData[0].id, date: new Date("2024-12-16"), checkIn: "09:00", checkOut: "18:15", status: "present", workHours: "9.25", location: "Field Visit" },
    { employeeId: employeesData[1].id, date: new Date("2024-12-16"), checkIn: "09:15", checkOut: "18:30", status: "present", workHours: "9.25", location: "Mumbai Office" },
    { employeeId: employeesData[2].id, date: new Date("2024-12-16"), checkIn: "09:30", checkOut: "18:30", status: "present", workHours: "9.0", location: "Delhi Office" },
  ]).returning();
  console.log(`Created ${attendanceData.length} attendance records`);

  // Seed Compliance Items
  console.log("Seeding compliance items...");
  const complianceData = await db.insert(schema.complianceItems).values([
    { category: "Drug License", requirement: "Drug License Renewal - Maharashtra", status: "compliant", dueDate: new Date("2025-06-30"), assignee: "Finance Manager", documents: 3, notes: "License valid until June 2025" },
    { category: "GST", requirement: "Monthly GST Filing - December 2024", status: "pending", dueDate: new Date("2025-01-20"), assignee: "Finance Team", documents: 0 },
    { category: "Drug License", requirement: "Drug License Renewal - Delhi", status: "expiring", dueDate: new Date("2025-02-15"), assignee: "Compliance Officer", documents: 2, notes: "Renewal application to be filed" },
    { category: "Statutory", requirement: "Annual Return Filing - FY 2023-24", status: "compliant", dueDate: new Date("2024-11-30"), assignee: "Finance Manager", documents: 5 },
    { category: "Quality", requirement: "ISO Certification Audit", status: "pending", dueDate: new Date("2025-03-15"), assignee: "Quality Team", documents: 1, notes: "Pre-audit scheduled for Feb" },
    { category: "Tax", requirement: "TDS Return Filing Q3", status: "compliant", dueDate: new Date("2025-01-15"), assignee: "Finance Team", documents: 2 },
    { category: "Statutory", requirement: "PF/ESI Monthly Compliance", status: "compliant", dueDate: new Date("2025-01-15"), assignee: "HR Team", documents: 2 },
  ]).returning();
  console.log(`Created ${complianceData.length} compliance items`);

  // Seed Licenses
  console.log("Seeding licenses...");
  const licensesData = await db.insert(schema.licenses).values([
    { name: "Drug License - Maharashtra", type: "Drug License", licenseNumber: "DL-MH-2024-001", issueDate: new Date("2024-01-15"), expiryDate: new Date("2025-06-30"), status: "active", renewalStatus: "not-started" },
    { name: "Drug License - Delhi", type: "Drug License", licenseNumber: "DL-DL-2023-045", issueDate: new Date("2023-02-20"), expiryDate: new Date("2025-02-15"), status: "expiring", renewalStatus: "in-progress" },
    { name: "Drug License - Madhya Pradesh", type: "Drug License", licenseNumber: "DL-MP-2024-023", issueDate: new Date("2024-03-10"), expiryDate: new Date("2026-03-10"), status: "active", renewalStatus: "not-started" },
    { name: "GST Registration", type: "GST", licenseNumber: "27AXXXX1234X1Z5", issueDate: new Date("2020-07-01"), status: "active", renewalStatus: "not-started" },
    { name: "FSSAI License", type: "FSSAI", licenseNumber: "10024999000123", issueDate: new Date("2023-08-15"), expiryDate: new Date("2028-08-14"), status: "active", renewalStatus: "not-started" },
  ]).returning();
  console.log(`Created ${licensesData.length} licenses`);

  // Seed Picking Tasks
  console.log("Seeding picking tasks...");
  const pickingTasks = await db.insert(schema.pickingTasks).values([
    { taskNumber: "PICK-2024-001", orderId: orders[2].id, warehouseId: warehouses[2].id, items: 8, zone: "Zone A", status: "in-progress", priority: "high" },
    { taskNumber: "PICK-2024-002", orderId: orders[4].id, warehouseId: warehouses[1].id, items: 5, zone: "Zone B", status: "completed", priority: "normal", completedAt: new Date("2024-12-17") },
    { taskNumber: "PICK-2024-003", warehouseId: warehouses[0].id, items: 12, zone: "Zone A", status: "pending", priority: "urgent" },
    { taskNumber: "PICK-2024-004", warehouseId: warehouses[1].id, items: 6, zone: "Zone C", status: "pending", priority: "normal" },
    { taskNumber: "PICK-2024-005", warehouseId: warehouses[2].id, items: 10, zone: "Zone B", status: "completed", priority: "high", completedAt: new Date("2024-12-16") },
  ]).returning();
  console.log(`Created ${pickingTasks.length} picking tasks`);

  // Seed Packing Tasks
  console.log("Seeding packing tasks...");
  const packingTasks = await db.insert(schema.packingTasks).values([
    { taskNumber: "PACK-2024-001", pickingTaskId: pickingTasks[1].id, orderId: orders[4].id, warehouseId: warehouses[1].id, items: 5, status: "completed", priority: "normal", completedAt: new Date("2024-12-17") },
    { taskNumber: "PACK-2024-002", pickingTaskId: pickingTasks[4].id, warehouseId: warehouses[2].id, items: 10, status: "completed", priority: "high", completedAt: new Date("2024-12-16") },
    { taskNumber: "PACK-2024-003", warehouseId: warehouses[0].id, items: 8, status: "in-progress", priority: "urgent" },
    { taskNumber: "PACK-2024-004", warehouseId: warehouses[1].id, items: 4, status: "pending", priority: "normal" },
  ]).returning();
  console.log(`Created ${packingTasks.length} packing tasks`);

  // Seed Dispatch Tasks
  console.log("Seeding dispatch tasks...");
  const dispatchTasks = await db.insert(schema.dispatchTasks).values([
    { taskNumber: "DISP-2024-001", packingTaskId: packingTasks[0].id, orderId: orders[4].id, warehouseId: warehouses[1].id, carrierId: carriers[0].id, items: 5, destination: "Mumbai - Dr. Vikram Mehta", status: "completed", priority: "normal", dispatchedAt: new Date("2024-12-17") },
    { taskNumber: "DISP-2024-002", packingTaskId: packingTasks[1].id, warehouseId: warehouses[2].id, carrierId: carriers[1].id, items: 10, destination: "Delhi - Dr. Priya Sharma", status: "in-progress", priority: "high", scheduledAt: new Date("2024-12-19") },
    { taskNumber: "DISP-2024-003", warehouseId: warehouses[0].id, items: 8, destination: "Indore - Dr. Ananya Patel", status: "pending", priority: "urgent", scheduledAt: new Date("2024-12-20") },
    { taskNumber: "DISP-2024-004", warehouseId: warehouses[1].id, carrierId: carriers[2].id, items: 6, destination: "Pune - Dr. Rahul Gupta", status: "pending", priority: "normal" },
  ]).returning();
  console.log(`Created ${dispatchTasks.length} dispatch tasks`);

  // Seed Report Templates
  console.log("Seeding report templates...");
  const reportTemplates = await db.insert(schema.reportTemplates).values([
    { name: "Monthly Sales Report", description: "Comprehensive monthly sales analysis by territory, MR, and product", category: "sales", icon: "BarChart3", frequency: "monthly", isActive: true },
    { name: "Inventory Status Report", description: "Current stock levels, near-expiry items, and reorder suggestions", category: "inventory", icon: "Package", frequency: "weekly", isActive: true },
    { name: "MR Performance Dashboard", description: "MR-wise sales, visits, and target achievement analysis", category: "sales", icon: "Users", frequency: "monthly", isActive: true },
    { name: "Financial Summary", description: "Revenue, collections, outstanding, and P&L summary", category: "finance", icon: "DollarSign", frequency: "monthly", isActive: true },
    { name: "Doctor Engagement Report", description: "Doctor ordering patterns and engagement metrics", category: "crm", icon: "Stethoscope", frequency: "quarterly", isActive: true },
    { name: "Warehouse Operations Report", description: "GRN, transfers, picking efficiency, and dispatch metrics", category: "operations", icon: "Warehouse", frequency: "weekly", isActive: true },
    { name: "GST Report", description: "GST liability and input tax credit summary", category: "finance", icon: "FileText", frequency: "monthly", isActive: true },
    { name: "HR Compliance Report", description: "Attendance, leave, and compliance status", category: "hr", icon: "ClipboardCheck", frequency: "monthly", isActive: true },
  ]).returning();
  console.log(`Created ${reportTemplates.length} report templates`);

  // Seed Integrations
  console.log("Seeding integrations...");
  const integrationsData = await db.insert(schema.integrations).values([
    { name: "Tally ERP", type: "accounting", status: "connected", lastSyncAt: new Date("2024-12-18T10:30:00") },
    { name: "Shiprocket", type: "logistics", status: "connected", lastSyncAt: new Date("2024-12-18T14:15:00") },
    { name: "Razorpay", type: "payment", status: "connected", lastSyncAt: new Date("2024-12-17T16:45:00") },
    { name: "WhatsApp Business", type: "communication", status: "disconnected", errorMessage: "Token expired" },
    { name: "Google Sheets", type: "export", status: "connected", lastSyncAt: new Date("2024-12-16T09:00:00") },
  ]).returning();
  console.log(`Created ${integrationsData.length} integrations`);

  // Seed Payments/Receipts
  console.log("Seeding payments...");
  const paymentsData = await db.insert(schema.payments).values([
    { invoiceId: invoices[0].id, doctorId: doctors[0].id, amount: "45000", method: "NEFT", referenceNumber: "NEFT20241220001", receivedAt: new Date("2024-12-20"), notes: "Full payment received" },
    { invoiceId: invoices[1].id, doctorId: doctors[1].id, amount: "15000", method: "UPI", referenceNumber: "UPI20241218001", receivedAt: new Date("2024-12-18"), notes: "Partial payment" },
    { doctorId: doctors[2].id, amount: "25000", method: "Cheque", referenceNumber: "CHQ-789456", receivedAt: new Date("2024-12-15"), notes: "Advance payment for new order" },
    { doctorId: doctors[0].id, amount: "50000", method: "RTGS", referenceNumber: "RTGS20241210001", receivedAt: new Date("2024-12-10"), notes: "Outstanding clearance" },
  ]).returning();
  console.log(`Created ${paymentsData.length} payments`);

  // Add more products for variety
  console.log("Adding more products...");
  const moreProducts = await db.insert(schema.products).values([
    { code: "PRD008", name: "Vitamin C Serum", sku: "VITC-30ML", category: "Serums", hsnCode: "33049990", gst: "18", mrp: "1199", packSize: "30ml", shelfLife: 18, barcode: "8901234567897", minStockThreshold: 120, description: "Brightening serum with 15% L-Ascorbic Acid and Ferulic Acid.", clinicalIndications: ["Brightening", "Anti-oxidant", "Pigmentation", "Dull Skin"] },
    { code: "PRD009", name: "Retinol Night Cream", sku: "RETN-50G", category: "Treatment", hsnCode: "33049990", gst: "18", mrp: "1599", packSize: "50g", shelfLife: 24, barcode: "8901234567898", minStockThreshold: 80, description: "Advanced retinol cream for overnight skin renewal and anti-aging.", clinicalIndications: ["Anti-aging", "Wrinkles", "Skin Renewal", "Night Care"] },
    { code: "PRD010", name: "Sunscreen SPF 50", sku: "SUNS-50ML", category: "Sun Care", hsnCode: "33049990", gst: "18", mrp: "699", packSize: "50ml", shelfLife: 24, barcode: "8901234567899", minStockThreshold: 200, description: "Broad spectrum UVA/UVB protection with PA+++ rating.", clinicalIndications: ["Sun Protection", "Anti-aging", "Pigmentation Prevention"] },
  ]).returning();
  console.log(`Created ${moreProducts.length} additional products`);

  // Add more inventory for new products
  console.log("Adding more inventory...");
  const moreInventory = await db.insert(schema.inventory).values([
    { productId: moreProducts[0].id, warehouseId: warehouses[0].id, batch: "B2024010", expiry: "2026-06-15", available: 180, reserved: 20, total: 200, costPrice: "720" },
    { productId: moreProducts[1].id, warehouseId: warehouses[1].id, batch: "B2024011", expiry: "2026-08-20", available: 120, reserved: 15, total: 135, costPrice: "960" },
    { productId: moreProducts[2].id, warehouseId: warehouses[2].id, batch: "B2024012", expiry: "2026-07-10", available: 300, reserved: 50, total: 350, costPrice: "420" },
    { productId: moreProducts[0].id, warehouseId: warehouses[1].id, batch: "B2024013", expiry: "2026-05-25", available: 150, reserved: 10, total: 160, costPrice: "720" },
    { productId: moreProducts[2].id, warehouseId: warehouses[0].id, batch: "B2024014", expiry: "2026-09-30", available: 250, reserved: 30, total: 280, costPrice: "420" },
  ]).returning();
  console.log(`Created ${moreInventory.length} additional inventory records`);

  // Add more doctors
  console.log("Adding more doctors...");
  const moreDoctors = await db.insert(schema.doctors).values([
    { code: "DOC006", name: "Dr. Kavitha Menon", specialization: "Dermatologist", clinic: "Skin Wellness Center", city: "Bangalore", state: "Karnataka", phone: "98XXXXXX06", email: "kavitha@example.com", pricingSlabId: pricingSlabs[1].id, creditLimit: "60000", outstanding: "18000", importance: "Medium" },
    { code: "DOC007", name: "Dr. Arun Kumar", specialization: "Cosmetologist", clinic: "Aesthetic Solutions", city: "Chennai", state: "Tamil Nadu", phone: "98XXXXXX07", email: "arun@example.com", pricingSlabId: pricingSlabs[0].id, creditLimit: "120000", outstanding: "35000", importance: "High" },
    { code: "DOC008", name: "Dr. Fatima Sheikh", specialization: "Trichologist", clinic: "Hair & Scalp Clinic", city: "Hyderabad", state: "Telangana", phone: "98XXXXXX08", email: "fatima@example.com", pricingSlabId: pricingSlabs[2].id, creditLimit: "45000", outstanding: "12000", importance: "Medium" },
    { code: "DOC009", name: "Dr. Ravi Shankar", specialization: "Dermatologist", clinic: "Skin Care Institute", city: "Kolkata", state: "West Bengal", phone: "98XXXXXX09", email: "ravi@example.com", pricingSlabId: pricingSlabs[1].id, creditLimit: "80000", outstanding: "22000", importance: "High" },
    { code: "DOC010", name: "Dr. Anjali Deshmukh", specialization: "Cosmetologist", clinic: "Beauty & Beyond", city: "Pune", state: "Maharashtra", phone: "98XXXXXX10", email: "anjali@example.com", pricingSlabId: pricingSlabs[0].id, creditLimit: "100000", outstanding: "28000", importance: "High" },
  ]).returning();
  console.log(`Created ${moreDoctors.length} additional doctors`);

  // Add more leads
  console.log("Adding more leads...");
  const moreLeads = await db.insert(schema.leads).values([
    { code: "LED006", name: "Dr. Prashant Yadav", clinic: "Skin First Clinic", city: "Ahmedabad", state: "Gujarat", phone: "98XXXXXX26", stage: "Contacted", priority: "High", source: "Referral", assignedMRId: mrUsers[1]?.id, nextFollowUp: "2024-12-23" },
    { code: "LED007", name: "Dr. Meghna Chopra", clinic: "Derma Experts", city: "Lucknow", state: "Uttar Pradesh", phone: "98XXXXXX27", stage: "Qualified", priority: "Medium", source: "Conference" },
    { code: "LED008", name: "Dr. Sandeep Nair", clinic: "Skin Solutions Plus", city: "Kochi", state: "Kerala", phone: "98XXXXXX28", stage: "Proposal", priority: "High", source: "Website", assignedMRId: mrUsers[0]?.id, nextFollowUp: "2024-12-21" },
    { code: "LED009", name: "Dr. Pooja Sharma", clinic: "Cosmo Derm", city: "Jaipur", state: "Rajasthan", phone: "98XXXXXX29", stage: "New", priority: "Low", source: "Cold Call" },
    { code: "LED010", name: "Dr. Ashok Patel", clinic: "Advanced Skin Care", city: "Surat", state: "Gujarat", phone: "98XXXXXX30", stage: "Negotiation", priority: "High", source: "Referral", assignedMRId: mrUsers[2]?.id, nextFollowUp: "2024-12-20" },
  ]).returning();
  console.log(`Created ${moreLeads.length} additional leads`);

  console.log("✅ Database seeding completed!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
