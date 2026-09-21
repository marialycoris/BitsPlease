import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { calculateCustomMask, describeClass, type CustomMaskResult } from '../lib/network';
import { DefList, ErrorBox, Explain, Faq, Field, fmt, NextStep, PageShell, ResultBanner, ResultCard, Steps } from '../components/ui';

const toNum = (s: string) => (s.trim() === '' ? undefined : Number(s));

function Explanation({ r }: { r: CustomMaskResult }) {
  return (
    <Explain>
      <p className="font-medium">Starting point</p>
      <Steps lines={[`${r.network} is ${describeClass(r.addressClass)}`, `Default prefix = /${r.defaultPrefix} (${r.defaultMask})`]} />
      {r.subnetSteps && (
        <>
          <p className="font-medium">Subnets: find the borrowed bits b where 2^b ≥ subnets</p>
          <Steps lines={[`Required subnets: ${r.requestedSubnets}`, '', ...r.subnetSteps.map((s) => s.text), '', `Borrowed bits = ${r.subnetSteps.length - 1}`, `Prefix = ${r.defaultPrefix} + ${r.subnetSteps.length - 1} = /${r.subnetPrefix}`]} />
        </>
      )}
      {r.hostSteps && (
        <>
          <p className="font-medium">Hosts: find the host bits h where 2^h - 2 ≥ hosts</p>
          <Steps lines={[`Required hosts: ${r.requestedHosts}`, '', ...r.hostSteps.map((s) => s.text), '', `Host bits = ${r.hostSteps.length + 1}`, `Prefix = 32 - ${r.hostSteps.length + 1} = /${r.hostPrefix}`]} />
        </>
      )}
      {r.validRange && (
        <p>
          Both requirements are set, so any prefix from /{r.validRange[0]} to /{r.validRange[1]} works. The result uses /{r.prefix}, which borrows the fewest bits and leaves the most hosts per subnet.
        </p>
      )}
      <p className="font-medium">Result</p>
      <Steps lines={[`Custom prefix = /${r.prefix} → ${r.mask}`, `Borrowed bits = ${r.prefix} - ${r.defaultPrefix} = ${r.borrowedBits}`, `Host bits = 32 - ${r.prefix} = ${r.hostBits}`, `Total subnets = 2^${r.borrowedBits} = ${fmt(r.totalSubnets)}`, `Hosts/addresses per subnet = 2^${r.hostBits} = ${fmt(r.addressesPerSubnet)}`, `Usable hosts/addresses per subnet = 2^${r.hostBits} - 2 = ${fmt(r.usableHostsPerSubnet)}`]} />
    </Explain>
  );
}

export default function CustomSubnet() {
  const [f, setF] = useState({ net: '192.168.1.0', subnets: '4', hosts: '50' });
  const [sub, setSub] = useState(f);
  const result = useMemo(() => calculateCustomMask({ network: sub.net, subnets: toNum(sub.subnets), hosts: toNum(sub.hosts) }), [sub]);
  const onSubmit = (e: FormEvent) => { e.preventDefault(); setSub(f); };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <PageShell
      path="/custom-subnet"
      h1="Custom Subnet Calculator: find the subnet mask you need"
      lead="Tell us how many subnets or how many hosts per subnet you need, and we will work out the subnet mask and show the formula with your numbers."
    >
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-4 md:items-start" noValidate>
        <Field label="Network address" hint="Example: 192.168.1.0">
          {({ id, describedBy }) => <input id={id} className="input" value={f.net} onChange={set('net')} autoComplete="off" spellCheck={false} aria-describedby={describedBy} />}
        </Field>
        <Field label="Required subnets (optional)" hint="Leave blank if not needed">
          {({ id, describedBy }) => <input id={id} className="input" inputMode="numeric" value={f.subnets} onChange={set('subnets')} autoComplete="off" aria-describedby={describedBy} />}
        </Field>
        <Field label="Required hosts per subnet (optional)" hint="Usable hosts">
          {({ id, describedBy }) => <input id={id} className="input" inputMode="numeric" value={f.hosts} onChange={set('hosts')} autoComplete="off" aria-describedby={describedBy} />}
        </Field>
        <div className="md:pt-6"><button className="btn w-full" type="submit">Calculate mask</button></div>
      </form>

      <div className="mt-6 space-y-6" aria-live="polite">
        {!result.ok && <ErrorBox>{result.error}</ErrorBox>}
        {result.ok && (() => {
          const r = result.value;
          const s = r.firstSubnet;
          return (
            <>
              <ResultBanner>Use subnet mask {r.mask} (/{r.prefix}).</ResultBanner>
              <div className="grid gap-6 lg:grid-cols-3">
                <ResultCard title="Network information">
                  <DefList items={[['Network address', r.network], ['Address class', describeClass(r.addressClass)], ['Default mask', r.defaultMask], ['Default CIDR', `/${r.defaultPrefix}`], ['Custom mask', r.mask], ['Custom CIDR', `/${r.prefix}`]]} />
                </ResultCard>
                <ResultCard title="Subnetting information">
                  <DefList items={[['Bits borrowed', r.borrowedBits], ['Host bits remaining', r.hostBits], ['Total subnets', fmt(r.totalSubnets)], ['Hosts/addresses per subnet', fmt(r.addressesPerSubnet)], ['Usable hosts/addresses per subnet', fmt(r.usableHostsPerSubnet)]]} />
                </ResultCard>
                <ResultCard title="Address range (first subnet)">
                  <DefList items={[['Network address', s.network], ['First usable host', s.firstHost], ['Last usable host', s.lastHost], ['Broadcast address', s.broadcast]]} />
                </ResultCard>
              </div>
              <p className="text-sm text-slate-600">
                The number of subnets is 2^{r.borrowedBits}, not 2^{r.borrowedBits} - 2. Discarding the all-zeros and all-ones subnets is a historical convention that modern networks no longer follow.
              </p>
              <Explanation r={r} />
            </>
          );
        })()}
      </div>

      <div className="prose-bp mt-8">
        <h2>What subnet mask should I use?</h2>
        <p>The right mask depends on what you need. If you know how many separate networks you need, you borrow bits from the host portion to create them. If you know how many devices must fit on each network, you keep enough host bits to address them. This calculator handles either requirement, or both together.</p>
        <h2>Calculating from the number of subnets</h2>
        <p>Find the smallest <code>b</code> where 2<sup>b</sup> ≥ the number of subnets. Those are the borrowed bits. The new prefix is the default prefix plus b. Four subnets on a Class C network need b = 2, so <code>/24 + 2 = /26</code>.</p>
        <h2>Calculating from hosts per subnet</h2>
        <p>Find the smallest <code>h</code> where 2<sup>h</sup> - 2 ≥ the number of hosts. The prefix is <code>32 - h</code>. For 50 hosts, h = 6 gives 62 usable hosts, so the prefix is <code>/26</code>. The subtraction of 2 accounts for the network and broadcast addresses.</p>
        <h2>When you need both</h2>
        <p>The subnet requirement sets a minimum prefix and the host requirement sets a maximum. If the minimum is larger than the maximum, no single mask can satisfy both, and the calculator says so.</p>
      </div>
      <Faq path="/custom-subnet" />
      <NextStep to="/subnet-generator" label="Use the Subnet Generator">Once you have calculated your subnet mask, see the resulting subnets.</NextStep>
      <p className="mt-4 text-sm text-slate-600">Need to check what a mask means for one address? Use the <Link to="/ip-calculator">IP Calculator</Link>.</p>
    </PageShell>
  );
}
