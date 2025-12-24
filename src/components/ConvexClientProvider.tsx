"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { NEXT_PUBLIC_CONVEX_URL } from "@/lib/publicEnvs";

const convex = new ConvexReactClient(NEXT_PUBLIC_CONVEX_URL);

type Props = {
  children: ReactNode;
};

export const ConvexClientProvider = ({ children }: Props) => {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
};
