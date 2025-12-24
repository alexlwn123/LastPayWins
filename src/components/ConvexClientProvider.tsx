"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convex = new ConvexReactClient(convexUrl);

type Props = {
  children: ReactNode;
};

export const ConvexClientProvider = ({ children }: Props) => {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
};
