/**
 * Razorpay helpers. Server-only: this file must never be imported by components.
 */

const RAZORPAY_API = "https://api.razorpay.com/v1";

export function razorpayCreds() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Online payments are not configured yet. Please try again later.");
  }
  return { keyId, keySecret };
}

function authHeader(keyId: string, keySecret: string) {
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

export async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}) {
  const { keyId, keySecret } = razorpayCreds();
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(keyId, keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes,
      payment_capture: 1,
    }),
  });
  if (!res.ok) {
    console.error("razorpay order failed", res.status, await res.text());
    throw new Error("Could not start the payment. Please try again.");
  }
  return (await res.json()) as { id: string; amount: number; currency: string };
}

export async function fetchRazorpayPayment(paymentId: string) {
  const { keyId, keySecret } = razorpayCreds();
  const res = await fetch(`${RAZORPAY_API}/payments/${paymentId}`, {
    headers: { Authorization: authHeader(keyId, keySecret) },
  });
  if (!res.ok) {
    console.error("razorpay payment fetch failed", res.status, await res.text());
    throw new Error("Could not verify the payment. Please contact support.");
  }
  return (await res.json()) as {
    id: string;
    status: string;
    amount: number;
    order_id: string;
    method?: string;
  };
}

async function hmacSha256Hex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const { keySecret } = razorpayCreds();
  const expected = await hmacSha256Hex(keySecret, `${input.orderId}|${input.paymentId}`);
  return timingSafeEqual(expected, input.signature.toLowerCase());
}

export async function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqual(expected, signature.toLowerCase());
}

