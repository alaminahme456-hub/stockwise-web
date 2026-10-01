/**
 * WhatsApp Integration Utilities for StockWise Staff Invitations
 */

export interface PhoneValidationResult {
  valid: boolean;
  cleanNumber: string; // E.164 digits without '+' (e.g. 2348012345678, 15551234567)
  e164WithPlus: string; // e.g. +2348012345678
  formattedDisplay: string;
  error?: string;
}

/**
 * Validates and normalizes phone numbers into international format suitable for WhatsApp (wa.me)
 * E.164 standard: Country Code + National Number (between 7 and 15 digits)
 */
export function validateAndFormatWhatsAppPhone(rawPhone: string): PhoneValidationResult {
  if (!rawPhone || !rawPhone.trim()) {
    return {
      valid: false,
      cleanNumber: '',
      e164WithPlus: '',
      formattedDisplay: '',
      error: 'WhatsApp phone number is required.',
    };
  }

  const trimmed = rawPhone.trim();

  // Strip all non-digit characters except leading plus
  let digitsOnly = trimmed.replace(/[^\d+]/g, '');

  // Handle leading + or 00
  if (digitsOnly.startsWith('00')) {
    digitsOnly = digitsOnly.slice(2);
  } else if (digitsOnly.startsWith('+')) {
    digitsOnly = digitsOnly.slice(1);
  }

  // Remove any remaining non-digit characters
  const cleanNumber = digitsOnly.replace(/\D/g, '');

  // Must have at least 7 digits (smallest international numbers) and max 15 digits (ITU-T E.164 standard)
  if (cleanNumber.length < 7) {
    return {
      valid: false,
      cleanNumber,
      e164WithPlus: `+${cleanNumber}`,
      formattedDisplay: cleanNumber,
      error: 'Phone number is too short. Please include country code (e.g. +1 555 123 4567 or +234 800 000 0000).',
    };
  }

  if (cleanNumber.length > 15) {
    return {
      valid: false,
      cleanNumber,
      e164WithPlus: `+${cleanNumber}`,
      formattedDisplay: cleanNumber,
      error: 'Phone number is too long. International phone numbers cannot exceed 15 digits.',
    };
  }

  // Check for common mistake: local zero without country code (e.g. 080... or 07...)
  if (cleanNumber.startsWith('0') && cleanNumber.length <= 11) {
    return {
      valid: false,
      cleanNumber,
      e164WithPlus: `+${cleanNumber}`,
      formattedDisplay: cleanNumber,
      error: 'Please include your country dial code (e.g. +1 for US/CA, +234 for Nigeria, +44 for UK) instead of a leading 0.',
    };
  }

  return {
    valid: true,
    cleanNumber,
    e164WithPlus: `+${cleanNumber}`,
    formattedDisplay: `+${cleanNumber}`,
  };
}

/**
 * Generates the standardized invitation message for WhatsApp
 */
export function buildWhatsAppInviteMessage(params: {
  staffName: string;
  storeName: string;
  role: string;
  inviteUrl: string;
}): string {
  const staffName = params.staffName.trim();
  const storeName = params.storeName.trim();
  const roleName = formatDisplayRole(params.role);

  return (
    `Hello ${staffName} 👋\n\n` +
    `You've been invited to join ${storeName} on StockWise as a ${roleName}.\n\n` +
    `Tap the link below to accept your invitation:\n\n` +
    `${params.inviteUrl}\n\n` +
    `— StockWise by ALTECH`
  );
}

/**
 * Builds universal and deep links for opening WhatsApp chat
 */
export function buildWhatsAppLinks(cleanPhone: string, message: string) {
  const encodedText = encodeURIComponent(message);
  return {
    // Universal web & mobile redirect link
    waMeUrl: `https://wa.me/${cleanPhone}?text=${encodedText}`,
    // Native mobile app protocol
    appUrl: `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`,
    // Desktop WhatsApp web fallback
    webUrl: `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`,
  };
}

/**
 * Helper to open WhatsApp chat in a new tab or trigger deep link
 */
export function openWhatsAppChat(cleanPhone: string, message: string): boolean {
  const links = buildWhatsAppLinks(cleanPhone, message);

  try {
    // Creating an anchor and clicking it is the most reliable cross-platform method in browsers & WebViews
    const link = document.createElement('a');
    link.href = links.waMeUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.warn('Failed to auto-open WhatsApp link:', err);
    return false;
  }
}

function formatDisplayRole(role?: string | null): string {
  if (!role) return 'Team Member';
  if (role === 'owner') return 'Store Owner';
  if (role === 'sales_staff') return 'Sales Staff';
  if (role === 'inventory_staff') return 'Inventory Staff';
  if (role === 'custom') return 'Custom Staff Member';
  return role.charAt(0).toUpperCase() + role.slice(1);
}
