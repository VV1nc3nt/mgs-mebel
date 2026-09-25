export type Counter = { created: number; updated: number; skipped: number }

/** created / updated / skipped per collection or global, printed at the end of a run. */
export class SeedStats {
  private rows = new Map<string, Counter>()

  add(name: string, result: keyof Counter) {
    const row = this.rows.get(name) ?? { created: 0, updated: 0, skipped: 0 }
    row[result] += 1
    this.rows.set(name, row)
  }

  table(): string {
    const lines = [...this.rows].map(
      ([name, { created, updated, skipped }]) =>
        `${name.padEnd(14)} created ${String(created).padStart(3)}  updated ${String(updated).padStart(3)}  skipped ${String(skipped).padStart(3)}`,
    )
    return lines.join('\n')
  }
}
