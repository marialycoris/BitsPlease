import { useState } from 'react';
import { BitBoard } from '../components/BitBoard';
import { binaryToDecimal, decimalToBinary } from '../lib/network';
import { Explain, Faq, Field, NextStep, PageShell, Steps } from '../components/ui';

const PLACES = [128, 64, 32, 16, 8, 4, 2, 1];

export default function BinaryLab() {
  const [value, setValue] = useState(192);
  const [dec, setDec] = useState('192');
  const [bin, setBin] = useState('11000000');
  const [decErr, setDecErr] = useState<string | null>(null);
  const [binErr, setBinErr] = useState<string | null>(null);

  const sync = (v: number) => {
    setValue(v); setDec(String(v)); setBin(decimalToBinary(v)); setDecErr(null); setBinErr(null);
  };

  const onDec = (t: string) => {
    setDec(t);
    const s = t.trim();
    if (s === '') { setDecErr('Please enter a number from 0 to 255.'); return; }
    if (!/^\d+$/.test(s)) { setDecErr('Please enter a whole number using digits only.'); return; }
    const n = Number(s);
    if (n > 255) { setDecErr('An octet must be between 0 and 255.'); return; }
    setDecErr(null); setValue(n); setBin(decimalToBinary(n)); setBinErr(null);
  };

  const onBin = (t: string) => {
    setBin(t);
    const s = t.trim();
    if (!/^[01]*$/.test(s)) { setBinErr('Only the digits 0 and 1 are allowed.'); return; }
    if (s.length !== 8) { setBinErr(`Enter exactly 8 binary digits. You have entered ${s.length}.`); return; }
    const n = binaryToDecimal(s);
    setBinErr(null); setValue(n); setDec(String(n)); setDecErr(null);
  };

  const bits = decimalToBinary(value);
  const on = PLACES.filter((p) => (value & p) !== 0);

  // Greedy decimal → binary walkthrough
  let left = value;
  const decLines = PLACES.map((p) => {
    if (left >= p) { const r = left - p; const l = `${p} fits into ${left} → bit 1, ${left} - ${p} = ${r}`; left = r; return l; }
    return `${p} does not fit into ${left} → bit 0`;
  });

  return (
    <PageShell
      path="/binary-lab"
      h1="Binary Lab: binary to decimal and decimal to binary"
      lead="Convert an octet between decimal and 8-bit binary, then flip the bits to see how each place value adds up. This is the foundation for reading IPv4 addresses and subnet masks."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="d2b">
          <h2 id="d2b" className="mb-4 text-xl font-semibold">Decimal → binary</h2>
          <Field label="Decimal value (0–255)" error={decErr}>
            {({ id, describedBy, invalid }) => (
              <input id={id} className="input" inputMode="numeric" autoComplete="off" value={dec} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => onDec(e.target.value)} />
            )}
          </Field>
          <p className="mt-4 text-sm text-slate-600">8-bit result</p>
          <p className="font-mono text-3xl font-medium tracking-widest" aria-live="polite">{bits}</p>
        </section>

        <section className="card p-5" aria-labelledby="b2d">
          <h2 id="b2d" className="mb-4 text-xl font-semibold">Binary → decimal</h2>
          <Field label="Binary value (exactly 8 digits)" error={binErr}>
            {({ id, describedBy, invalid }) => (
              <input id={id} className="input" inputMode="numeric" autoComplete="off" maxLength={12} value={bin} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => onBin(e.target.value)} />
            )}
          </Field>
          <p className="mt-4 text-sm text-slate-600">Decimal result</p>
          <p className="font-mono text-3xl font-medium" aria-live="polite">{value}</p>
        </section>
      </div>

      <section className="card mt-6 p-5" aria-labelledby="board-h">
        <h2 id="board-h" className="mb-1 text-xl font-semibold">Place values</h2>
        <p className="mb-4 text-slate-600">Each position is a power of two, doubling from right to left. A 1 means “add this value”. Select a bit to switch it.</p>
        <BitBoard value={value} onChange={sync} />
      </section>

      <Explain>
        <p>Current value: <strong className="font-mono">{value}</strong> = <strong className="font-mono">{bits}</strong></p>
        <p className="font-medium">Decimal → binary (subtract the largest place value that fits)</p>
        <Steps lines={decLines} />
        <p className="font-medium">Binary → decimal (add the place values that have a 1)</p>
        <Steps lines={[`${bits}`, on.length ? `${on.join(' + ')} = ${value}` : '0 = 0']} />
      </Explain>

      <div className="prose-bp mt-6">
        <h2>How 8-bit binary works</h2>
        <p>Computers store numbers as bits, each either 0 or 1. Just as decimal place values are 1, 10, 100, binary place values are powers of two: 1, 2, 4, 8, 16, 32, 64, 128. Eight bits give you 2<sup>8</sup> = 256 combinations, which is why one octet of an IPv4 address runs from 0 to 255.</p>
        <p>To read a binary number, add up the place values that have a 1. The value <code>11000000</code> has 1s in the 128 and 64 positions, so it equals 128 + 64 = 192.</p>
        <h2>Why binary matters for networking</h2>
        <p>An IPv4 address is really 32 bits. A subnet mask such as <code>255.255.255.0</code> is 24 ones followed by 8 zeros. The ones mark the network portion and the zeros mark the host portion. Once you can move between decimal and binary, working out network addresses and subnet boundaries becomes a matter of counting bits.</p>
        <p>Useful octet values to recognize: <code>128</code> = 10000000, <code>192</code> = 11000000, <code>224</code> = 11100000, <code>240</code> = 11110000, <code>248</code> = 11111000, <code>252</code> = 11111100, <code>254</code> = 11111110, and <code>255</code> = 11111111. These are the only values a subnet mask octet can take besides 0.</p>
      </div>

      <Faq path="/binary-lab" />
      <NextStep to="/ip-calculator" label="Try the IP Calculator">Understanding binary is useful when learning subnet masks.</NextStep>
    </PageShell>
  );
}
