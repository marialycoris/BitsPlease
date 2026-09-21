const PLACES = [128, 64, 32, 16, 8, 4, 2, 1];

/** Eight toggleable bits with their place values and the running sum. */
export function BitBoard({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const on = PLACES.filter((p) => (value & p) !== 0);
  return (
    <div>
      <div role="group" aria-label="Eight bits. Select a bit to switch it on or off." className="grid grid-cols-8 gap-1.5 sm:gap-2">
        {PLACES.map((p) => {
          const set = (value & p) !== 0;
          return (
            <div key={p} className="text-center">
              <div className="mb-1 font-mono text-xs text-slate-600 sm:text-sm">{p}</div>
              <button
                type="button"
                aria-pressed={set}
                aria-label={`Bit worth ${p}, currently ${set ? 1 : 0}`}
                onClick={() => onChange(value ^ p)}
                className={`h-12 w-full rounded border font-mono text-xl font-medium transition-colors sm:h-14 ${
                  set ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-tint/60'
                }`}
              >
                {set ? 1 : 0}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-base text-navy" aria-live="polite">
        {on.length ? `${on.join(' + ')} = ${value}` : '0 = 0'}
      </p>
    </div>
  );
}
