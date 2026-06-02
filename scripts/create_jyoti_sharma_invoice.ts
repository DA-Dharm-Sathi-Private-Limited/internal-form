/**
 * One-off script: create Jyoti Sharma invoice in Zoho Billing and insert the synced order into MongoDB.
 *
 * Usage:
 *   npx tsx scripts/create_jyoti_sharma_invoice.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '../.env.local' });

const CUSTOMER_ID = '3355221000000326021';
const CUSTOMER_NAME = 'Jyoti Sharma';
const SALESPERSON_NAME = 'Utkarsh';
const INVOICE_DATE = '2026-05-19';
const PLACE_OF_SUPPLY = 'PB';
const GST_TREATMENT = 'consumer';
const PAYMENT_MODE = 'Prepaid';
const COUNTRY_CODE = '+91';
const PHONE = '+919501415923';

const CUSTOMER_DETAILS = {
    customer_name: CUSTOMER_NAME,
    email: '',
    phone: PHONE,
    country_code: COUNTRY_CODE,
    address: 'w/o Sandeep Sharma , Sushma Grande , Tower B , Zirakpur',
    city: 'Patiala',
    state: 'Punjab',
    country: 'India',
    pincode: '140603',
};

const RAW_ITEMS = [
    { name: 'seven chakra trees', description: '100 beads', final_price: 180, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Pyrite bracelets', description: '', final_price: 210, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Amethyst bracelets', description: '', final_price: 260, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Black Tourmaline Bracelet', description: '', final_price: 240, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Firoza bracelets', description: '', final_price: 200, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Sulemani bracelet', description: '', final_price: 230, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'clear quartz bracelet', description: '', final_price: 200, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'cats eye bracelet', description: '', final_price: 240, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Money magnet bracelet', description: '', final_price: 240, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Tiger eye bracelets', description: '', final_price: 140, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Rose Quartz Bracelet', description: '', final_price: 140, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Citrine (yellow)', description: '', final_price: 119.99, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Red Jasper bracelet', description: '', final_price: 200, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Lapis lazuli Bracelet', description: '', final_price: 220, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Green Aventurine bracelet', description: '', final_price: 150, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Sunstone bracelet', description: '', final_price: 240, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Lava + 7 chakra bracelet', description: '', final_price: 150, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Dhanyog', description: '', final_price: 260, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Dhanyog ( yellow citrine)', description: '', final_price: 200, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'clear quartz + rudraksha', description: '', final_price: 240, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Pyrite + rose quartz brac', description: '', final_price: 240, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Raw selenite Plate', description: '', final_price: 180, quantity: 1, hsn_or_sac: '71179090', cost_price: 1 },
    { name: 'Delivery Charges', description: '', final_price: 200, quantity: 1, hsn_or_sac: '996812', cost_price: 1 },
] as const;

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

async function main() {
    const [
        { default: connectDB },
        { default: Order },
        { createInvoice, getInvoice, getCustomer, updateCustomer },
        { getCorrectTaxId, isInterstateOrder, HSN_TAX_RATES },
    ] = await Promise.all([
        import('../src/lib/mongodb'),
        import('../src/models/Order'),
        import('../src/lib/zoho'),
        import('../src/lib/tax'),
    ]);

    console.log(`Preparing one-off invoice for ${CUSTOMER_NAME}...`);

    const customerRes = await getCustomer(CUSTOMER_ID);
    if (customerRes.status !== 200 || !customerRes.data?.customer) {
        throw new Error(`Customer ${CUSTOMER_ID} not found in Zoho`);
    }

    const customer = customerRes.data.customer;
    console.log(`Using Zoho customer: ${customer.display_name} (${customer.customer_id})`);

    const customerUpdatePayload = {
        billing_address: {
            attention: CUSTOMER_NAME,
            street: CUSTOMER_DETAILS.address,
            city: CUSTOMER_DETAILS.city,
            state: CUSTOMER_DETAILS.state,
            zip: CUSTOMER_DETAILS.pincode,
            country: CUSTOMER_DETAILS.country,
        },
        phone: PHONE,
    };

    const updateRes = await updateCustomer(CUSTOMER_ID, customerUpdatePayload);
    if (updateRes.status !== 200) {
        throw new Error(updateRes.data?.message || 'Failed to update customer details in Zoho');
    }
    console.log('Updated Zoho customer billing address and phone.');

    const isInterstate = isInterstateOrder(PLACE_OF_SUPPLY);

    const invoiceItemsPayload = RAW_ITEMS.map((item) => {
        const taxRate = HSN_TAX_RATES[item.hsn_or_sac] ?? 0;
        const taxId = getCorrectTaxId(item.hsn_or_sac, isInterstate);
        const rate = round2(item.final_price / (1 + taxRate / 100));

        return {
            name: item.name,
            description: item.description || undefined,
            quantity: item.quantity,
            price: rate,
            hsn_or_sac: item.hsn_or_sac,
            tax_id: taxId,
            cost_price: item.cost_price,
            final_price: item.final_price,
        };
    });

    const invoicePayload = {
        customer_id: CUSTOMER_ID,
        date: INVOICE_DATE,
        gst_treatment: GST_TREATMENT,
        place_of_supply: PLACE_OF_SUPPLY,
        salesperson_name: SALESPERSON_NAME,
        is_inclusive_tax: false,
        invoice_items: invoiceItemsPayload,
    };

    console.log('Creating invoice in Zoho...');
    const createRes = await createInvoice(invoicePayload);
    if (createRes.status !== 200 && createRes.status !== 201) {
        throw new Error(createRes.data?.message || 'Failed to create invoice in Zoho');
    }

    const createdInvoice = createRes.data?.invoice;
    if (!createdInvoice?.invoice_id || !createdInvoice?.invoice_number) {
        throw new Error('Zoho invoice response missing invoice_id or invoice_number');
    }

    console.log(`Created Zoho invoice ${createdInvoice.invoice_number} (${createdInvoice.invoice_id})`);

    const fullInvoiceRes = await getInvoice(createdInvoice.invoice_id);
    if (fullInvoiceRes.status !== 200 || !fullInvoiceRes.data?.invoice) {
        throw new Error(`Failed to fetch created invoice ${createdInvoice.invoice_id}`);
    }

    const invoice = fullInvoiceRes.data.invoice;
    const mappedItems = (invoice.invoice_items || []).map((it: any, index: number) => ({
        item_id: it.item_id || '',
        name: it.name,
        description: RAW_ITEMS[index]?.description || '',
        quantity: Number(it.quantity) || 1,
        rate: Number(it.rate) || 0,
        item_total: Number(it.item_total) || 0,
        tax_id: it.tax_id || '',
        tax_percentage: Number(it.tax_percentage) || 0,
        tax_amount: Number(it.tax_amount) || 0,
        final_price: RAW_ITEMS[index]?.final_price ?? round2((Number(it.item_total) || 0) + (Number(it.tax_amount) || 0)),
        hsn_or_sac: it.hsn_or_sac || RAW_ITEMS[index]?.hsn_or_sac || '',
        carat_size: '',
        cost_price: RAW_ITEMS[index]?.cost_price ?? 1,
    }));

    await connectDB();

    const existing = await Order.findOne({
        $or: [
            { zohoInvoiceId: invoice.invoice_id },
            { orderId: invoice.invoice_number },
        ],
    });

    if (existing) {
        console.log(`Order already exists in DB for ${invoice.invoice_number}. Skipping DB insert.`);
        process.exit(0);
    }

    const orderPayload = {
        zohoInvoiceId: invoice.invoice_id,
        orderId: invoice.invoice_number,
        customerDetails: CUSTOMER_DETAILS,
        invoiceItems: mappedItems,
        invoiceTotal: Number(invoice.total) || round2(RAW_ITEMS.reduce((sum, item) => sum + item.final_price * item.quantity, 0)),
        salespersonName: SALESPERSON_NAME,
        paymentMode: PAYMENT_MODE,
        status: 'PENDING_SHIPPING',
        invoiceUrl: invoice.invoice_url || '',
    };

    const createdOrder = await Order.create(orderPayload);
    console.log(`Saved order to DB with _id: ${createdOrder._id}`);
    console.log(`Invoice total: ₹${orderPayload.invoiceTotal}`);
    console.log('Done.');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
