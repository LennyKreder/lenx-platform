/**
 * Device configuration for planner generation.
 *
 * Each device has:
 * - id: Internal identifier used in file paths and slugs
 * - name: Display name shown to users
 * - description: Brief description of the device
 * - category: "digital" (hyperlinks enabled) or "print" (no hyperlinks)
 * - orientations: Available orientations for this device
 */

export const devices = {
  ipad: {
    id: 'ipad',
    name: 'iPad',
    description: 'Optimized for iPad and Android tablets',
    category: 'digital' as const,
    orientations: ['portrait', 'landscape'] as const,
  },
  'ipad-mini': {
    id: 'ipad-mini',
    name: 'iPad Mini',
    description: 'Optimized for iPad Mini (8.3" display)',
    category: 'digital' as const,
    orientations: ['portrait', 'landscape'] as const,
  },
  remarkable: {
    id: 'remarkable',
    name: 'reMarkable',
    description: 'Optimized for reMarkable e-ink tablets',
    category: 'digital' as const,
    orientations: ['portrait', 'landscape'] as const,
  },
  'rm-move': {
    id: 'rm-move',
    name: 'reMarkable Move',
    description: 'Optimized for reMarkable Move (7" display)',
    category: 'digital' as const,
    orientations: ['portrait', 'landscape'] as const,
  },
  'rm-paper-pro': {
    id: 'rm-paper-pro',
    name: 'reMarkable Paper Pro',
    description: 'Optimized for reMarkable Paper Pro (11.8" display)',
    category: 'digital' as const,
    orientations: ['portrait', 'landscape'] as const,
  },
  'filofax-a5': {
    id: 'filofax-a5',
    name: 'Filofax A5',
    description: 'A5 size ring binder (148x210mm)',
    category: 'print' as const,
    orientations: ['portrait'] as const,
  },
  'filofax-personal': {
    id: 'filofax-personal',
    name: 'Filofax Personal',
    description: 'Personal size ring binder (95x171mm)',
    category: 'print' as const,
    orientations: ['portrait'] as const,
  },
  'filofax-pocket': {
    id: 'filofax-pocket',
    name: 'Filofax Pocket',
    description: 'Pocket size ring binder (81x120mm)',
    category: 'print' as const,
    orientations: ['portrait'] as const,
  },
} as const;

export type DeviceId = keyof typeof devices;
export type Device = (typeof devices)[DeviceId];
export type Orientation = 'portrait' | 'landscape';
export type DeviceCategory = 'digital' | 'print';

/**
 * Short codes for devices + orientations, used in filenames.
 * Format: {device}_{orientation} -> short code
 */
export const deviceShortCodes: Record<string, string> = {
  'ipad_portrait': 'ipad-port',
  'ipad_landscape': 'ipad-ls',
  'ipad-mini_portrait': 'imini-port',
  'ipad-mini_landscape': 'imini-ls',
  'remarkable_portrait': 'rm-port',
  'remarkable_landscape': 'rm-ls',
  'rm-move_portrait': 'rmm-port',
  'rm-move_landscape': 'rmm-ls',
  'rm-paper-pro_portrait': 'rmp-port',
  'rm-paper-pro_landscape': 'rmp-ls',
  'filofax-a5_portrait': 'ff-a5',
  'filofax-personal_portrait': 'ff-pers',
  'filofax-pocket_portrait': 'ff-pock',
};

/**
 * Reverse mapping: short code -> device + orientation
 */
export const shortCodeToDevice: Record<string, { device: DeviceId; orientation: Orientation }> = {
  'ipad-port': { device: 'ipad', orientation: 'portrait' },
  'ipad-ls': { device: 'ipad', orientation: 'landscape' },
  'imini-port': { device: 'ipad-mini', orientation: 'portrait' },
  'imini-ls': { device: 'ipad-mini', orientation: 'landscape' },
  'rm-port': { device: 'remarkable', orientation: 'portrait' },
  'rm-ls': { device: 'remarkable', orientation: 'landscape' },
  'rmm-port': { device: 'rm-move', orientation: 'portrait' },
  'rmm-ls': { device: 'rm-move', orientation: 'landscape' },
  'rmp-port': { device: 'rm-paper-pro', orientation: 'portrait' },
  'rmp-ls': { device: 'rm-paper-pro', orientation: 'landscape' },
  'ff-a5': { device: 'filofax-a5', orientation: 'portrait' },
  'ff-pers': { device: 'filofax-personal', orientation: 'portrait' },
  'ff-pock': { device: 'filofax-pocket', orientation: 'portrait' },
};

/**
 * Get the short code for a device + orientation combination.
 */
export function getDeviceShortCode(deviceId: DeviceId, orientation: Orientation): string {
  const key = `${deviceId}_${orientation}`;
  return deviceShortCodes[key] || key;
}

/**
 * Parse a short code back to device + orientation.
 */
export function parseDeviceShortCode(shortCode: string): { device: DeviceId | null; orientation: Orientation | null } {
  const mapping = shortCodeToDevice[shortCode];
  if (mapping) {
    return mapping;
  }
  return { device: null, orientation: null };
}

/**
 * Get available orientations for a device.
 */
export function getDeviceOrientations(deviceId: DeviceId): readonly Orientation[] {
  return devices[deviceId]?.orientations || ['portrait'];
}

/**
 * Check if a device supports a specific orientation.
 */
export function deviceSupportsOrientation(deviceId: DeviceId, orientation: Orientation): boolean {
  const device = devices[deviceId];
  return device ? (device.orientations as readonly Orientation[]).includes(orientation) : false;
}
