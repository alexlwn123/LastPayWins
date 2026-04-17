"use client";

import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useUuid } from "@/components/UuidProvider";
import { api } from "../../convex/_generated/api";

type UseConvexInvoiceProps = {
  isValidAddress: boolean;
};

export const useConvexInvoice = ({ isValidAddress }: UseConvexInvoiceProps) => {
  const uuid = useUuid();
  const lastSeenSettledAt = useRef<number | null>(null);

  // Subscribe by session (uuid) - invoice creation handled by presence heartbeat
  const invoiceState = useQuery(
    api.invoices.getInvoiceState,
    uuid && isValidAddress ? { uuid } : "skip",
  );

  // Detect new settlements and show toast
  useEffect(() => {
    if (!invoiceState?.lastSettledAt) return;

    const isNewSettlement =
      lastSeenSettledAt.current !== null &&
      invoiceState.lastSettledAt > lastSeenSettledAt.current;

    if (isNewSettlement) {
      toast("Bid Received! You're in the lead!", { type: "success" });
    }

    lastSeenSettledAt.current = invoiceState.lastSettledAt;
  }, [invoiceState?.lastSettledAt]);

  return {
    invoice: invoiceState?.paymentRequest ?? null,
    isLoading: uuid && isValidAddress && invoiceState === undefined,
  };
};
