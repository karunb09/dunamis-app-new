const PaymentTransaction = require("../model/paymentTransaction.model");
// Module object, not destructured — tests patch these exports after load.
const cashfree = require("../utils/cashfreeClient");
const {
  getSuccessfulPayment,
  confirmPaidCashfreeOrder,
  expireStaleTransactions,
  getCashfreeErrorMessage,
  recordTransactionEvent,
  TRANSACTION_EVENTS,
} = require("./paymentService");
const { sendOpsAlert } = require("../utils/opsAlert");
const { getAdminUsers, createDashboardNotice } = require("../utils/notificationService");

const RECONCILE_BATCH = 100;
const RECONCILE_LOOKBACK_DAYS = 30;
const MAX_ATTEMPTS = 5;
const API_GAP_MS = 250;

// `expired` is in the scan set so the sweep can never permanently hide an order
// the batch cap hadn't reached yet.
const SCAN_STATUSES = [
  "created",
  "pending",
  "expired",
  "dropped",
  "failed",
  "paid_pending_fulfillment",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function reconcilePayments({ apiGapMs = API_GAP_MS } = {}) {
  const lookbackStart = new Date(Date.now() - RECONCILE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await PaymentTransaction.find({
    gateway: "cashfree",
    status: { $in: SCAN_STATUSES },
    createdAt: { $gte: lookbackStart },
    reconcileAttempts: { $lt: MAX_ATTEMPTS },
  })
    .sort({ reconciledAt: 1 })
    .limit(RECONCILE_BATCH);

  let recovered = 0;
  let expired = 0;

  for (const [index, transaction] of candidates.entries()) {
    if (index > 0 && apiGapMs > 0) await sleep(apiGapMs);

    // Per-order isolation: one bad order must not abort the batch. There is
    // deliberately no outer catch — a job-level failure should surface red on
    // the heartbeat rather than being swallowed.
    try {
      const order = await cashfree.getCashfreeOrder(transaction.merchantOrderId);
      const orderStatus = order?.order_status || null;

      if (orderStatus === "PAID") {
        const payments = await cashfree
          .getCashfreePaymentsForOrder(transaction.merchantOrderId)
          .catch(() => []);
        const result = await confirmPaidCashfreeOrder({
          transaction,
          order,
          payment: getSuccessfulPayment(payments),
        });
        if (result.paid) {
          recovered += 1;
          await recordTransactionEvent(transaction._id, {
            type: TRANSACTION_EVENTS.RECONCILED,
            detail: `Reconciler found this order PAID at the gateway and recovered it from "${transaction.status}"`,
            status: result.transaction?.status || "paid",
            meta: { previousStatus: transaction.status },
          });
        }
      } else if (["EXPIRED", "TERMINATED"].includes(orderStatus)) {
        if (["created", "pending"].includes(transaction.status)) {
          await PaymentTransaction.updateOne(
            { _id: transaction._id, status: { $in: ["created", "pending"] } },
            { $set: { status: "expired", lastError: "Payment session expired" } }
          );
          await recordTransactionEvent(transaction._id, {
            type: TRANSACTION_EVENTS.EXPIRED,
            status: "expired",
            detail: `Gateway reported the order as ${orderStatus}`,
          });
          expired += 1;
        }
      }

      await PaymentTransaction.updateOne(
        { _id: transaction._id },
        {
          $set: { reconciledAt: new Date(), reconcileLastStatus: orderStatus },
          ...(orderStatus === "ACTIVE" ? { $inc: { reconcileAttempts: 1 } } : {}),
        }
      );
    } catch (error) {
      console.error(
        `[PaymentReconciler] ${transaction.merchantOrderId}:`,
        getCashfreeErrorMessage(error)
      );
      await PaymentTransaction.updateOne(
        { _id: transaction._id },
        { $set: { reconciledAt: new Date() }, $inc: { reconcileAttempts: 1 } }
      );
    }
  }

  // Runs after the Cashfree scan so nothing is expired before it can be checked.
  // expireStaleTransactions has only ever been called query-scoped; this is the
  // first global sweep.
  await expireStaleTransactions({});

  const stranded = await PaymentTransaction.countDocuments({
    status: "paid_pending_fulfillment",
  });

  console.log(
    `[PaymentReconciler] scanned=${candidates.length} recovered=${recovered} expired=${expired} stranded=${stranded}`
  );

  if (stranded > 0) {
    const strandedOrders = await PaymentTransaction.find({ status: "paid_pending_fulfillment" })
      .select("merchantOrderId amount")
      .limit(20);
    const orderList = strandedOrders.map((t) => `${t.merchantOrderId} (${t.amount})`).join(", ");
    const message = `${stranded} payment(s) taken but not fulfilled. Orders: ${orderList}`;

    sendOpsAlert({ title: "Payments awaiting fulfillment", message });

    const adminUsers = await getAdminUsers();
    if (adminUsers.length) {
      await createDashboardNotice({
        title: "Payments awaiting fulfillment",
        message,
        userIds: adminUsers.map((u) => u._id),
        contentType: "Transactional",
      });
    }
  }

  return { scanned: candidates.length, recovered, expired, stranded };
}

module.exports = { reconcilePayments, RECONCILE_BATCH, MAX_ATTEMPTS, SCAN_STATUSES };
