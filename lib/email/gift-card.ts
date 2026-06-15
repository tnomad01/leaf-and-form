import type { Tier } from '../tiers'

interface GiftCardEmailInput {
  recipientName: string
  senderName: string
  code: string
  message: string | null
  tier: Tier
  redeemUrl: string
}

export function buildGiftCardEmail(input: GiftCardEmailInput): { subject: string; html: string } {
  const { recipientName, senderName, code, message, tier, redeemUrl } = input

  const subject = `${senderName} has gifted you a Leaf & Form garden design`

  const messageBlock = message
    ? `
    <div style="background:#EDE9E1;border-radius:12px;padding:20px 24px;margin-bottom:32px;font-style:italic;color:#5A5A5A">
      &ldquo;${escapeHtml(message)}&rdquo;
      <p style="margin:12px 0 0;color:#9A9A8A;font-style:normal;font-size:12px">— ${escapeHtml(senderName)}</p>
    </div>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4EE;font-family:Arial,sans-serif;color:#2C2C2C">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px">

    <p style="font-size:22px;font-family:Georgia,serif;color:#2C2C2C;margin:0 0 4px">Leaf &amp; Form</p>
    <p style="color:#7C9A7E;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 32px">Gift Card</p>

    <h1 style="font-family:Georgia,serif;font-size:28px;color:#2C2C2C;margin:0 0 12px">
      A garden design, just for you
    </h1>
    <p style="color:#5A5A5A;margin:0 0 32px">
      Hi ${escapeHtml(recipientName)}, ${escapeHtml(senderName)} has gifted you a
      <strong>${escapeHtml(tier.label)}</strong> from Leaf &amp; Form.
    </p>

    ${messageBlock}

    <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9A9A8A;margin:0 0 8px">Your gift code</p>
    <div style="background:#FDFCF9;border:2px dashed #7C9A7E;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px">
      <code style="font-family:ui-monospace,monospace;font-size:22px;letter-spacing:0.1em;color:#2C2C2C">${code}</code>
    </div>

    <p style="color:#5A5A5A;margin:0 0 24px">
      To redeem, head to the submit page, choose <strong>${escapeHtml(tier.label)}</strong>, and paste your code into the discount field. Your total drops to <strong>£0</strong> and we&apos;ll handle the rest.
    </p>

    <p style="margin:0 0 32px">
      <a href="${escapeAttr(redeemUrl)}" style="display:inline-block;background:#2C2C2C;color:#F7F4EE;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:500">
        Redeem your gift →
      </a>
    </p>

    <p style="color:#5A5A5A;font-size:14px;margin:0 0 8px">
      Questions? Reply to this email and we&apos;ll be happy to help.
    </p>
    <p style="color:#9A9A8A;font-size:12px;margin:0">
      Leaf &amp; Form · <a href="mailto:${escapeAttr(process.env.RESEND_FROM_EMAIL ?? '')}" style="color:#7C9A7E">${escapeHtml(process.env.RESEND_FROM_EMAIL ?? '')}</a>
    </p>

  </div>
</body>
</html>`

  return { subject, html }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;')
}
