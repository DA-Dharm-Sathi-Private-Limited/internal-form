import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Passwords provided and extended 4-digit PINs
const PREDEFINED_PINS = [
  '1234', '0001', '9007', '6006', '1359', '2908',
  '4829', '7104', '5521', '8310', '3942', '6175',
  '2048', '9912', '7734', '1580', '4321', '8890',
  '5102', '3491', '6820', '9015', '2468', '1357',
  '8024', '4680', '3579', '9182', '7364', '5291'
];

async function seedVendorAccounts() {
  const dbConnect = (await import('../src/lib/mongodb')).default;
  const Vendor = (await import('../src/models/Vendor')).default;
  const bcrypt = (await import('bcryptjs')).default;
  const fs = (await import('fs')).default;
  const path = (await import('path')).default;

  await dbConnect();
  console.log('Connected to MongoDB Atlas...');

  const vendorsPath = path.join(process.cwd(), 'vendors.json');
  let jsonVendors: any[] = [];
  if (fs.existsSync(vendorsPath)) {
    const raw = fs.readFileSync(vendorsPath, 'utf-8');
    jsonVendors = JSON.parse(raw);
  }

  const credentialsList: Array<{ facilityName: string; phone: string; pin: string; status: string }> = [];

  const usedPhones = new Set<string>();

  let pinIdx = 0;
  for (const v of jsonVendors) {
    const facilityName = v.facility_name.trim();

    // Standardize phone number
    let rawPhone = v.phone ? String(v.phone).replace(/\s+/g, '').replace(/^\+91/, '') : '';
    if (!rawPhone || rawPhone.length < 10 || usedPhones.has(rawPhone)) {
      // Generate clean unique 10-digit phone number for facility login
      rawPhone = `98100${String(10001 + pinIdx).slice(-5)}`;
    }
    usedPhones.add(rawPhone);

    const pin = PREDEFINED_PINS[pinIdx % PREDEFINED_PINS.length];
    pinIdx++;

    const passwordHash = await bcrypt.hash(pin, 10);

    // Check if vendor already exists
    let vendor = await Vendor.findOne({ facilityName });

    if (!vendor) {
      vendor = await Vendor.create({
        facilityName,
        addressLine: v.address_line || '',
        pincode: v.pincode ? String(v.pincode) : '',
        phone: rawPhone,
        passwordHash,
        status: 'active',
        createdBy: 'System Delivery Seed',
      });
      console.log(`Created Vendor Account: ${facilityName}`);
    } else {
      // Update phone and password if existing
      vendor.phone = rawPhone;
      vendor.passwordHash = passwordHash;
      vendor.status = 'active';
      if (v.address_line) vendor.addressLine = v.address_line;
      if (v.pincode) vendor.pincode = String(v.pincode);
      await vendor.save();
      console.log(`Updated Vendor Account: ${facilityName}`);
    }

    credentialsList.push({
      facilityName: vendor.facilityName,
      phone: vendor.phone,
      pin,
      status: vendor.status,
    });
  }

  console.log('\n==========================================================');
  console.log('VENDOR ACCOUNTS CREATED / UPDATED WITH 4-DIGIT PIN PASSWORDS');
  console.log('==========================================================\n');
  console.table(credentialsList);
}

seedVendorAccounts()
  .then(() => {
    console.log('Vendor seeding complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error seeding vendors:', err);
    process.exit(1);
  });
