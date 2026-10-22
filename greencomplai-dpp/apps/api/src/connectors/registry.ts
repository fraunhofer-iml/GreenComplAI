import type { Connector } from "@dpp/connector-sdk";
import { simplConnector } from "@dpp/connector-simpl";

// Which connector modules this instance knows about.
//
// This list lives in code, not in the database: a connector is executable code,
// and what an instance can run is decided at deploy time, not at runtime via a
// form. What a *tenant* actually uses, however, does live in the database
// (organization_connectors) - that is the split "installable" means here: the
// operator ships it, the organization opts in.
//
// Adding a connector is therefore one line here plus a file next to it.
const BUILT_IN: Connector[] = [simplConnector];

const connectors = new Map<string, Connector>(
  BUILT_IN.map((connector) => [connector.manifest.key, connector]),
);

export function listConnectors(): Connector[] {
  return [...connectors.values()].sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
}

export function getConnector(key: string): Connector | undefined {
  return connectors.get(key);
}

// For tests and for connectors that aren't in `BUILT_IN` (e.g. because they
// come from a separately licensed package). A duplicate key is a programming
// error and is reported as one - two connectors under the same key would mean
// stored credentials end up at a different target depending on load order.
export function registerConnector(connector: Connector): void {
  const existing = connectors.get(connector.manifest.key);
  if (existing && existing !== connector) {
    throw new Error(
      `A different connector is already registered under "${connector.manifest.key}"`,
    );
  }

  connectors.set(connector.manifest.key, connector);
}

export function unregisterConnector(key: string): void {
  connectors.delete(key);
}
