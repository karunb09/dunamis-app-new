/**
 * One-time recovery: fulfill orders that Cashfree marks PAID but which stayed
 * unfulfilled locally because the (now-fixed) strict payment_amount check threw
 * during webhook/verify. Re-runs the standard confirm+fulfill path, so the
 * student is enrolled, added to the slot, and gets the payment snapshot at the
 * full order amount. Idempotent — an already-fulfilled order is skipped.
 *
 * Run from dunamis-lms-backend-main/:
 *   node scripts/recoverStrandedPaidOrders.js <orderId> [<orderId> ...]
 */

require("dotenv").config();
const mongoose = require("mongoose");

const PaymentTransaction = require("../model/paymentTransaction.model");
const {
  getCashfreeOrder,
  getCashfreePaymentsForOrder,
} = require("../utils/cashfreeClient");
const {
  getSuccessfulPayment,
  confirmPaidCashfreeOrder,
} = require("../services/paymentService");

async function run() {
  const orderIds = process.argv.slice(2);
  if (orderIds.length === 0) {
    console.error("Usage: node scripts/recoverStrandedPaidOrders.js <orderId> [...]");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
  console.log("DB connected\n");

  for (const orderId of orderIds) {
    console.log(`=== ${orderId} ===`);
    const transaction = await PaymentTransaction.findOne({ merchantOrderId: orderId });
    if (!transaction) {
      console.log("  SKIP: transaction not found locally\n");
      continue;
    }
    if (transaction.status === "fulfilled") {
      console.log("  SKIP: already fulfilled\n");
      continue;
    }

    const order = await getCashfreeOrder(orderId);
    const payments = await getCashfreePaymentsForOrder(orderId).catch(() => []);
    const successfulPayment = getSuccessfulPayment(payments);

    console.log(
      `  cashfree order_status=${order.order_status} order_amount=${order.order_amount} ` +
        `paid=${successfulPayment?.payment_amount ?? "n/a"} local_status(before)=${transaction.status}`
    );

    const confirmed = await confirmPaidCashfreeOrder({
      transaction,
      order,
      payment: successfulPayment,
    });

    if (!confirmed.paid) {
      console.log("  RESULT: order not PAID on Cashfree — nothing to do\n");
      continue;
    }

    console.log(
      `  RESULT: paid=true fulfilled=${confirmed.fulfillment.fulfilled} ` +
        `status(after)=${confirmed.transaction.status} recordedAmount=${confirmed.transaction.amount}` +
        (confirmed.fulfillment.error ? ` error=${confirmed.fulfillment.error}` : "") +
        "\n"
    );
  }

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch((error) => {
  console.error("Recovery failed:", error);
  process.exit(1);
});
