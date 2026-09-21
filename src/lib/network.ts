/**
 * Bits Please: pure IPv4 networking utilities.
 * No React, no DOM. All 32-bit values are kept unsigned via `>>> 0`.
 */

export const MAX_U32 = 0xffffffff;

export type AddressClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'Loopback' | 'Special';

// ---------- Binary helpers ----------

export function decimalToBinary(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 255) throw new RangeError('Value must be an integer from 0 to 255.');
  return n.toString(2).padStart(8, '0');
}

export function binaryToDecimal(bits: string): number {
  if (!/^[01]{8}$/.test(bits)) throw new RangeError('Binary value must be exactly 8 digits of 0 or 1.');
  return parseInt(bits, 2);
}

// ---------- IP parsing / formatting ----------

/** Returns the four octets, or null when the string is not a strict dotted-quad. */
export function parseOctets(ip: string): number[] | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    octets.push(n);
  }
  return octets;
}

export function isValidIp(ip: string): boolean {
  return parseOctets(ip) !== null;
}

export function ipToNumber(ip: string): number {
  const o = parseOctets(ip);
  if (!o) throw new RangeError('Invalid IPv4 address.');
  return (((o[0] * 256 + o[1]) * 256 + o[2]) * 256 + o[3]) >>> 0;
}

export function numberToIp(n: number): string {
  const v = n >>> 0;
  return [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join('.');
}

/** Dotted binary, e.g. 11000000.10101000.00000001.00011001 */
export function ipToBinary(ip: string | number): string {
  const n = typeof ip === 'number' ? ip : ipToNumber(ip);
  return numberToIp(n)
    .split('.')
    .map((o) => decimalToBinary(Number(o)))
    .join('.');
}

// ---------- Masks / CIDR ----------

export function prefixToMaskNumber(prefix: number): number {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new RangeError('Prefix must be 0 to 32.');
  return prefix === 0 ? 0 : (MAX_U32 << (32 - prefix)) >>> 0;
}

export function cidrToMask(prefix: number): string {
  return numberToIp(prefixToMaskNumber(prefix));
}

/** Returns the prefix length for a valid contiguous mask, otherwise null. */
export function maskToCidr(mask: string): number | null {
  if (!isValidIp(mask)) return null;
  const n = ipToNumber(mask);
  const bin = n.toString(2).padStart(32, '0');
  if (!/^1*0*$/.test(bin)) return null;
  return bin.indexOf('0') === -1 ? 32 : bin.indexOf('0');
}

export function isValidSubnetMask(mask: string): boolean {
  return maskToCidr(mask) !== null;
}

export function getWildcardMask(prefix: number): string {
  return numberToIp((~prefixToMaskNumber(prefix)) >>> 0);
}

/** Parses "24", "/24" into a prefix, or null. */
export function parsePrefix(text: string): number | null {
  const t = text.trim().replace(/^\//, '');
  if (!/^\d{1,2}$/.test(t)) return null;
  const n = Number(t);
  return n >= 0 && n <= 32 ? n : null;
}

// ---------- Address classes ----------

export function getAddressClass(ip: string): AddressClass {
  const first = parseOctets(ip)?.[0];
  if (first === undefined) throw new RangeError('Invalid IPv4 address.');
  if (first === 0) return 'Special';
  if (first === 127) return 'Loopback';
  if (first <= 126) return 'A';
  if (first <= 191) return 'B';
  if (first <= 223) return 'C';
  if (first <= 239) return 'D';
  return 'E';
}

/** Default classful prefix, or null for classes without one (D, E, loopback, special). */
export function getDefaultPrefix(cls: AddressClass): number | null {
  return cls === 'A' ? 8 : cls === 'B' ? 16 : cls === 'C' ? 24 : null;
}

export function describeClass(cls: AddressClass): string {
  switch (cls) {
    case 'A': return 'Class A (1–126)';
    case 'B': return 'Class B (128–191)';
    case 'C': return 'Class C (192–223)';
    case 'D': return 'Class D (224–239, multicast)';
    case 'E': return 'Class E (240–255, reserved)';
    case 'Loopback': return 'Loopback (127.x.x.x)';
    default: return 'Special (0.x.x.x)';
  }
}

// ---------- Network arithmetic ----------

export function getTotalAddresses(prefix: number): number {
  return 2 ** (32 - prefix);
}

/** Usable hosts. /31 (RFC 3021) gives 2, /32 gives 1, otherwise total - 2. */
export function getUsableHosts(prefix: number): number {
  if (prefix === 32) return 1;
  if (prefix === 31) return 2;
  return getTotalAddresses(prefix) - 2;
}

export function getNetworkAddress(ip: string, prefix: number): string {
  return numberToIp((ipToNumber(ip) & prefixToMaskNumber(prefix)) >>> 0);
}

export function getBroadcastAddress(ip: string, prefix: number): string {
  const net = ipToNumber(getNetworkAddress(ip, prefix));
  return numberToIp((net + getTotalAddresses(prefix) - 1) >>> 0);
}

export function getFirstHost(ip: string, prefix: number): string {
  const net = ipToNumber(getNetworkAddress(ip, prefix));
  return numberToIp(prefix >= 31 ? net : net + 1);
}

export function getLastHost(ip: string, prefix: number): string {
  const net = ipToNumber(getNetworkAddress(ip, prefix));
  const last = net + getTotalAddresses(prefix) - 1;
  return numberToIp(prefix >= 31 ? last : last - 1);
}

// ---------- Result types ----------

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export const MSG = {
  ip: 'Please enter a valid IPv4 address, like 192.168.1.25.',
  octet: 'Each octet must be between 0 and 255.',
  cidr: 'Please enter a valid CIDR prefix from /0 to /32.',
  mask: 'The subnet mask is not valid. A mask must be a run of 1s followed by a run of 0s, like 255.255.255.0.',
  atLeastOne: 'Please enter at least one subnetting requirement.',
  subnetsTooMany: 'The requested number of subnets cannot fit inside this network.',
  hostsTooMany: 'The required hosts cannot be supported by this network.',
};

/** Friendlier IP validation message (distinguishes out-of-range octets). */
export function ipError(ip: string): string | null {
  const t = ip.trim();
  if (t === '') return MSG.ip;
  const parts = t.split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p))) return MSG.ip;
  if (parts.some((p) => Number(p) > 255)) return MSG.octet;
  return null;
}

// ---------- calculateSubnet ----------

export interface SubnetInfo {
  ip: string;
  prefix: number;
  mask: string;
  wildcard: string;
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
  addressClass: AddressClass;
  defaultPrefix: number | null;
  defaultMask: string | null;
  binary: { ip: string; mask: string; network: string; broadcast: string };
  note?: string;
}

export function calculateSubnet(ip: string, prefix: number): SubnetInfo {
  const network = getNetworkAddress(ip, prefix);
  const broadcast = getBroadcastAddress(ip, prefix);
  const cls = getAddressClass(ip);
  const defPrefix = getDefaultPrefix(cls);
  let note: string | undefined;
  if (prefix === 32) note = 'A /32 is a single host address, so there is no separate network or broadcast address.';
  else if (prefix === 31) note = 'A /31 is a point-to-point link (RFC 3021). Both addresses are usable and there is no broadcast.';
  return {
    ip,
    prefix,
    mask: cidrToMask(prefix),
    wildcard: getWildcardMask(prefix),
    network,
    broadcast,
    firstHost: getFirstHost(ip, prefix),
    lastHost: getLastHost(ip, prefix),
    totalAddresses: getTotalAddresses(prefix),
    usableHosts: getUsableHosts(prefix),
    addressClass: cls,
    defaultPrefix: defPrefix,
    defaultMask: defPrefix === null ? null : cidrToMask(defPrefix),
    binary: {
      ip: ipToBinary(ip),
      mask: ipToBinary(cidrToMask(prefix)),
      network: ipToBinary(network),
      broadcast: ipToBinary(broadcast),
    },
    note,
  };
}

/** Parse the IP Calculator's inputs: "ip/cidr", or ip plus mask/cidr in the second field. */
export function analyzeInput(ipText: string, maskText: string): Result<SubnetInfo> {
  let ip = ipText.trim();
  let second = maskText.trim();
  if (ip.includes('/')) {
    const [a, b] = ip.split('/');
    ip = a.trim();
    second = second || b.trim();
    if (maskText.trim() && b.trim()) second = maskText.trim();
  }
  const ipErr = ipError(ip);
  if (ipErr) return fail(ipErr);
  if (second === '') return fail('Please enter a subnet mask or a CIDR prefix.');
  let prefix: number | null;
  if (second.includes('.')) {
    const maskErr = ipError(second);
    if (maskErr) return fail(maskErr === MSG.octet ? MSG.octet : MSG.mask);
    prefix = maskToCidr(second);
    if (prefix === null) return fail(MSG.mask);
  } else {
    prefix = parsePrefix(second);
    if (prefix === null) return fail(MSG.cidr);
  }
  return { ok: true, value: calculateSubnet(ip, prefix) };
}

// ---------- Explanation helpers ----------

export interface PowerStep { exp: number; value: number; text: string; enough: boolean }

/** Steps for finding host bits: smallest h with 2^h - 2 >= hosts. */
export function hostBitSteps(hosts: number): { steps: PowerStep[]; hostBits: number } {
  const steps: PowerStep[] = [];
  let h = 2;
  for (; h <= 32; h++) {
    const usable = 2 ** h - 2;
    const enough = usable >= hosts;
    steps.push({ exp: h, value: usable, enough, text: `2^${h} - 2 = ${usable.toLocaleString('en-US')} hosts, ${usable.toLocaleString('en-US')} ${enough ? '>=' : '<'} ${hosts.toLocaleString('en-US')} → ${enough ? 'sufficient' : 'insufficient'}` });
    if (enough) break;
  }
  return { steps, hostBits: Math.min(h, 32) };
}

/** Steps for borrowed bits: smallest b with 2^b >= subnets. */
export function borrowedBitSteps(subnets: number): { steps: PowerStep[]; bits: number } {
  const steps: PowerStep[] = [];
  let b = 0;
  for (; b <= 32; b++) {
    const v = 2 ** b;
    const enough = v >= subnets;
    steps.push({ exp: b, value: v, enough, text: `2^${b} = ${v.toLocaleString('en-US')} ${enough ? '>=' : '<'} ${subnets.toLocaleString('en-US')} → ${enough ? 'sufficient' : 'insufficient'}` });
    if (enough) break;
  }
  return { steps, bits: Math.min(b, 32) };
}

// ---------- calculateCustomMask ----------

export interface CustomMaskInput {
  network: string;
  subnets?: number;
  hosts?: number;
}

export interface CustomMaskResult {
  network: string;
  addressClass: AddressClass;
  defaultPrefix: number;
  defaultMask: string;
  prefix: number;
  mask: string;
  borrowedBits: number;
  hostBits: number;
  totalSubnets: number;
  addressesPerSubnet: number;
  usableHostsPerSubnet: number;
  firstSubnet: SubnetInfo;
  requestedSubnets?: number;
  requestedHosts?: number;
  subnetSteps?: PowerStep[];
  hostSteps?: PowerStep[];
  subnetPrefix?: number;
  hostPrefix?: number;
  /** When both requirements are given, the inclusive range of prefixes that satisfy both. */
  validRange?: [number, number];
}

const MAX_CUSTOM_PREFIX = 30;

export function calculateCustomMask(input: CustomMaskInput): Result<CustomMaskResult> {
  const err = ipError(input.network);
  if (err) return fail(err);
  const wantSubnets = input.subnets !== undefined && !Number.isNaN(input.subnets);
  const wantHosts = input.hosts !== undefined && !Number.isNaN(input.hosts);
  if (!wantSubnets && !wantHosts) return fail(MSG.atLeastOne);
  if (wantSubnets && (!Number.isInteger(input.subnets) || (input.subnets as number) < 1)) return fail('The number of subnets must be a whole number of at least 1.');
  if (wantHosts && (!Number.isInteger(input.hosts) || (input.hosts as number) < 1)) return fail('The number of hosts must be a whole number of at least 1.');

  const network = input.network.trim();
  const cls = getAddressClass(network);
  const defPrefix = getDefaultPrefix(cls);
  if (defPrefix === null) {
    return fail(`${describeClass(cls)} addresses do not have a default classful mask. Use a Class A, B, or C network address, or try the Subnet Generator with an explicit CIDR.`);
  }

  let subnetPrefix: number | undefined;
  let hostPrefix: number | undefined;
  let subnetSteps: PowerStep[] | undefined;
  let hostSteps: PowerStep[] | undefined;

  if (wantSubnets) {
    const r = borrowedBitSteps(input.subnets as number);
    subnetSteps = r.steps;
    subnetPrefix = defPrefix + r.bits;
    if (subnetPrefix > MAX_CUSTOM_PREFIX) return fail(MSG.subnetsTooMany);
  }
  if (wantHosts) {
    const r = hostBitSteps(input.hosts as number);
    hostSteps = r.steps;
    hostPrefix = 32 - r.hostBits;
    if (hostPrefix < defPrefix) return fail(MSG.hostsTooMany);
  }

  let prefix: number;
  let validRange: [number, number] | undefined;
  if (subnetPrefix !== undefined && hostPrefix !== undefined) {
    if (subnetPrefix > hostPrefix) {
      return fail(`These requirements cannot both be met inside this network: ${input.subnets} subnets need at least /${subnetPrefix}, but ${input.hosts} hosts per subnet need /${hostPrefix} or shorter.`);
    }
    validRange = [subnetPrefix, hostPrefix];
    prefix = subnetPrefix;
  } else {
    prefix = (subnetPrefix ?? hostPrefix) as number;
  }

  const borrowed = prefix - defPrefix;
  return {
    ok: true,
    value: {
      network,
      addressClass: cls,
      defaultPrefix: defPrefix,
      defaultMask: cidrToMask(defPrefix),
      prefix,
      mask: cidrToMask(prefix),
      borrowedBits: borrowed,
      hostBits: 32 - prefix,
      totalSubnets: 2 ** borrowed,
      addressesPerSubnet: getTotalAddresses(prefix),
      usableHostsPerSubnet: getUsableHosts(prefix),
      firstSubnet: calculateSubnet(network, prefix),
      requestedSubnets: wantSubnets ? input.subnets : undefined,
      requestedHosts: wantHosts ? input.hosts : undefined,
      subnetSteps,
      hostSteps,
      subnetPrefix,
      hostPrefix,
      validRange,
    },
  };
}

// ---------- generateSubnets ----------

export interface GeneratedSubnet {
  index: number;
  network: string;
  prefix: number;
  mask: string;
  firstHost: string;
  lastHost: string;
  broadcast: string;
  totalAddresses: number;
  usableHosts: number;
}

export interface GeneratorResult {
  baseNetwork: string;
  originalPrefix: number;
  requested: number;
  borrowedBits: number;
  newPrefix: number;
  hostBits: number;
  blockSize: number;
  addressesPerSubnet: number;
  usableHosts: number;
  totalSubnets: number;
  subnets: GeneratedSubnet[];
  truncated: boolean;
  steps: PowerStep[];
  notice?: string;
}

export const MAX_ROWS = 1024;

export function generateSubnets(ip: string, prefix: number, requested: number): Result<GeneratorResult> {
  const err = ipError(ip);
  if (err) return fail(err);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return fail(MSG.cidr);
  if (!Number.isInteger(requested) || requested < 1) return fail('The number of subnets must be a whole number of at least 1.');

  const { steps, bits } = borrowedBitSteps(requested);
  const newPrefix = prefix + bits;
  if (newPrefix > MAX_CUSTOM_PREFIX) return fail(`${MSG.subnetsTooMany} A /${prefix} network can be split into at most ${2 ** (MAX_CUSTOM_PREFIX - prefix)} subnets with at least 2 usable hosts each.`);

  const base = getNetworkAddress(ip, prefix);
  const notice = base !== ip.trim() ? `${ip.trim()} is not a network address for /${prefix}, so the calculation starts from the network address ${base}.` : undefined;
  const baseNum = ipToNumber(base);
  const size = getTotalAddresses(newPrefix);
  const total = 2 ** bits;
  const shown = Math.min(total, MAX_ROWS);
  const subnets: GeneratedSubnet[] = [];
  for (let i = 0; i < shown; i++) {
    const net = numberToIp(baseNum + i * size);
    subnets.push({
      index: i + 1,
      network: net,
      prefix: newPrefix,
      mask: cidrToMask(newPrefix),
      firstHost: getFirstHost(net, newPrefix),
      lastHost: getLastHost(net, newPrefix),
      broadcast: getBroadcastAddress(net, newPrefix),
      totalAddresses: size,
      usableHosts: getUsableHosts(newPrefix),
    });
  }
  return {
    ok: true,
    value: {
      baseNetwork: base,
      originalPrefix: prefix,
      requested,
      borrowedBits: bits,
      newPrefix,
      hostBits: 32 - newPrefix,
      blockSize: size,
      addressesPerSubnet: size,
      usableHosts: getUsableHosts(newPrefix),
      totalSubnets: total,
      subnets,
      truncated: total > shown,
      steps,
      notice,
    },
  };
}

// ---------- calculateVLSM ----------

export interface VlsmRequirement { name: string; hosts: number }

export interface VlsmAllocation {
  name: string;
  requiredHosts: number;
  hostBits: number;
  prefix: number;
  mask: string;
  network: string;
  firstHost: string;
  lastHost: string;
  broadcast: string;
  totalAddresses: number;
  allocatedHosts: number;
  unusedHosts: number;
  steps: PowerStep[];
}

export interface VlsmResult {
  baseNetwork: string;
  basePrefix: number;
  baseAddresses: number;
  allocations: VlsmAllocation[];
  addressesUsed: number;
  addressesRemaining: number;
  nextFree: string | null;
}

export function calculateVLSM(ip: string, prefix: number, reqs: VlsmRequirement[]): Result<VlsmResult> {
  const err = ipError(ip);
  if (err) return fail(err);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return fail(MSG.cidr);
  if (reqs.length === 0) return fail('Please add at least one subnet requirement.');
  for (let i = 0; i < reqs.length; i++) {
    const h = reqs[i].hosts;
    if (!Number.isInteger(h) || h < 1) return fail(`Row ${i + 1}: enter a whole number of hosts of at least 1.`);
    if (h > 2 ** 30 - 2) return fail(`Row ${i + 1}: that many hosts cannot fit in an IPv4 subnet.`);
  }

  const baseNum = ipToNumber(getNetworkAddress(ip, prefix));
  const baseAddresses = getTotalAddresses(prefix);
  const baseEnd = baseNum + baseAddresses; // exclusive

  const sorted = reqs
    .map((r, i) => ({ ...r, name: r.name.trim() || `Subnet ${i + 1}`, i }))
    .sort((a, b) => b.hosts - a.hosts || a.i - b.i);

  let cursor = baseNum;
  const allocations: VlsmAllocation[] = [];
  for (const r of sorted) {
    const { steps, hostBits } = hostBitSteps(r.hosts);
    const size = 2 ** hostBits;
    const p = 32 - hostBits;
    // Align cursor to the block size (already aligned when sorting largest-first, but be safe).
    const start = Math.ceil(cursor / size) * size;
    if (start + size > baseEnd) {
      const needed = sorted.reduce((s, x) => s + 2 ** hostBitSteps(x.hosts).hostBits, 0);
      return fail(
        `${r.name} (${r.hosts.toLocaleString('en-US')} hosts) does not fit. The requirements need ${needed.toLocaleString('en-US')} addresses in total, but ${numberToIp(baseNum)}/${prefix} only has ${baseAddresses.toLocaleString('en-US')}. Use a larger base network or reduce the host counts.`,
      );
    }
    const net = numberToIp(start);
    allocations.push({
      name: r.name,
      requiredHosts: r.hosts,
      hostBits,
      prefix: p,
      mask: cidrToMask(p),
      network: net,
      firstHost: getFirstHost(net, p),
      lastHost: getLastHost(net, p),
      broadcast: getBroadcastAddress(net, p),
      totalAddresses: size,
      allocatedHosts: getUsableHosts(p),
      unusedHosts: getUsableHosts(p) - r.hosts,
      steps,
    });
    cursor = start + size;
  }
  return {
    ok: true,
    value: {
      baseNetwork: numberToIp(baseNum),
      basePrefix: prefix,
      baseAddresses,
      allocations,
      addressesUsed: cursor - baseNum,
      addressesRemaining: baseEnd - cursor,
      nextFree: cursor < baseEnd ? numberToIp(cursor) : null,
    },
  };
}
