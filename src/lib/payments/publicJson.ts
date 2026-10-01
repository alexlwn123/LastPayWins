import "server-only";
import { lookup } from "node:dns/promises";
import { get } from "node:https";
import ipaddr from "ipaddr.js";

export function isPublicAddress(address: string) {
  return (
    ipaddr.isValid(address) && ipaddr.process(address).range() === "unicast"
  );
}

export function publicJson(url: URL): Promise<unknown> {
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  )
    throw new Error("Invalid LNURL callback URL");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (ipaddr.isValid(host) && !isPublicAddress(host))
    throw new Error("Private LNURL destinations are not allowed");
  return new Promise((resolve, reject) => {
    const request = get(
      url,
      {
        agent: false,
        signal: AbortSignal.timeout(10000),
        headers: { Accept: "application/json" },
        lookup: (hostname, options, callback) => {
          void lookup(hostname, { all: true })
            .then((addresses) => {
              if (
                !addresses.length ||
                addresses.some(({ address }) => !isPublicAddress(address))
              ) {
                callback(
                  new Error("Private LNURL destinations are not allowed"),
                  "",
                );
              } else if (options.all) {
                callback(null, addresses);
              } else {
                callback(null, addresses[0].address, addresses[0].family);
              }
            })
            .catch((error) => callback(error, ""));
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error("LNURL service unavailable"));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 65536) {
            request.destroy(new Error("LNURL response too large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            reject(new Error("Invalid LNURL response"));
          }
        });
      },
    );
    request.on("error", reject);
  });
}
