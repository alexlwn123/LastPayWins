import "server-only";

type LnurlPayResponse = {
  callback: string;
  commentAllowed?: number;
  maxSendable: number;
  metadata: string;
  minSendable: number;
  tag?: string;
};

export type ScanResult =
  | {
      status: "OK";
      callback: string;
      commentAllowed?: number;
      domain: string;
      maxSendable: number;
      metadata: string;
      minSendable: number;
    }
  | { error: string; status: "failed" };

const getLightningAddressUrl = (address: string) => {
  const [name, host] = address.trim().toLowerCase().split("@");
  if (
    !name ||
    !host ||
    !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host.endsWith(".local")
  )
    throw new Error("Invalid Lightning address");
  return {
    domain: host,
    url: `https://${host}/.well-known/lnurlp/${encodeURIComponent(name)}`,
  };
};

export const readLnurl = async (lnurl: string): Promise<ScanResult> => {
  try {
    const { domain, url } = getLightningAddressUrl(lnurl);
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
      redirect: "error",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return { error: response.statusText, status: "failed" };
    }

    const result = (await response.json()) as
      | (LnurlPayResponse & { status?: string; reason?: string })
      | { status?: string; reason?: string };

    if (
      "status" in result &&
      result.status === "ERROR" &&
      typeof result.reason === "string"
    ) {
      return { error: result.reason, status: "failed" };
    }

    if (
      !("callback" in result) ||
      !("minSendable" in result) ||
      !("maxSendable" in result) ||
      !("metadata" in result) ||
      result.tag !== "payRequest"
    ) {
      return { error: "Invalid lightning address response", status: "failed" };
    }

    return {
      callback: result.callback,
      commentAllowed: result.commentAllowed,
      domain,
      maxSendable: result.maxSendable,
      metadata: result.metadata,
      minSendable: result.minSendable,
      status: "OK",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      status: "failed",
    };
  }
};
