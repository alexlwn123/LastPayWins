import { useEffect, useState } from "react";
import { checkInvoiceStatus } from "@/app/utils";

export const useInvoice = ({
  userAddress,
  status,
  setCountdownKey,
  refetch,
  setRefetch,
}: {
  userAddress: string | null;
  status: string;
  setCountdownKey: (key: number) => void;
  refetch: boolean;
  setRefetch: (refetch: boolean) => void;
}) => {
  const [invoice, setInvoice] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [checking, setChecking] = useState(false);

  // Get invoice
  useEffect(() => {
    if (fetching || hash || !refetch) return;
    setFetching(true);
    fetch("/api/invoice", { method: "POST" })
      .then((response) => response.json())
      .then((data) => {
        setInvoice(data.payment_request);
        setHash(data.payment_hash);
        setSettled(false);
        setFetching(false);
        setRefetch(false);
      });
  }, [refetch, hash, fetching, setRefetch]);

  // Check invoice
  useEffect(() => {
    if (settled || !hash || status === "LOADING" || checking || !userAddress)
      return;
    const interval = setInterval(() => {
      if (checking) return;
      checkInvoiceStatus(
        setChecking,
        hash,
        setHash,
        setSettled,
        userAddress,
        setCountdownKey,
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [hash, status, userAddress, settled, checking, setCountdownKey]);

  return { invoice };
};
