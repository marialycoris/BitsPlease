import { describe, expect, it } from 'vitest';
import * as n from './network';

describe('basics', () => {
  it('converts binary', () => {
    expect(n.decimalToBinary(192)).toBe('11000000');
    expect(n.decimalToBinary(0)).toBe('00000000');
    expect(n.binaryToDecimal('11000000')).toBe(192);
    expect(() => n.decimalToBinary(256)).toThrow();
    expect(() => n.binaryToDecimal('1100')).toThrow();
  });
  it('handles unsigned 32-bit', () => {
    expect(n.ipToNumber('255.255.255.255')).toBe(4294967295);
    expect(n.numberToIp(n.ipToNumber('192.168.1.25'))).toBe('192.168.1.25');
    expect(n.cidrToMask(0)).toBe('0.0.0.0');
    expect(n.cidrToMask(32)).toBe('255.255.255.255');
    expect(n.cidrToMask(26)).toBe('255.255.255.192');
    expect(n.getBroadcastAddress('200.1.1.1', 0)).toBe('255.255.255.255');
  });
  it('validates', () => {
    expect(n.isValidIp('1.2.3')).toBe(false);
    expect(n.isValidIp('1.2.3.256')).toBe(false);
    expect(n.isValidIp('01.2.3.4')).toBe(true);
    expect(n.isValidIp('a.b.c.d')).toBe(false);
    expect(n.maskToCidr('255.255.255.0')).toBe(24);
    expect(n.maskToCidr('255.0.255.0')).toBeNull();
    expect(n.maskToCidr('0.0.0.0')).toBe(0);
    expect(n.maskToCidr('255.255.255.255')).toBe(32);
  });
  it('classes', () => {
    expect(n.getAddressClass('10.0.0.1')).toBe('A');
    expect(n.getAddressClass('127.0.0.1')).toBe('Loopback');
    expect(n.getAddressClass('172.16.0.1')).toBe('B');
    expect(n.getAddressClass('192.168.1.1')).toBe('C');
    expect(n.getAddressClass('224.0.0.1')).toBe('D');
    expect(n.getAddressClass('250.0.0.1')).toBe('E');
    expect(n.getAddressClass('0.1.1.1')).toBe('Special');
  });
});

describe('calculateSubnet', () => {
  it('192.168.1.25/24', () => {
    const s = n.calculateSubnet('192.168.1.25', 24);
    expect(s.network).toBe('192.168.1.0');
    expect(s.broadcast).toBe('192.168.1.255');
    expect(s.firstHost).toBe('192.168.1.1');
    expect(s.lastHost).toBe('192.168.1.254');
    expect(s.usableHosts).toBe(254);
    expect(s.wildcard).toBe('0.0.0.255');
  });
  it('edge prefixes', () => {
    expect(n.calculateSubnet('10.0.0.1', 32).usableHosts).toBe(1);
    expect(n.calculateSubnet('10.0.0.1', 31).usableHosts).toBe(2);
    expect(n.calculateSubnet('10.0.0.1', 0).totalAddresses).toBe(4294967296);
  });
  it('analyzeInput', () => {
    expect(n.analyzeInput('192.168.1.25/24', '').ok).toBe(true);
    expect(n.analyzeInput('192.168.1.25', '255.255.255.0').ok).toBe(true);
    expect(n.analyzeInput('192.168.1.25', '255.0.255.0').ok).toBe(false);
    expect(n.analyzeInput('192.168.1.25', '33').ok).toBe(false);
    expect(n.analyzeInput('300.1.1.1', '24').ok).toBe(false);
  });
});

describe('custom mask', () => {
  it('4 subnets, 50 hosts on class C', () => {
    const r = n.calculateCustomMask({ network: '192.168.1.0', subnets: 4, hosts: 50 });
    expect(r.ok && r.value.prefix).toBe(26);
  });
  it('hosts only', () => {
    const r = n.calculateCustomMask({ network: '192.168.1.0', hosts: 50 });
    expect(r.ok && r.value.prefix).toBe(26);
    expect(r.ok && r.value.usableHostsPerSubnet).toBe(62);
  });
  it('errors', () => {
    expect(n.calculateCustomMask({ network: '192.168.1.0' }).ok).toBe(false);
    expect(n.calculateCustomMask({ network: '192.168.1.0', hosts: 1000 }).ok).toBe(false);
    expect(n.calculateCustomMask({ network: '192.168.1.0', subnets: 128 }).ok).toBe(false);
    expect(n.calculateCustomMask({ network: '192.168.1.0', subnets: 16, hosts: 100 }).ok).toBe(false);
  });
});

describe('generator', () => {
  it('192.168.1.0/24 into 4', () => {
    const r = n.generateSubnets('192.168.1.0', 24, 4);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.subnets.map((s) => s.network)).toEqual(['192.168.1.0', '192.168.1.64', '192.168.1.128', '192.168.1.192']);
      expect(r.value.newPrefix).toBe(26);
    }
  });
  it('non power of two rounds up', () => {
    const r = n.generateSubnets('10.0.0.0', 24, 5);
    expect(r.ok && r.value.totalSubnets).toBe(8);
  });
  it('too many', () => {
    expect(n.generateSubnets('10.0.0.0', 24, 100).ok).toBe(false);
    expect(n.generateSubnets('10.0.0.0', 24, 0).ok).toBe(false);
  });
});

describe('vlsm', () => {
  it('spec example', () => {
    const r = n.calculateVLSM('192.168.1.0', 24, [
      { name: 'Admin', hosts: 5 },
      { name: 'Engineering', hosts: 50 },
      { name: 'HR', hosts: 10 },
      { name: 'Marketing', hosts: 25 },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.allocations.map((a) => `${a.name} ${a.network}/${a.prefix}`)).toEqual([
        'Engineering 192.168.1.0/26',
        'Marketing 192.168.1.64/27',
        'HR 192.168.1.96/28',
        'Admin 192.168.1.112/29',
      ]);
      expect(r.value.nextFree).toBe('192.168.1.120');
    }
  });
  it('overflow', () => {
    const r = n.calculateVLSM('192.168.1.0', 24, [{ name: 'A', hosts: 200 }, { name: 'B', hosts: 100 }]);
    expect(r.ok).toBe(false);
  });
});
