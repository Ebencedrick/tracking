export const BUSINESS_EMAIL = 'info@globallprimelogistics.com'
export const BUSINESS_NAME = 'Global Prime Logistics'
export const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tracking-coral.vercel.app'

export interface ConsignmentEmailPayload {
  waybill: string
  carrier: string
  mode: string
  origin: { name: string; code?: string; address?: string; lat?: number; lng?: number }
  destination: { name: string; code?: string; address?: string; lat?: number; lng?: number }
  senderName: string
  senderEmail: string
  receiverName: string
  receiverEmail: string
  cargoType?: string
  weightKg?: number
  packageCount?: number
  declaredValue?: number
  serviceTier?: string
  eta?: string
  status?: string
  statusNote?: string
  createdAt?: string
}

/**
 * Generates responsive, professional HTML email matching the exact template requested by the user
 */
export function generateConsignmentEmailHtml(shipment: ConsignmentEmailPayload, recipientRole: 'Sender' | 'Consignee'): string {
  const trackingUrl = `${APP_BASE_URL.replace(/\/$/, '')}/track?waybill=${encodeURIComponent(shipment.waybill)}`
  const recipientName = recipientRole === 'Sender' ? (shipment.senderName || 'Valued Client') : (shipment.receiverName || 'Valued Client')
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(trackingUrl)}`
  const formattedCreationDate = shipment.createdAt
    ? new Date(shipment.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const destLocation = shipment.destination?.name || 'Destination Terminal'
  const destAddress = shipment.destination?.address || shipment.destination?.name || 'Destination Gateway'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipment Created - ${shipment.waybill}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1329; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b1329; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0a182d 0%, #0f274a 100%); padding: 32px 28px; text-align: center; border-bottom: 3px solid #0284c7;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                ${BUSINESS_NAME}
              </h1>
              <p style="margin: 6px 0 0 0; color: #38bdf8; font-size: 13px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase;">
                Global Multi-Modal Freight Dispatch Network
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 28px 20px 28px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b; font-weight: 600;">
                Hello ${recipientName},
              </p>
              
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 15px; color: #065f46; font-weight: 700;">
                  Your shipment has been successfully created!
                </p>
              </div>

              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Thank you for choosing <strong>${BUSINESS_NAME}</strong> for your cargo delivery. We have registered your shipment in our system, and it is currently awaiting dispatch.
              </p>

              <!-- Section: SHIPMENT DETAILS -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 28px; border-collapse: separate; overflow: hidden;">
                <tr style="background-color: #f8fafc;">
                  <td colspan="2" style="padding: 12px 18px; font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px;">
                    SHIPMENT DETAILS
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9; width: 42%;">
                    Shipment Status:
                  </td>
                  <td style="padding: 10px 18px; font-size: 13px; font-weight: 700; color: #d97706; border-bottom: 1px solid #f1f5f9;">
                    ${(shipment.status || 'PENDING SHIPMENT').toUpperCase()}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                    Tracking Number:
                  </td>
                  <td style="padding: 10px 18px; font-size: 14px; font-weight: 800; color: #0284c7; font-family: monospace; border-bottom: 1px solid #f1f5f9;">
                    ${shipment.waybill}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                    Sender Name:
                  </td>
                  <td style="padding: 10px 18px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                    ${shipment.senderName || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                    Sender Email:
                  </td>
                  <td style="padding: 10px 18px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;">
                    ${shipment.senderEmail || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                    Recipient Name:
                  </td>
                  <td style="padding: 10px 18px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                    ${shipment.receiverName || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                    Recipient Email:
                  </td>
                  <td style="padding: 10px 18px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;">
                    ${shipment.receiverEmail || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                    Destination Address:
                  </td>
                  <td style="padding: 10px 18px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">
                    ${destAddress}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 18px; font-size: 13px; color: #64748b; border-bottom: 1px solid #f1f5f9;">
                    Destination Location:
                  </td>
                  <td style="padding: 10px 18px; font-size: 13px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">
                    ${destLocation}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 18px; font-size: 13px; color: #64748b;">
                    Shipment Creation Date:
                  </td>
                  <td style="padding: 10px 18px; font-size: 13px; color: #334155;">
                    ${formattedCreationDate}
                  </td>
                </tr>
              </table>

              <!-- Section: TRACK YOUR SHIPMENT -->
              <div style="background-color: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 28px;">
                <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">
                  TRACK YOUR SHIPMENT
                </h3>
                <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569;">
                  You can monitor your cargo's progress at any time using the tracking details below.
                </p>
                <div style="font-size: 13px; color: #64748b; margin-bottom: 12px;">
                  Tracking Number: <strong style="color: #0369a1; font-family: monospace; font-size: 16px;">${shipment.waybill}</strong>
                </div>
                <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);">
                  Track Your Shipment ↗
                </a>
                <div style="margin-top: 10px; font-size: 11px; color: #64748b; word-break: break-all;">
                  ${trackingUrl}
                </div>
              </div>

              <!-- Section: SCAN TO TRACK -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; text-align: center; margin-bottom: 28px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                  SCAN TO TRACK
                </h3>
                <div style="display: inline-block; padding: 8px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
                  <img src="${qrCodeUrl}" alt="Scan to Track QR Code" width="160" height="160" style="display: block;" />
                </div>
                <p style="margin: 0; font-size: 12px; color: #64748b; max-width: 380px; margin: 0 auto; line-height: 1.5;">
                  Scan the QR code above with your smartphone camera to access your shipment's tracking page instantly.
                </p>
              </div>

              <!-- Section: WHAT HAPPENS NEXT? -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                  WHAT HAPPENS NEXT?
                </h4>
                <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                  Your shipment has been registered successfully and is currently pending shipment. You will receive further notifications as your cargo progresses through the delivery process.
                </p>
                <p style="margin: 0 0 14px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                  Please keep your tracking number safe for future reference.
                </p>
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #334155;">
                  Thank you for trusting ${BUSINESS_NAME} with your shipment.
                </p>
              </div>

              <!-- Sign-off -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 18px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">Best regards,</p>
                <strong style="display: block; font-size: 14px; color: #0a182d;">${BUSINESS_NAME} Customer Support Team</strong>
                <p style="margin: 4px 0 2px 0; font-size: 13px; color: #0284c7;">
                  <a href="mailto:${BUSINESS_EMAIL}" style="color: #0284c7; text-decoration: none;">${BUSINESS_EMAIL}</a>
                </p>
                <p style="margin: 0; font-size: 13px; color: #16a34a;">
                  WhatsApp: <a href="https://wa.me/16402231869" style="color: #16a34a; text-decoration: none; font-weight: 600;">+1 (640) 223-1869</a>
                </p>
                <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">
                  <a href="${APP_BASE_URL}" style="color: #64748b; text-decoration: underline;">${APP_BASE_URL}</a>
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 28px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                © 2026 ${BUSINESS_NAME}. All rights reserved. Automated freight shipment confirmation.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Plain text email matching the exact template requested by the user
 */
export function generateConsignmentEmailText(shipment: ConsignmentEmailPayload, recipientRole: 'Sender' | 'Consignee'): string {
  const trackingUrl = `${APP_BASE_URL.replace(/\/$/, '')}/track?waybill=${encodeURIComponent(shipment.waybill)}`
  const recipientName = recipientRole === 'Sender' ? (shipment.senderName || 'Valued Client') : (shipment.receiverName || 'Valued Client')
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(trackingUrl)}`
  const formattedCreationDate = shipment.createdAt
    ? new Date(shipment.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const destLocation = shipment.destination?.name || 'Destination Terminal'
  const destAddress = shipment.destination?.address || shipment.destination?.name || 'Destination Gateway'

  return `Hello ${recipientName},

Your shipment has been successfully created!

Thank you for choosing ${BUSINESS_NAME} for your cargo delivery. We have registered your shipment in our system, and it is currently awaiting dispatch.

**SHIPMENT DETAILS**

- Shipment Status: ${(shipment.status || 'PENDING SHIPMENT').toUpperCase()}
- Tracking Number: ${shipment.waybill}
- Sender Name: ${shipment.senderName || 'N/A'}
- Sender Email: ${shipment.senderEmail || 'N/A'}
- Recipient Name: ${shipment.receiverName || 'N/A'}
- Recipient Email: ${shipment.receiverEmail || 'N/A'}
- Destination Address: ${destAddress}
- Destination Location: ${destLocation}
- Shipment Creation Date: ${formattedCreationDate}

**TRACK YOUR SHIPMENT**

You can monitor your cargo's progress at any time using the tracking details below.

Tracking Number: ${shipment.waybill}

Track Your Shipment: ${trackingUrl}

**SCAN TO TRACK**

Scan the QR code below or visit this link to access your shipment's tracking page instantly:
${qrCodeUrl}

Scan the QR code above with your smartphone camera to access your shipment's tracking page instantly.

**WHAT HAPPENS NEXT?**

Your shipment has been registered successfully and is currently pending shipment. You will receive further notifications as your cargo progresses through the delivery process.

Please keep your tracking number safe for future reference.

Thank you for trusting ${BUSINESS_NAME} with your shipment.

Best regards,

${BUSINESS_NAME} Customer Support Team
${BUSINESS_EMAIL}
WhatsApp: +1 (640) 223-1869
${APP_BASE_URL}
`
}


export interface ConsignmentNotificationOptions {
  resendApiKey?: string
  brevoApiKey?: string
  sendgridApiKey?: string
  emailFrom?: string
}

export interface ConsignmentNotificationResult {
  success: boolean
  provider: 'resend' | 'brevo' | 'sendgrid' | 'none'
  dispatchedTo: string[]
  failedTo: string[]
  details: string
  error?: string
}

/**
 * Sends automated shipment creation notifications to both sender and receiver
 */
export async function sendConsignmentCreationNotifications(
  shipment: ConsignmentEmailPayload,
  options?: ConsignmentNotificationOptions
): Promise<ConsignmentNotificationResult> {
  const recipients: Array<{ email: string; role: 'Sender' | 'Consignee' }> = []

  const cleanSenderEmail = (shipment.senderEmail || '').trim()
  const cleanReceiverEmail = (shipment.receiverEmail || '').trim()

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (cleanSenderEmail && emailRegex.test(cleanSenderEmail)) {
    recipients.push({ email: cleanSenderEmail, role: 'Sender' })
  }

  if (cleanReceiverEmail && emailRegex.test(cleanReceiverEmail) && cleanReceiverEmail.toLowerCase() !== cleanSenderEmail.toLowerCase()) {
    recipients.push({ email: cleanReceiverEmail, role: 'Consignee' })
  }

  if (recipients.length === 0) {
    return {
      success: false,
      provider: 'none',
      dispatchedTo: [],
      failedTo: [],
      details: 'No valid sender or receiver email addresses were provided for automated notification.',
    }
  }

  const resendKey = (options?.resendApiKey || process.env.RESEND_API_KEY || '').trim()
  const brevoKey = (options?.brevoApiKey || process.env.BREVO_API_KEY || '').trim()
  const sendgridKey = (options?.sendgridApiKey || process.env.SENDGRID_API_KEY || '').trim()
  const configuredEmailFrom = (options?.emailFrom || process.env.EMAIL_FROM || '').trim()

  const dispatchedTo: string[] = []
  const failedTo: string[] = []
  let activeProvider: 'resend' | 'brevo' | 'sendgrid' | 'none' = 'none'
  let lastError = ''

  for (const { email, role } of recipients) {
    const subject = `Your shipment has been successfully created! - Tracking: ${shipment.waybill}`
    const html = generateConsignmentEmailHtml(shipment, role)
    const text = generateConsignmentEmailText(shipment, role)
    let delivered = false

    // 1. Resend API
    if (resendKey && !delivered) {
      try {
        // If custom domain is not yet verified in Resend, Resend sandbox requires onboarding@resend.dev.
        // Reply-To is set to info@globallprimelogistics.com so all responses reach the business.
        const fromAddress = configuredEmailFrom || 'Global Prime Logistics <onboarding@resend.dev>'

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            reply_to: BUSINESS_EMAIL,
            to: email,
            subject,
            html,
            text,
          }),
        })

        if (res.ok) {
          dispatchedTo.push(email)
          delivered = true
          activeProvider = 'resend'
          console.log(`[Email Dispatch] Resend API sent notification to ${email} (${role}) for ${shipment.waybill}`)
        } else {
          const errData = await res.json().catch(() => ({}))
          lastError = errData?.message || `Resend HTTP ${res.status}`
          console.error(`[Resend API Error] Failed for ${email}:`, lastError)
        }
      } catch (err: any) {
        lastError = err?.message || 'Network error reaching Resend API'
      }
    }

    // 2. Brevo API (Sendinblue)
    if (brevoKey && !delivered) {
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sender: { name: BUSINESS_NAME, email: BUSINESS_EMAIL },
            to: [{ email, name: role === 'Sender' ? (shipment.senderName || 'Shipper') : (shipment.receiverName || 'Consignee') }],
            replyTo: { email: BUSINESS_EMAIL, name: BUSINESS_NAME },
            subject,
            htmlContent: html,
            textContent: text,
          }),
        })

        if (res.ok) {
          dispatchedTo.push(email)
          delivered = true
          activeProvider = 'brevo'
          console.log(`[Email Dispatch] Brevo API sent notification to ${email} (${role}) for ${shipment.waybill}`)
        } else {
          const errData = await res.json().catch(() => ({}))
          lastError = errData?.message || `Brevo HTTP ${res.status}`
          console.error(`[Brevo API Error] Failed for ${email}:`, lastError)
        }
      } catch (err: any) {
        lastError = err?.message || 'Network error reaching Brevo API'
      }
    }

    // 3. SendGrid API
    if (sendgridKey && !delivered) {
      try {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { email: BUSINESS_EMAIL, name: BUSINESS_NAME },
            reply_to: { email: BUSINESS_EMAIL, name: BUSINESS_NAME },
            subject,
            content: [
              { type: 'text/plain', value: text },
              { type: 'text/html', value: html },
            ],
          }),
        })

        if (res.ok) {
          dispatchedTo.push(email)
          delivered = true
          activeProvider = 'sendgrid'
          console.log(`[Email Dispatch] SendGrid API sent notification to ${email} (${role}) for ${shipment.waybill}`)
        } else {
          const errData = await res.json().catch(() => ({}))
          lastError = errData?.errors?.[0]?.message || `SendGrid HTTP ${res.status}`
        }
      } catch (err: any) {
        lastError = err?.message || 'Network error reaching SendGrid API'
      }
    }

    if (!delivered) {
      failedTo.push(email)
    }
  }

  const success = dispatchedTo.length > 0

  return {
    success,
    provider: activeProvider,
    dispatchedTo,
    failedTo,
    details: success
      ? `Successfully dispatched automated consignment tracking notification to ${dispatchedTo.join(', ')} via ${activeProvider.toUpperCase()}.`
      : 'No automated email service is configured. Use the 1-click mail buttons or configure a Resend/Brevo API key in Settings.',
    error: lastError || undefined,
  }
}

/**
 * Builds direct, pre-formatted mailto link for the consignee
 */
export function buildConsigneeMailto(shipment: ConsignmentEmailPayload): string {
  const email = (shipment.receiverEmail || '').trim()
  const subject = `Freight Consignment Waybill & Tracking Notification - ${shipment.waybill}`
  const body = generateConsignmentEmailText(shipment, 'Consignee')
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/**
 * Builds direct, pre-formatted mailto link for the sender / shipper
 */
export function buildShipperMailto(shipment: ConsignmentEmailPayload): string {
  const email = (shipment.senderEmail || '').trim()
  const subject = `Consignment Dispatch Confirmation - Waybill ${shipment.waybill}`
  const body = generateConsignmentEmailText(shipment, 'Sender')
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/**
 * Builds ready-to-share WhatsApp manifest link with official support number
 */
export function buildWhatsAppShareUrl(shipment: ConsignmentEmailPayload, trackingBaseUrl?: string): string {
  const base = trackingBaseUrl || APP_BASE_URL
  const trackingUrl = `${base.replace(/\/$/, '')}/track?waybill=${encodeURIComponent(shipment.waybill)}`
  const text =
    `*GLOBAL PRIME LOGISTICS - FREIGHT CONSIGNMENT RECEIPT*\n\n` +
    `Waybill Tracking Code: *${shipment.waybill}*\n` +
    `Carrier Agency: ${shipment.carrier || 'Global Express'} (${(shipment.mode || 'air').toUpperCase()})\n` +
    `Origin Hub: ${shipment.origin?.name || 'Hub'}\n` +
    `Destination Hub: ${shipment.destination?.name || 'Gateway'}\n` +
    `Consignee: ${shipment.receiverName || 'Client'}\n` +
    `Cargo Manifest: ${shipment.cargoType || 'Commercial Freight'} (${shipment.weightKg ?? 1} kg)\n` +
    `Estimated Arrival (ETA): ${shipment.eta || 'In Transit'}\n\n` +
    `Track Live Consignment (GPS Telemetry):\n${trackingUrl}\n\n` +
    `Operations Email: ${BUSINESS_EMAIL}\n` +
    `WhatsApp Support Desk: +1 (640) 223-1869`
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
}

