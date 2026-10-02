import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendEmail, buildStaffInvitationHtml } from './server/sendlibService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  try {
    fs.appendFileSync(
      path.resolve(__dirname, 'server_debug.log'),
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url}\n`
    );
  } catch {}
  next();
});

app.use(express.json());

// Enable CORS and handle preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ============================================================================
// API ROUTES (Server-side SendLib Integration)
// ============================================================================

/**
 * Health check: verify if SendLib is configured without exposing the secret.
 */
app.get(['/api/sendlib/status', '/api/sendlib/status/'], (req, res) => {
  const isConfigured = Boolean(process.env.SENDLIB_API_KEY && process.env.SENDLIB_API_KEY.trim());
  res.json({
    configured: isConfigured,
    service: 'SendLib',
    endpoint: 'https://sendlib.samueltuoyo.com/api/send',
  });
});

/**
 * Generic email sending endpoint
 */
app.post(['/api/send-email', '/api/send-email/'], async (req, res) => {
  const { to, subject, html, text, from } = req.body || {};

  if (!to || !subject || !html) {
    return res.status(400).json({
      success: false,
      error: 'Missing required email fields: to, subject, and html are required.',
    });
  }

  const result = await sendEmail({ to, subject, html, text, from });

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json(result);
});

/**
 * Safe test email endpoint: sends a verification test email to a user-specified address.
 */
app.post(['/api/test-email', '/api/test-email/'], async (req, res) => {
  const { to } = req.body || {};

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid recipient email address (to).',
    });
  }

  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium',
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

  const text = `StockWise SendLib Test Email\n\nStatus: SendLib Connection Verified\nSent At: ${timestamp}\nRecipient: ${to}\n\nYour SendLib API key is authenticated.`;

  const result = await sendEmail({
    to: to.trim(),
    subject: '✓ StockWise — SendLib Connection Test',
    html,
    text,
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json({
    ...result,
    message: `Test email successfully dispatched to ${to.trim()}`,
  });
});

/**
 * Staff invitation email dispatch
 */
app.post(['/api/staff-invite-email', '/api/staff-invite-email/'], async (req, res) => {
  const to = (req.body?.to || req.body?.email || '').trim();
  const staffName = (req.body?.staffName || req.body?.name || req.body?.userName || 'Team Member').trim();
  const storeName = (req.body?.storeName || 'StockWise Store').trim();
  const role = req.body?.role || 'cashier';
  const invitedByName = req.body?.invitedByName || 'Store Owner';
  const inviteUrl = req.body?.inviteUrl || req.body?.url || '';
  const expiresAt = req.body?.expiresAt;
  const permissionsCount = req.body?.permissionsCount;

  if (!to || !to.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: a valid recipient email (to) is required.',
    });
  }

  if (!inviteUrl) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: invitation activation URL (inviteUrl) is required.',
    });
  }

  const { html, text } = buildStaffInvitationHtml({
    staffName,
    storeName,
    role,
    invitedByName,
    inviteUrl,
    expiresAt,
    permissionsCount,
  });

  const result = await sendEmail({
    to,
    subject: `You're invited to join ${storeName} on StockWise`,
    html,
    text,
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.json(result);
});

// ============================================================================
// VITE / STATIC CLIENT MOUNTING
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StockWise full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
