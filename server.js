// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// server/sendlibService.ts
var SENDLIB_API_URL = process.env.SENDLIB_API_URL || "https://sendlib.samueltuoyo.com/api/send";
async function sendEmail(options) {
  const apiKey = process.env.SENDLIB_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      error: "SENDLIB_API_KEY is not configured on the server. Please ensure the secret is added to the server environment."
    };
  }
  if (!options.to || !options.to.includes("@")) {
    return {
      success: false,
      error: "Invalid recipient email address."
    };
  }
  if (!options.subject || !options.subject.trim()) {
    return {
      success: false,
      error: "Email subject cannot be empty."
    };
  }
  try {
    const payload = {
      to: options.to.trim(),
      subject: options.subject.trim(),
      html: options.html,
      apiKey: apiKey.trim()
    };
    if (options.text) {
      payload.text = options.text;
    }
    if (options.from) {
      payload.from = options.from;
    }
    const response = await fetch(SENDLIB_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
        "x-api-key": apiKey.trim()
      },
      body: JSON.stringify(payload)
    });
    let data = {};
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
        error: errorMessage
      };
    }
    return {
      success: true,
      messageId: data?.messageId || data?.id || data?.data?.id || `msg-${Date.now()}`
    };
  } catch (err) {
    return {
      success: false,
      error: err?.message || "Failed to communicate with SendLib email service."
    };
  }
}
function buildStaffInvitationHtml(params) {
  const formattedRole = params.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const expiryDate = params.expiresAt ? new Date(params.expiresAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }) : "7 days from now";
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
      Sent via StockWise Automated Staff Management \u2022 Powered by SendLib<br>
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
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = 3e3;
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.get(["/api/sendlib/status", "/api/sendlib/status/"], (req, res) => {
  const isConfigured = Boolean(process.env.SENDLIB_API_KEY && process.env.SENDLIB_API_KEY.trim());
  res.json({
    configured: isConfigured,
    service: "SendLib",
    endpoint: "https://sendlib.samueltuoyo.com/api/send"
  });
});
app.post(["/api/send-email", "/api/send-email/"], async (req, res) => {
  const { to, subject, html, text, from } = req.body || {};
  if (!to || !subject || !html) {
    return res.status(400).json({
      success: false,
      error: "Missing required email fields: to, subject, and html are required."
    });
  }
  const result = await sendEmail({ to, subject, html, text, from });
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});
app.post(["/api/test-email", "/api/test-email/"], async (req, res) => {
  const { to } = req.body || {};
  if (!to || typeof to !== "string" || !to.includes("@")) {
    return res.status(400).json({
      success: false,
      error: "Please provide a valid recipient email address (to)."
    });
  }
  const timestamp = (/* @__PURE__ */ new Date()).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "medium"
  });
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 20px auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">
        Stock<span style="color: #2563eb;">Wise</span> &bull; SendLib Test Email
      </div>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">
        This is a verification test email sent from your <strong>StockWise</strong> application.
      </p>
      <div style="background-color: #f1f5f9; padding: 14px; border-radius: 10px; margin: 16px 0; font-size: 13px; color: #1e293b;">
        <div><strong>Status:</strong> <span style="color: #16a34a; font-weight: 700;">SendLib Connection Verified</span></div>
        <div style="margin-top: 4px;"><strong>Sent At:</strong> ${timestamp}</div>
        <div style="margin-top: 4px;"><strong>Recipient:</strong> ${to}</div>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
        Your SendLib API key is securely authenticated on the server. Staff invitations are ready to be dispatched automatically.
      </p>
    </div>
  `.trim();
  const text = `StockWise SendLib Test Email

Status: SendLib Connection Verified
Sent At: ${timestamp}
Recipient: ${to}

Your SendLib API key is authenticated.`;
  const result = await sendEmail({
    to: to.trim(),
    subject: "\u2713 StockWise \u2014 SendLib Connection Test",
    html,
    text
  });
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json({
    ...result,
    message: `Test email successfully dispatched to ${to.trim()}`
  });
});
app.post(["/api/staff-invite-email", "/api/staff-invite-email/"], async (req, res) => {
  const to = (req.body?.to || req.body?.email || "").trim();
  const staffName = (req.body?.staffName || req.body?.name || req.body?.userName || "Team Member").trim();
  const storeName = (req.body?.storeName || "StockWise Store").trim();
  const role = req.body?.role || "cashier";
  const invitedByName = req.body?.invitedByName || "Store Owner";
  const inviteUrl = req.body?.inviteUrl || req.body?.url || "";
  const expiresAt = req.body?.expiresAt;
  const permissionsCount = req.body?.permissionsCount;
  if (!to || !to.includes("@")) {
    return res.status(400).json({
      success: false,
      error: "Missing required field: a valid recipient email (to) is required."
    });
  }
  if (!inviteUrl) {
    return res.status(400).json({
      success: false,
      error: "Missing required field: invitation activation URL (inviteUrl) is required."
    });
  }
  const { html, text } = buildStaffInvitationHtml({
    staffName,
    storeName,
    role,
    invitedByName,
    inviteUrl,
    expiresAt,
    permissionsCount
  });
  const result = await sendEmail({
    to,
    subject: `You're invited to join ${storeName} on StockWise`,
    html,
    text
  });
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StockWise full-stack server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
