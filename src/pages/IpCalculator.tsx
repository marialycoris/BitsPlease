import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { analyzeInput, describeClass, type SubnetInfo } from '../lib/network';
import { BitString, DefList, ErrorBox, Explain, Faq, Field, fmt, NextStep, PageShell, ResultBanner, ResultCard, Steps, TableWrap, td, th } from '../components/ui';

function Explanation({ r }: { r: SubnetInfo }) {
  const hostBits = 32 - r.prefix;
  const andLines = [
    `IP address      ${r.binary.ip}`,
    `Subnet mask     ${r.binary.mask}`,
    `AND (network)   ${r.binary.network}`,
  ];
  return (
    <Explain>
      <p className="font-medium">1. Subnet mask and prefix</p>
      <Steps lines={[`${r.mask} has ${r.prefix} leading 1 bits`, `CIDR prefix = /${r.prefix}`, `Host bits = 32 - ${r.prefix} = ${hostBits}`, `Wildcard mask = inverse of ${r.mask} = ${r.wildcard}`]} />
      <p className="font-medium">2. Network address: IP AND mask</p>
      <Steps lines={[...andLines, `= ${r.network}`]} />
      <p className="font-medium">3. Broadcast address: set every host bit to 1</p>
      <Steps lines={[`Network bits stay the same, the last ${hostBits} bits become 1`, `${r.binary.broadcast}`, `= ${r.broadcast}`]} />
      <p className="font-medium">4. Addresses and hosts</p>
      <Steps
        lines={[
          `Total addresses = 2^${hostBits} = ${fmt(r.totalAddresses)}`,
          r.prefix >= 31 ? `A /${r.prefix} is a special case: usable hosts = ${r.usableHosts}` : `Usable hosts = 2^${hostBits} - 2 = ${fmt(r.usableHosts)}`,
          `First host = ${r.firstHost}`,
          `Last host = ${r.lastHost}`,
        ]}
      />
      <p className="font-medium">5. Address class</p>
      <p>
        {r.ip} is {describeClass(r.addressClass)}.{' '}
        {r.defaultPrefix !== null
          ? `Its historical default mask is ${r.defaultMask} (/${r.defaultPrefix}). `
          : 'It has no default classful mask. '}
        Classful addressing is historical: when you provide a mask or CIDR prefix, that prefix, not the class, decides where the network boundary is.
      </p>
    </Explain>
  );
}

export default function IpCalculator() {
  const [ip, setIp] = useState('192.168.1.25');
  const [mask, setMask] = useState('255.255.255.0');
  const [submitted, setSubmitted] = useState({ ip: '192.168.1.25', mask: '255.255.255.0' });
  const result = useMemo(() => analyzeInput(submitted.ip, submitted.mask), [submitted]);
  const onSubmit = (e: FormEvent) => { e.preventDefault(); setSubmitted({ ip, mask }); };

  return (
    <PageShell
      path="/ip-calculator"
      h1="IP Calculator: IPv4 subnet calculator"
      lead="Enter an IPv4 address with a subnet mask or CIDR prefix to find its network address, broadcast address, host range, and more, with the binary shown alongside."
    >
      <form onSubmit={onSubmit} className="card grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto] md:items-start" noValidate>
        <Field label="IPv4 address" hint="Example: 192.168.1.25 or 192.168.1.25/24">
          {({ id, describedBy }) => (
            <input id={id} className="input" value={ip} onChange={(e) => setIp(e.target.value)} autoComplete="off" spellCheck={false} aria-describedby={describedBy} />
          )}
        </Field>
        <Field label="Subnet mask or CIDR" hint="Example: 255.255.255.0 or /24">
          {({ id, describedBy }) => (
            <input id={id} className="input" value={mask} onChange={(e) => setMask(e.target.value)} autoComplete="off" spellCheck={false} aria-describedby={describedBy} />
          )}
        </Field>
        <div className="md:pt-6"><button className="btn w-full md:w-auto" type="submit">Calculate</button></div>
      </form>

      <div className="mt-6 space-y-6" aria-live="polite">
        {!result.ok && <ErrorBox>{result.error}</ErrorBox>}
        {result.ok && (() => {
          const r = result.value;
          return (
            <>
              <div>
                <ResultBanner>{r.ip}/{r.prefix} is on network {r.network}/{r.prefix}.</ResultBanner>
                <div className="grid gap-6 lg:grid-cols-2">
                  <ResultCard title="Address and mask">
                    <DefList items={[
                      ['IP address', r.ip],
                      ['Address class', describeClass(r.addressClass)],
                      ['Subnet mask', r.mask],
                      ['CIDR', `/${r.prefix}`],
                      ['Wildcard mask', r.wildcard],
                      ['Default subnet mask', r.defaultMask ? `${r.defaultMask} (/${r.defaultPrefix})` : 'None'],
                    ]} />
                  </ResultCard>
                  <ResultCard title="Network range">
                    <DefList items={[
                      ['Network address', r.network],
                      ['First usable host', r.firstHost],
                      ['Last usable host', r.lastHost],
                      ['Broadcast address', r.broadcast],
                      ['Total addresses', fmt(r.totalAddresses)],
                      ['Usable hosts', fmt(r.usableHosts)],
                    ]} />
                  </ResultCard>
                </div>
                {r.note && <p className="mt-3 rounded border border-blue-200 bg-tint/50 px-4 py-2 text-sm text-navy">{r.note}</p>}
              </div>

              <ResultCard title="Binary representation">
                <p className="mb-3 text-sm text-slate-600">
                  <span className="bg-tint px-1 font-mono text-navy">Shaded bits</span> are the {r.prefix} network bits. The rest are the {32 - r.prefix} host bits.
                </p>
                <TableWrap caption="Binary form of the IP address, subnet mask, network address, and broadcast address">
                  <thead><tr><th scope="col" className={th}>Value</th><th scope="col" className={th}>Binary</th></tr></thead>
                  <tbody>
                    {([['IP address', r.binary.ip], ['Subnet mask', r.binary.mask], ['Network address', r.binary.network], ['Broadcast address', r.binary.broadcast]] as const).map(([k, b]) => (
                      <tr key={k}><th scope="row" className={`${td} font-sans font-medium`}>{k}</th><td className={td}><BitString binary={b} prefix={r.prefix} /></td></tr>
                    ))}
                  </tbody>
                </TableWrap>
              </ResultCard>
              <Explanation r={r} />
            </>
          );
        })()}
      </div>

      <div className="prose-bp mt-8">
        <h2>What is an IP calculator?</h2>
        <p>An IP calculator, also called an IPv4 subnet calculator, takes an address and a mask and works out everything that follows from them: which network the address belongs to, the range of hosts on that network, and the broadcast address. Doing this by hand is a core networking skill, and this tool shows each step so you can check your own working.</p>
        <h2>What is an IPv4 address?</h2>
        <p>An IPv4 address is a 32-bit number written as four octets separated by dots, for example <code>192.168.1.25</code>. Each octet is 8 bits, so it ranges from 0 to 255. If binary conversion is new to you, start with the <Link to="/binary-lab">Binary Lab</Link>.</p>
        <h2>What is a subnet mask?</h2>
        <p>A subnet mask separates the network portion of an address from the host portion. In binary it is a run of 1s followed by a run of 0s. The mask <code>255.255.255.0</code> is 24 ones and 8 zeros, so the first 24 bits identify the network and the last 8 identify the host.</p>
        <h2>What is CIDR?</h2>
        <p>CIDR (Classless Inter-Domain Routing) notation writes the mask as a slash and the number of network bits. <code>/24</code> means the same as <code>255.255.255.0</code>, and <code>/26</code> means <code>255.255.255.192</code>. CIDR replaced the old class-based system, which is why the prefix you supply matters more than the address class.</p>
        <h2>How to calculate a network address</h2>
        <p>Convert the address and mask to binary and AND them together. Any bit where the mask is 0 becomes 0. For 192.168.1.25 with /24, the last octet 25 (<code>00011001</code>) is ANDed with 0 and becomes 0, giving 192.168.1.0.</p>
        <h2>How to find a broadcast address</h2>
        <p>Keep the network bits and turn every host bit into 1. For 192.168.1.0/24 the last octet becomes <code>11111111</code>, which is 255, so the broadcast address is 192.168.1.255.</p>
        <h2>How are usable hosts calculated?</h2>
        <p>With h host bits there are 2<sup>h</sup> addresses. The first is the network address and the last is the broadcast address, so usable hosts = 2<sup>h</sup> - 2. For /24, h = 8, so 256 - 2 = 254. Two exceptions: a /31 has 2 usable addresses for point-to-point links, and a /32 is a single host.</p>
        <h2>How this IP calculator works</h2>
        <p>All calculations run in your browser using fixed rules, with no server and no AI. The same 32-bit arithmetic is written out step by step under “How was this calculated?” using your own numbers.</p>
      </div>
      <Faq path="/ip-calculator" />
      <NextStep to="/custom-subnet" label="Try the Custom Subnet Calculator">Want to determine a subnet mask based on host requirements?</NextStep>
    </PageShell>
  );
}
