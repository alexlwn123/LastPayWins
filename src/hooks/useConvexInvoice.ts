"use client";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useUuid } from "@/components/UuidProvider";
import { api } from "../../convex/_generated/api";

export const useConvexInvoice = ({
  isValidAddress,
  lnAddress,
}: {
  isValidAddress: boolean;
  lnAddress: string;
}) => {
  const uuid = useUuid();
  const requestInvoice = useMutation(api.invoices.requestInvoice);
  const state = useQuery(
    api.invoices.getInvoiceState,
    uuid && isValidAddress ? { uuid } : "skip",
  );
  const [error, setError] = useState<string | null>(null);
  const lastSeen = useRef<number | null>(null);
  useEffect(() => {
    if (!uuid || !isValidAddress) return;
    let active = true;
    const refresh = async () => {
      try {
        await requestInvoice({ uuid, lnAddress });
        if (active) setError(null);
      } catch {
        if (active)
          setError("Unable to create an invoice. Payments may be paused.");
      }
    };
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [uuid, isValidAddress, lnAddress, requestInvoice]);
  useEffect(() => {
    if (!state?.lastSettledAt) return;
    if (lastSeen.current !== null && state.lastSettledAt > lastSeen.current)
      toast("Payment confirmed.", {
        type: "success",
      });
    lastSeen.current = state.lastSettledAt;
  }, [state?.lastSettledAt]);
  const matching = state?.lnAddress === lnAddress.trim().toLowerCase();
  return {
    invoice: matching ? (state?.paymentRequest ?? null) : null,
    checkoutId: matching ? (state?.checkoutId ?? null) : null,
    simulation: state?.simulation ?? false,
    error: error ?? state?.error ?? null,
    expiresAt: state?.expiresAt ?? null,
    status: state?.status ?? null,
    amount: matching ? (state?.amount ?? null) : null,
    bidAmount: matching ? (state?.bidAmount ?? null) : null,
  };
};
