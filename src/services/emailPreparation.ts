import { Order, OrderItem, PaymentMethodSnapshot } from '../types/store';
import { formatUSD } from '../utils/formatters';

export type EmailNotificationEvent =
  | 'new_order_owner'
  | 'order_confirmation_customer'
  | 'payment_instructions_customer'
  | 'payment_verified_customer'
  | 'payment_rejected_customer';

export interface EmailNotificationPayload {
  event: EmailNotificationEvent;
  to: string;
  subject: string;
  previewText: string;
  bodyText: string;
  orderId: string;
  orderNumber: string;
  deliveryStatus: 'prepared_not_sent';
  preparedAt: string;
}

export interface EmailProviderStatus {
  configured: boolean;
  mode: 'prepared_only';
  note: string;
}

export function getEmailProviderStatus(): EmailProviderStatus {
  return {
    configured: false,
    mode: 'prepared_only',
    note: 'Email notification payloads and templates are prepared in code for a future server-side provider (Cloud Functions / Resend / SendGrid). No emails are sent from the browser.',
  };
}

function summarizeOrderLines(items: OrderItem[]): string {
  if (items.length === 0) return 'Digital sticker items';
  return items
    .map((item) => `- ${item.productName} × ${item.quantity} (${formatUSD(item.priceSnapshot * item.quantity)})`)
    .join('\n');
}

function summarizePaymentDetails(snapshot: PaymentMethodSnapshot | null): string {
  if (!snapshot) return 'Manual payment method details unavailable.';
  const lines = [`Method: ${snapshot.name}`];
  if (snapshot.bankName) lines.push(`Bank: ${snapshot.bankName}`);
  if (snapshot.accountNumber) lines.push(`Account Number: ${snapshot.accountNumber}`);
  if (snapshot.accountHolderName) lines.push(`Account Holder: ${snapshot.accountHolderName}`);
  if (snapshot.paypalLink) lines.push(`PayPal Link: ${snapshot.paypalLink}`);
  if (snapshot.instructions) lines.push(`Instructions: ${snapshot.instructions}`);
  return lines.join('\n');
}

export function buildEmailNotificationPayload(params: {
  event: EmailNotificationEvent;
  order: Order;
  items: OrderItem[];
  ownerNotificationEmail?: string;
}): EmailNotificationPayload {
  const { event, order, items, ownerNotificationEmail } = params;
  const preparedAt = new Date().toISOString();
  const itemLines = summarizeOrderLines(items);
  const paymentLines = summarizePaymentDetails(order.paymentMethodSnapshot);

  switch (event) {
    case 'new_order_owner':
      return {
        event,
        to: ownerNotificationEmail || 'halo@cottoncandysticker.studio',
        subject: `[New Order ${order.orderNumber}] ${formatUSD(order.total)} · ${order.customerName}`,
        previewText: `New manual-payment order from ${order.customerEmail} via ${order.paymentMethodName || 'Manual Payment'}.`,
        bodyText: [
          `Order: ${order.orderNumber} (${order.id})`,
          `Customer: ${order.customerName} <${order.customerEmail}> (${order.customerCountry})`,
          `Total: ${formatUSD(order.total)}`,
          `Payment Method: ${order.paymentMethodName}`,
          '',
          'Items:',
          itemLines,
        ].join('\n'),
        orderId: order.id,
        orderNumber: order.orderNumber,
        deliveryStatus: 'prepared_not_sent',
        preparedAt,
      };

    case 'order_confirmation_customer':
      return {
        event,
        to: order.customerEmail,
        subject: `Order Received: ${order.orderNumber} — Cotton Candy Sticker`,
        previewText: `Thank you ${order.customerName}! Complete your manual payment so our admin can send your stickers via WhatsApp.`,
        bodyText: [
          `Hi ${order.customerName},`,
          '',
          `We received your order ${order.orderNumber} totaling ${formatUSD(order.total)}.`,
          '',
          'Items:',
          itemLines,
          '',
          'Next step: Complete your manual payment and submit your transaction reference or confirm on WhatsApp (+6281238078363).',
        ].join('\n'),
        orderId: order.id,
        orderNumber: order.orderNumber,
        deliveryStatus: 'prepared_not_sent',
        preparedAt,
      };

    case 'payment_instructions_customer':
      return {
        event,
        to: order.customerEmail,
        subject: `Payment Instructions for ${order.orderNumber} (${formatUSD(order.total)})`,
        previewText: `Pay via ${order.paymentMethodName} and submit your reference ID for verification.`,
        bodyText: [
          `Hi ${order.customerName},`,
          '',
          `Here are your manual payment instructions for order ${order.orderNumber} (${formatUSD(order.total)}):`,
          '',
          paymentLines,
          '',
          'After completing payment, submit your payment reference ID on your order payment page.',
        ].join('\n'),
        orderId: order.id,
        orderNumber: order.orderNumber,
        deliveryStatus: 'prepared_not_sent',
        preparedAt,
      };

    case 'payment_verified_customer':
      return {
        event,
        to: order.customerEmail,
        subject: `Payment Verified · Ready for WhatsApp Delivery (${order.orderNumber})`,
        previewText: `Your payment for ${order.orderNumber} has been verified!`,
        bodyText: [
          `Hi ${order.customerName},`,
          '',
          `Great news! Your manual payment for order ${order.orderNumber} (${formatUSD(order.total)}) has been verified.`,
          'Our admin will deliver your original full-resolution digital sticker files manually via official WhatsApp (+6281238078363).',
          '',
          itemLines,
        ].join('\n'),
        orderId: order.id,
        orderNumber: order.orderNumber,
        deliveryStatus: 'prepared_not_sent',
        preparedAt,
      };

    case 'payment_rejected_customer':
      return {
        event,
        to: order.customerEmail,
        subject: `Action Needed: Payment Verification Issue (${order.orderNumber})`,
        previewText: `We could not verify your payment reference for ${order.orderNumber}.`,
        bodyText: [
          `Hi ${order.customerName},`,
          '',
          `We could not verify your submitted payment confirmation for order ${order.orderNumber}.`,
          order.rejectionReason ? `Reason: ${order.rejectionReason}` : '',
          '',
          'Please revisit your order payment instructions page to double-check the details and resubmit your payment reference, or contact WhatsApp +6281238078363.',
        ]
          .filter(Boolean)
          .join('\n'),
        orderId: order.id,
        orderNumber: order.orderNumber,
        deliveryStatus: 'prepared_not_sent',
        preparedAt,
      };
  }
}

export function prepareOrderEmailHooks(params: {
  events: EmailNotificationEvent[];
  order: Order;
  items: OrderItem[];
  ownerNotificationEmail?: string;
}): EmailNotificationPayload[] {
  return params.events.map((event) =>
    buildEmailNotificationPayload({
      event,
      order: params.order,
      items: params.items,
      ownerNotificationEmail: params.ownerNotificationEmail,
    })
  );
}
