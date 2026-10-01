/**
 * Server-Side SendLib Email Service
 * 
 * Securely communicates with SendLib API (https://sendlib.samueltuoyo.com/api/send)
 * using the server-side SENDLIB_API_KEY environment variable.
 * 
 * Security:
 * - API key is read solely from process.env.SENDLIB_API_KEY on the Node server.
 * - Key is never returned in HTTP responses or exposed to client-side code.
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const SENDLIB_API_URL = process.env.SENDLIB_API_URL || 'https://sendlib.samueltuoyo.com/api/send';

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.SENDLIB_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      error: 'SENDLIB_API_KEY is not configured on the server. Please ensure the secret is added to the server environment.',
    };
  }

  if (!options.to || !options.to.includes('@')) {
    return {
      success: false,
      error: 'Invalid recipient email address.',
    };
  }

  if (!options.subject || !options.subject.trim()) {
    return {
      success: false,
      error: 'Email subject cannot be empty.',
    };
  }

  try {
    const payload: Record<string, any> = {
      to: options.to.trim(),
      subject: options.subject.trim(),
      html: options.html,
      apiKey: apiKey.trim(),
    };

    if (options.text) {
      payload.text = options.text;
    }

    if (options.from) {
      payload.from = options.from;
    }

    const response = await fetch(SENDLIB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        'x-api-key': apiKey.trim(),
      },
      body: JSON.stringify(payload),
    });

    let data: any = {};
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `SendLib API responded with status ${response.status}`;
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      messageId: data?.messageId || data?.id || data?.data?.id || `msg-${Date.now()}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to communicate with SendLib email service.',
    };
  }
}

/**
 * Builds a styled HTML and text template for StockWise staff invitations.
 */
export function buildStaffInvitationHtml(params: {
  staffName: string;
  storeName: string;
  role: string;
  invitedByName: string;
  inviteUrl: string;
  expiresAt?: string;
  permissionsCount?: number;
}): { html: string; text: string } {
  const formattedRole = params.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const expiryDate = params.expiresAt
    ? new Date(params.expiresAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '7 days from now';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${escapeHtml(params.storeName)} on StockWise</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      color: #1e293b;
    }
    .container {
      max-width: 560px;
      margin: 32px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: #0f172a;
      padding: 28px 32px;
      color: #ffffff;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #ffffff;
      display: inline-block;
    }
    .brand span {
      color: #3b82f6;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .message {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 24px;
    }
    .role-badge {
      display: inline-block;
      padding: 4px 12px;
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 12px;
      text-transform: capitalize;
    }
    .details-box {
      background-color: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 28px;
      border: 1px solid #e2e8f0;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      padding: 4px 0;
    }
    .details-label {
      color: #64748b;
    }
    .details-value {
      font-weight: 600;
      color: #1e293b;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 24px 0;
    }
    .btn {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25);
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 32px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
    .raw-link {
      word-break: break-all;
      color: #3b82f6;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">Stock<span>Wise</span></div>
    </div>
    <div class="content">
      <div class="greeting">Hello, ${escapeHtml(params.staffName)}!</div>
      <p class="message">
        <strong>${escapeHtml(params.invitedByName)}</strong> has invited you to join the team at <strong>${escapeHtml(params.storeName)}</strong> on StockWise as a <span class="role-badge">${escapeHtml(formattedRole)}</span>.
      </p>

      <div class="details-box">
        <div class="details-row">
          <span class="details-label">Store:</span>
          <span class="details-value">${escapeHtml(params.storeName)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Role:</span>
          <span class="details-value">${escapeHtml(formattedRole)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Invited By:</span>
          <span class="details-value">${escapeHtml(params.invitedByName)}</span>
        </div>
        <div class="details-row">
          <span class="details-label">Expires:</span>
          <span class="details-value">${escapeHtml(expiryDate)}</span>
        </div>
      </div>

      <div class="btn-container">
        <a href="${escapeHtml(params.inviteUrl)}" class="btn" target="_blank" rel="noopener noreferrer">Accept Invitation</a>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
        Or copy and paste this link into your web browser:<br>
        <a href="${escapeHtml(params.inviteUrl)}" class="raw-link">${escapeHtml(params.inviteUrl)}</a>
      </p>
    </div>
    <div class="footer">
      Sent via StockWise Automated Staff Management • Powered by SendLib<br>
      This invitation will expire on ${escapeHtml(expiryDate)}.
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hello ${params.staffName},

${params.invitedByName} has invited you to join the team at ${params.storeName} on StockWise as ${formattedRole}.

To accept this invitation and activate your staff access, click or open the link below:
${params.inviteUrl}

This invitation is valid until ${expiryDate}.

- Team StockWise
  `.trim();

  return { html, text };
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
