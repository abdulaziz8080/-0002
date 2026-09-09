"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Item, type Org } from "./api";

export type { Item, Org };

export type OrgInput = {
  name: string;
  crNumber?: string;
  city?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  alertPhones?: string;
  notifyEnabled?: boolean;
};

export type ItemInput = { templateId: string; dueDate: string; note?: string; reference?: string };

export type ItemPatch = Partial<
  Pick<Item, "dueDate" | "note" | "reference" | "done" | "estimatedCost" | "leadDays" | "cycleDays">
>;

export type OrgsStore = ReturnType<typeof useOrgs>;

export function useOrgs() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { orgs } = await api<{ orgs: Org[] }>("/orgs");
      setOrgs(orgs);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر تحميل البيانات");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addOrg = useCallback(async (input: OrgInput) => {
    const { org } = await api<{ org: Org }>("/orgs", { method: "POST", body: JSON.stringify(input) });
    setOrgs((prev) => [...prev, org]);
    return org;
  }, []);

  const updateOrg = useCallback(async (orgId: string, input: Partial<OrgInput>) => {
    const { org } = await api<{ org: Org }>(`/orgs/${orgId}`, { method: "PATCH", body: JSON.stringify(input) });
    setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, ...org, items: o.items } : o)));
  }, []);

  const removeOrg = useCallback(async (orgId: string) => {
    await api(`/orgs/${orgId}`, { method: "DELETE" });
    setOrgs((prev) => prev.filter((o) => o.id !== orgId));
  }, []);

  const addItem = useCallback(async (orgId: string, input: ItemInput) => {
    const { item } = await api<{ item: Item }>(`/orgs/${orgId}/items`, { method: "POST", body: JSON.stringify(input) });
    setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, items: [...o.items, item] } : o)));
  }, []);

  const replaceItem = (orgId: string, item: Item) =>
    setOrgs((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, items: o.items.map((it) => (it.id === item.id ? item : it)) } : o)),
    );

  const updateItem = useCallback(async (orgId: string, itemId: string, patch: ItemPatch) => {
    const { item } = await api<{ item: Item }>(`/orgs/${orgId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    replaceItem(orgId, item);
  }, []);

  const renewItem = useCallback(async (orgId: string, itemId: string) => {
    const { item } = await api<{ item: Item }>(`/orgs/${orgId}/items/${itemId}/renew`, { method: "POST" });
    replaceItem(orgId, item);
  }, []);

  const removeItem = useCallback(async (orgId: string, itemId: string) => {
    await api(`/orgs/${orgId}/items/${itemId}`, { method: "DELETE" });
    setOrgs((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, items: o.items.filter((it) => it.id !== itemId) } : o)),
    );
  }, []);

  return { orgs, loaded, error, refresh, addOrg, updateOrg, removeOrg, addItem, updateItem, renewItem, removeItem };
}
