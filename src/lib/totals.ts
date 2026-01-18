export type Totals = {
  left: number;
  right: number;
  lastUpdated: number;
};

type Store = {
  totals: Totals;
};

const defaultTotals: Totals = {
  left: 0,
  right: 0,
  lastUpdated: Date.now(),
};

function getStore(): Store {
  const globalRef = globalThis as typeof globalThis & { __fundingTotals?: Store };
  if (!globalRef.__fundingTotals) {
    globalRef.__fundingTotals = { totals: defaultTotals };
  }
  return globalRef.__fundingTotals;
}

export function getTotals(): Totals {
  return getStore().totals;
}

export function addToTotals(side: "left" | "right", amount: number): Totals {
  const store = getStore();
  const nextTotals = {
    left: store.totals.left + (side === "left" ? amount : 0),
    right: store.totals.right + (side === "right" ? amount : 0),
    lastUpdated: Date.now(),
  };
  store.totals = nextTotals;
  return nextTotals;
}
