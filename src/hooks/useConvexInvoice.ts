"use client";

import { useAction, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { api } from "../../convex/_generated/api";

type UseConvexInvoiceProps = {
  userAddress: string | null;
  isValidAddress: boolean;
};

export const useConvexInvoice = ({
  userAddress,
  isValidAddress,
}: UseConvexInvoiceProps) => {
  const createInvoice = useAction(api.invoiceActions.create);

  // Track creation to prevent duplicate calls
  const creatingRef = useRef(false);
  // Track which address we created for
  const createdForRef = useRef<string | null>(null);
  // Track previous invoice hash for detecting settlement
  const prevHashRef = useRef<string | null>(null);
  // Track previous address for detecting changes
  const prevAddressRef = useRef<string | null>(null);

  // Subscribe to pending invoice for this user
  const pendingInvoice = useQuery(
    api.invoices.getPending,
    userAddress && isValidAddress ? { lnAddress: userAddress } : "skip",
  );

  // Handle invoice creation and settlement detection
  useEffect(() => {
    // Reset refs when address changes
    if (prevAddressRef.current !== userAddress) {
      prevAddressRef.current = userAddress;
      createdForRef.current = null;
      prevHashRef.current = null;
    }

    // Skip if no valid address or query is still loading
    if (!userAddress || !isValidAddress || pendingInvoice === undefined) {
      return;
    }

    // Detect settlement: had an invoice, now it's gone
    if (prevHashRef.current !== null && pendingInvoice === null) {
      toast("Bid Received! You're in the lead!", { type: "success" });
      createdForRef.current = null; // Reset to allow new invoice
    }

    // Update tracking
    prevHashRef.current = pendingInvoice?.paymentHash ?? null;

    // Create invoice if needed
    const shouldCreate =
      pendingInvoice === null &&
      !creatingRef.current &&
      createdForRef.current !== userAddress;

    if (shouldCreate) {
      creatingRef.current = true;
      createdForRef.current = userAddress;

      createInvoice({ lnAddress: userAddress })
        .catch((error) => {
          console.error("Failed to create invoice:", error);
          createdForRef.current = null; // Allow retry
        })
        .finally(() => {
          creatingRef.current = false;
        });
    }
  }, [userAddress, isValidAddress, pendingInvoice, createInvoice]);

  return {
    invoice: pendingInvoice?.paymentRequest ?? null,
    isLoading: userAddress && isValidAddress && pendingInvoice === undefined,
  };
};
