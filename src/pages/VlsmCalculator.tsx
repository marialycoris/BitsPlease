import { useMemo, useRef, useState, type FormEvent } from 'react';
import { calculateVLSM, MSG, parsePrefix } from '../lib/network';
import type { Result, VlsmResult } from '../lib/network';
import { DefList, ErrorBox, Explain, Faq, Field, fmt, NextStep, PageShell, ResultBanner, ResultCard, Steps, TableWrap, td, th } from '../components/ui';

interface Row { id: number; name: string; hosts: string }
const INITIAL: Row[] = [
  { id: 1, name: 'Engineering', hosts: '50' },
  { id: 2, name: 'Marketing', hosts: '25' },
  { id: 3, name: 'HR', hosts: '10' },
  { id: 4, name: 'Admin', hosts: '5' },
];

function run(net: string, cidr: string, rows: Row[]): Result<VlsmResult> {
  const p = parsePrefix(cidr);
  if (p === null) return { ok: false, error: MSG.cidr };
  return calculateVLSM(net, p, rows.map((r) => ({ name: r.name, hosts: r.hosts.trim() === '' ? NaN : Number(r.hosts) })));
}

export default function VlsmCalculator() {
  const nextId = useRef(5);
  const [net, setNet] = useState('192.168.1.0');
  const [cidr, setCidr] = useState('/24');
  const [rows, setRows] = useState<Row[]>(INITIAL);
  const [sub, setSub] = useState({ net, cidr, rows });
  const result = useMemo(() => run(sub.net, sub.cidr, sub.rows), [sub]);

  const onSubmit = (e: FormEvent) => { e.preventDefault(); setSub({ net, cidr, rows }); };
  const update = (id: number, k: 'name' | 'hosts', v: string) => setRows(rows.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const remove = (id: number) => setRows(rows.filter((r) => r.id !== id));
  const add = () => setRows([...rows, { id: nextId.current++, name: '', hosts: '' }]);

  return (
    <PageShell
      path="/vlsm-calculator"
      h1="VLSM Calculator: variable length subnet mask calculator"
      lead="Give each department or link exactly the subnet size it needs. Enter a base network and host requirements, and the calculator allocates subnets from largest to smallest and shows the reasoning."
    >
      <form onSubmit={onSubmit} className="card p-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2 md:max-w-xl">
          <Field label="Base network address" hint="Example: 192.168.1.0">
            {({ id, describedBy }) => <input id={id} className="input" value={net} onChange={(e) => setNet(e.target.value)} autoComplete="off" spellCheck={false} aria-describedby={describedBy} />}
          </Field>
          <Field label="Base CIDR" hint="Example: /24">
            {({ id, describedBy }) => <input id={id} className="input" value={cidr} onChange={(e) => setCidr(e.target.value)} autoComplete="off" aria-describedby={describedBy} />}
          </Field>
        </div>

        <fieldset className="mt-6">
          <legend className="mb-2 text-sm font-medium">Subnet requirements</legend>
          <ul className="space-y-3">
            {rows.map((r, i) => (
              <li key={r.id} className="grid grid-cols-[1fr_7rem_auto] items-end gap-3">
                <div>
                  <label htmlFor={`n-${r.id}`} className="mb-1 block text-sm text-slate-600">Name (row {i + 1})</label>
                  <input id={`n-${r.id}`} className="input !font-sans" value={r.name} placeholder={`Subnet ${i + 1}`} onChange={(e) => update(r.id, 'name', e.target.value)} autoComplete="off" />
                </div>
                <div>
                  <label htmlFor={`h-${r.id}`} className="mb-1 block text-sm text-slate-600">Hosts</label>
                  <input id={`h-${r.id}`} className="input" inputMode="numeric" value={r.hosts} onChange={(e) => update(r.id, 'hosts', e.target.value)} autoComplete="off" />
                </div>
                <button type="button" className="btn-quiet h-[42px]" onClick={() => remove(r.id)} aria-label={`Remove row ${i + 1}${r.name ? `, ${r.name}` : ''}`}>Remove</button>
              </li>
            ))}
          </ul>
          {rows.length === 0 && <p className="text-sm text-slate-600">No requirements yet. Add a row to begin.</p>}
        </fieldset>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn-quiet" onClick={add}>Add row</button>
          <button type="submit" className="btn">Calculate VLSM</button>
        </div>
      </form>

      <div className="mt-6 space-y-6" aria-live="polite">
        {!result.ok && <ErrorBox>{result.error}</ErrorBox>}
        {result.ok && (() => {
          const r = result.value;
          const pct = ((r.addressesUsed / r.baseAddresses) * 100).toFixed(1);
          return (
            <>
              <ResultBanner>All {r.allocations.length} requirements fit inside {r.baseNetwork}/{r.basePrefix}.</ResultBanner>
              <TableWrap caption="VLSM allocation results, largest subnet first">
                <thead>
                  <tr>
                    {['Department', 'Required hosts', 'Allocated hosts', 'Network', 'CIDR', 'Subnet mask', 'First host', 'Last host', 'Broadcast', 'Unused hosts'].map((h) => (
                      <th key={h} scope="col" className={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.allocations.map((a) => (
                    <tr key={a.name + a.network}>
                      <th scope="row" className={`${td} font-sans font-medium`}>{a.name}</th>
                      <td className={td}>{fmt(a.requiredHosts)}</td>
                      <td className={td}>{fmt(a.allocatedHosts)}</td>
                      <td className={td}>{a.network}</td><td className={td}>/{a.prefix}</td><td className={td}>{a.mask}</td>
                      <td className={td}>{a.firstHost}</td><td className={td}>{a.lastHost}</td><td className={td}>{a.broadcast}</td>
                      <td className={td}>{fmt(a.unusedHosts)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>

              <ResultCard title="Address space used">
                <DefList items={[
                  ['Base network', `${r.baseNetwork}/${r.basePrefix}`],
                  ['Addresses in base network', fmt(r.baseAddresses)],
                  ['Addresses allocated', `${fmt(r.addressesUsed)} (${pct}%)`],
                  ['Addresses remaining', fmt(r.addressesRemaining)],
                  ['Next free address', r.nextFree ?? 'None'],
                ]} />
              </ResultCard>

              <Explain>
                <p>Requirements are sorted from the largest host count to the smallest. Each one gets the smallest block where 2^h - 2 ≥ hosts, placed right after the previous block.</p>
                {r.allocations.map((a, i) => (
                  <div key={a.name + a.network}>
                    <p className="mb-1 font-medium">{i + 1}. {a.name}</p>
                    <Steps lines={[
                      `Required hosts: ${fmt(a.requiredHosts)}`,
                      ...a.steps.map((s) => s.text),
                      `Host bits = ${a.hostBits}`,
                      `Prefix = 32 - ${a.hostBits} = /${a.prefix} (${a.mask})`,
                      `Block size = 2^${a.hostBits} = ${fmt(a.totalAddresses)} addresses`,
                      `Network ${a.network}/${a.prefix}, broadcast ${a.broadcast}`,
                      `Unused hosts = ${fmt(a.allocatedHosts)} - ${fmt(a.requiredHosts)} = ${fmt(a.unusedHosts)}`,
                    ]} />
                  </div>
                ))}
                <p>The smallest subnet VLSM hands out here is a /30 (2 usable hosts), so even a requirement of 1 or 2 hosts uses 4 addresses.</p>
              </Explain>
            </>
          );
        })()}
      </div>

      <div className="prose-bp mt-8">
        <h2>What is VLSM?</h2>
        <p>Variable Length Subnet Masking means using different prefix lengths within one network. Instead of cutting a /24 into four equal /26 subnets, VLSM lets a 50-host team get a /26, a 25-host team a /27, and so on, so fewer addresses go to waste.</p>
        <h2>How VLSM subnetting works</h2>
        <p>First, sort the requirements from largest to smallest. For each one, find the smallest number of host bits h where 2<sup>h</sup> - 2 is at least the hosts needed, then set the prefix to 32 - h. Allocate each block at the next free address. Because block sizes are powers of two and you allocate largest first, every block lands on a proper boundary.</p>
        <h2>Why allocate the largest subnet first</h2>
        <p>Placing big blocks first avoids awkward gaps. If you placed a small block first, the next large block would have to skip ahead to the next aligned boundary, leaving unusable space behind it.</p>
        <h2>Planning for growth</h2>
        <p>Allocated hosts are usually more than the required hosts, because sizes round up to a power of two. The “Unused hosts” column shows that spare capacity, and “Addresses remaining” shows what is left in the base network for future subnets.</p>
      </div>
      <Faq path="/vlsm-calculator" />
      <NextStep to="/subnet-generator" label="Compare with the Subnet Generator">Want to see what equal-sized subnets would look like for the same network?</NextStep>
    </PageShell>
  );
}
