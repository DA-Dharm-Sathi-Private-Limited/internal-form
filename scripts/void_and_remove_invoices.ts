/**
 * void_and_remove_invoices.ts
 *
 * Voids invoices in Zoho Billing and removes them from MongoDB.
 *
 * Usage:
 *   npx tsx scripts/void_and_remove_invoices.ts                  # dry-run (no changes)
 *   npx tsx scripts/void_and_remove_invoices.ts --write          # actually void + delete
 *   npx tsx scripts/void_and_remove_invoices.ts --write --keep-db  # void in Zoho only, keep DB records
 *   npx tsx scripts/void_and_remove_invoices.ts --write --keep-zoho  # remove from DB only, skip Zoho
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '../.env.local' });
import mongoose from 'mongoose';

// ── Console Colors ──────────────────────────────────────────────
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const magenta = (s: string) => `\x1b[35m${s}\x1b[0m`;

// ── CLI Configuration ───────────────────────────────────────────
const argv = process.argv.slice(2);
const DRY_RUN = !argv.includes('--write');
const KEEP_DB = argv.includes('--keep-db');
const KEEP_ZOHO = argv.includes('--keep-zoho');

// ── Invoice Numbers to Void ─────────────────────────────────────
const INVOICE_NUMBERS = [
    'INV-000394',
    'INV-000415',
    'INV-000416',
    'INV-000423',
    'INV-000433',
    'INV-000437',
    'INV-000478',
    'INV-000479',
    'INV-000524',
    'INV-000531',
    'INV-000536',
    'INV-000543',
    'INV-000544',
    'INV-000549',
    'INV-000566',
    'INV-000568',
    'INV-000585',
    'INV-000589',
    'INV-000595',
    'INV-000596',
    'INV-000621',
    'INV-000630',
    'INV-000632',
    'INV-000634',
    'INV-000641',
    'INV-000642',
    'INV-000692',
    'INV-000696',
    'INV-000699',
    'INV-000715',
    'INV-000718',
    'INV-000725',
    'INV-000730',
    'INV-000738',
    'INV-000763',
    'INV-000767',
    'INV-000768',
    'INV-000781',
    'INV-000783',
    'INV-000786',
    'INV-000792',
];

// ── Results Tracking ────────────────────────────────────────────
interface InvoiceResult {
    invoiceNumber: string;
    zohoStatus: 'voided' | 'already_void' | 'not_found' | 'skipped' | 'error';
    dbStatus: 'removed' | 'not_found' | 'skipped' | 'error';
    zohoError?: string;
    dbError?: string;
    zohoInvoiceId?: string;
}

// ── Main Entry ──────────────────────────────────────────────────
async function main() {
    console.log(bold(`\n🗑️  Void & Remove Invoices`));
    console.log(`   Mode: ${DRY_RUN ? yellow('DRY RUN (no changes)') : red('WRITE MODE')}`);
    if (KEEP_DB) console.log(`   ${yellow('--keep-db')}: DB records will NOT be removed`);
    if (KEEP_ZOHO) console.log(`   ${yellow('--keep-zoho')}: Zoho invoices will NOT be voided`);
    console.log(`   Invoices: ${cyan(INVOICE_NUMBERS.length.toString())} total\n`);

    const results: InvoiceResult[] = [];

    try {
        const { Order, zoho } = await loadDependencies();

        for (let i = 0; i < INVOICE_NUMBERS.length; i++) {
            const invoiceNumber = INVOICE_NUMBERS[i];
            console.log(bold(`\n━━━ [${i + 1}/${INVOICE_NUMBERS.length}] ${cyan(invoiceNumber)} ━━━`));

            const result: InvoiceResult = {
                invoiceNumber,
                zohoStatus: 'skipped',
                dbStatus: 'skipped',
            };

            // ── Step 1: Void in Zoho ────────────────────────────
            if (!KEEP_ZOHO) {
                try {
                    const zohoResult = await voidInZoho(zoho, invoiceNumber);
                    result.zohoStatus = zohoResult.status;
                    result.zohoInvoiceId = zohoResult.invoiceId;
                    if (zohoResult.error) result.zohoError = zohoResult.error;
                } catch (err: any) {
                    result.zohoStatus = 'error';
                    result.zohoError = err.message;
                    console.error(red(`   ❌ Zoho Error: ${err.message}`));
                }
            }

            // ── Step 2: Remove from DB ──────────────────────────
            if (!KEEP_DB) {
                try {
                    const dbResult = await removeFromDb(Order, invoiceNumber);
                    result.dbStatus = dbResult.status;
                    if (dbResult.error) result.dbError = dbResult.error;
                } catch (err: any) {
                    result.dbStatus = 'error';
                    result.dbError = err.message;
                    console.error(red(`   ❌ DB Error: ${err.message}`));
                }
            }

            results.push(result);

            // Rate limit: wait 500ms between Zoho API calls
            if (!KEEP_ZOHO && i < INVOICE_NUMBERS.length - 1) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // ── Summary ─────────────────────────────────────────────
        printSummary(results);

    } catch (error: any) {
        console.error(red('\n❌ FATAL ERROR:'));
        console.error(error.stack || error.message || error);
        process.exitCode = 1;
    } finally {
        console.log(dim('\nClosing connections...'));
        try { await mongoose.disconnect(); } catch (_) { }
        process.exit();
    }
}

// ── Dependencies ────────────────────────────────────────────────

async function loadDependencies() {
    console.log(dim('Loading dependencies...'));
    const [{ default: connectDB }, { default: Order }, zoho] = await Promise.all([
        import('../src/lib/mongodb'),
        import('../src/models/Order'),
        import('../src/lib/zoho'),
    ]);
    await connectDB();
    console.log(green('✅ Connected to MongoDB & Zoho'));
    return { Order, zoho };
}

// ── Zoho: Find & Void ──────────────────────────────────────────

async function voidInZoho(zoho: any, invoiceNumber: string): Promise<{
    status: 'voided' | 'already_void' | 'not_found' | 'error';
    invoiceId?: string;
    error?: string;
}> {
    // Search for the invoice by number
    const token = await zoho.getAccessToken();
    const orgId = process.env.ZOHO_ORG_ID!;

    const searchRes = await fetch(
        `https://www.zohoapis.in/billing/v1/invoices?invoice_number=${encodeURIComponent(invoiceNumber)}`,
        {
            headers: {
                Authorization: `Zoho-oauthtoken ${token}`,
                'X-com-zoho-subscriptions-organizationid': orgId,
            },
        }
    );

    const searchData = await searchRes.json();
    const invoices = searchData.invoices || [];

    if (invoices.length === 0) {
        console.log(yellow(`   ⚠ Not found in Zoho`));
        return { status: 'not_found' };
    }

    const invoice = invoices[0];
    const invoiceId = invoice.invoice_id;
    const currentStatus = invoice.status;

    console.log(dim(`   Zoho ID: ${invoiceId} | Status: ${currentStatus}`));

    if (currentStatus === 'void') {
        console.log(yellow(`   ⚠ Already voided in Zoho`));
        return { status: 'already_void', invoiceId };
    }

    if (DRY_RUN) {
        console.log(yellow(`   🔍 DRY RUN: Would VOID invoice (status: ${currentStatus})`));
        return { status: 'voided', invoiceId };
    }

    // For draft invoices, convert to open first (Zoho can only void open/sent invoices)
    if (currentStatus === 'draft') {
        console.log(dim(`   Converting draft to open before voiding...`));
        const token2 = await zoho.getAccessToken();
        const orgId2 = process.env.ZOHO_ORG_ID!;
        const openRes = await fetch(
            `https://www.zohoapis.in/billing/v1/invoices/${invoiceId}/converttoopen`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Zoho-oauthtoken ${token2}`,
                    'X-com-zoho-subscriptions-organizationid': orgId2,
                    'Content-Type': 'application/json',
                },
            }
        );
        if (!openRes.ok) {
            const errText = await openRes.text();
            console.error(red(`   ❌ Failed to convert draft to open: ${errText}`));
            return { status: 'error', invoiceId, error: `Convert to open failed: ${errText}` };
        }
        console.log(green(`   ✅ Converted draft to open`));
        await new Promise(r => setTimeout(r, 300));
    }

    // For paid invoices, delete payments first before voiding
    if (currentStatus === 'paid' || currentStatus === 'partially_paid') {
        console.log(dim(`   Deleting payments before voiding...`));
        try {
            await deletePaymentsForInvoice(zoho, invoiceId);
        } catch (err: any) {
            console.error(red(`   ❌ Failed to delete payments: ${err.message}`));
            return { status: 'error', invoiceId, error: `Payment deletion failed: ${err.message}` };
        }
    }

    // Void the invoice
    const voidRes = await zoho.voidInvoice(invoiceId);
    if (voidRes.status === 200 || voidRes.status === 201) {
        console.log(green(`   ✅ Invoice VOIDED in Zoho`));
        return { status: 'voided', invoiceId };
    } else {
        const errMsg = voidRes.data?.message || `HTTP ${voidRes.status}`;
        console.error(red(`   ❌ Failed to void: ${errMsg}`));
        return { status: 'error', invoiceId, error: errMsg };
    }
}

// ── Zoho: Delete Payments ──────────────────────────────────────

async function deletePaymentsForInvoice(zoho: any, invoiceId: string) {
    const token = await zoho.getAccessToken();
    const orgId = process.env.ZOHO_ORG_ID!;
    const headers = {
        Authorization: `Zoho-oauthtoken ${token}`,
        'X-com-zoho-subscriptions-organizationid': orgId,
    };

    // Fetch payments for this invoice
    const paymentsRes = await fetch(
        `https://www.zohoapis.in/billing/v1/invoices/${invoiceId}/payments`,
        { method: 'GET', headers }
    );

    const paymentsData = await paymentsRes.json();
    const payments = paymentsData.payments || [];

    if (payments.length === 0) {
        console.log(dim(`   No payments to delete`));
        return;
    }

    console.log(dim(`   Found ${payments.length} payment(s) to delete`));

    for (const payment of payments) {
        const paymentId = payment.payment_id;
        const delRes = await fetch(
            `https://www.zohoapis.in/billing/v1/payments/${paymentId}`,
            { method: 'DELETE', headers }
        );

        if (delRes.ok) {
            console.log(green(`   ✅ Payment ${paymentId} deleted`));
        } else {
            const errText = await delRes.text();
            throw new Error(`Failed to delete payment ${paymentId}: ${errText}`);
        }

        await new Promise(r => setTimeout(r, 300)); // Rate limit
    }
}

// ── DB: Remove Order ────────────────────────────────────────────

async function removeFromDb(Order: any, invoiceNumber: string): Promise<{
    status: 'removed' | 'not_found' | 'error';
    error?: string;
}> {
    const order = await Order.findOne({ orderId: invoiceNumber }).lean();

    if (!order) {
        console.log(yellow(`   ⚠ Not found in DB`));
        return { status: 'not_found' };
    }

    console.log(dim(`   DB ID: ${(order as any)._id} | Status: ${(order as any).status}`));

    if (DRY_RUN) {
        console.log(yellow(`   🔍 DRY RUN: Would DELETE from DB`));
        return { status: 'removed' };
    }

    const result = await Order.deleteOne({ orderId: invoiceNumber });

    if (result.deletedCount === 1) {
        console.log(green(`   ✅ Removed from DB`));
        return { status: 'removed' };
    } else {
        console.error(red(`   ❌ DB delete returned deletedCount: ${result.deletedCount}`));
        return { status: 'error', error: `deletedCount was ${result.deletedCount}` };
    }
}

// ── Summary ─────────────────────────────────────────────────────

function printSummary(results: InvoiceResult[]) {
    console.log(bold('\n\n════════════════════════════════════════════════════'));
    console.log(bold('  SUMMARY'));
    console.log(bold('════════════════════════════════════════════════════\n'));

    if (DRY_RUN) {
        console.log(yellow('  ⚠ DRY RUN — No changes were made\n'));
    }

    // Zoho stats
    const zohoVoided = results.filter(r => r.zohoStatus === 'voided').length;
    const zohoAlreadyVoid = results.filter(r => r.zohoStatus === 'already_void').length;
    const zohoNotFound = results.filter(r => r.zohoStatus === 'not_found').length;
    const zohoErrors = results.filter(r => r.zohoStatus === 'error');
    const zohoSkipped = results.filter(r => r.zohoStatus === 'skipped').length;

    console.log(bold('  Zoho Billing:'));
    if (zohoVoided > 0)      console.log(green(`    ✅ Voided:         ${zohoVoided}`));
    if (zohoAlreadyVoid > 0) console.log(yellow(`    ⚠  Already void:  ${zohoAlreadyVoid}`));
    if (zohoNotFound > 0)    console.log(yellow(`    ⚠  Not found:     ${zohoNotFound}`));
    if (zohoSkipped > 0)     console.log(dim(`    ⏭  Skipped:       ${zohoSkipped}`));
    if (zohoErrors.length > 0) {
        console.log(red(`    ❌ Errors:         ${zohoErrors.length}`));
        zohoErrors.forEach(e => console.log(red(`       → ${e.invoiceNumber}: ${e.zohoError}`)));
    }

    // DB stats
    const dbRemoved = results.filter(r => r.dbStatus === 'removed').length;
    const dbNotFound = results.filter(r => r.dbStatus === 'not_found').length;
    const dbErrors = results.filter(r => r.dbStatus === 'error');
    const dbSkipped = results.filter(r => r.dbStatus === 'skipped').length;

    console.log(bold('\n  MongoDB:'));
    if (dbRemoved > 0)    console.log(green(`    ✅ Removed:        ${dbRemoved}`));
    if (dbNotFound > 0)   console.log(yellow(`    ⚠  Not found:     ${dbNotFound}`));
    if (dbSkipped > 0)    console.log(dim(`    ⏭  Skipped:       ${dbSkipped}`));
    if (dbErrors.length > 0) {
        console.log(red(`    ❌ Errors:         ${dbErrors.length}`));
        dbErrors.forEach(e => console.log(red(`       → ${e.invoiceNumber}: ${e.dbError}`)));
    }

    console.log(bold('\n════════════════════════════════════════════════════\n'));
}

main();
