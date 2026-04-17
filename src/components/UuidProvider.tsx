"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { v4 } from "uuid";

type Props = {
  children: ReactNode;
};

const UuidContext = createContext<string | null>(null);

export const UuidProvider = ({ children }: Props) => {
  const [uuid, setUuid] = useState<string | null>(null);
  useEffect(() => {
    const existingId = localStorage.getItem("uuid");
    if (existingId) {
      setUuid(existingId);
    } else {
      const id = v4();
      localStorage.setItem("uuid", id);
      setUuid(id);
    }
  }, []);
  return <UuidContext.Provider value={uuid}>{children}</UuidContext.Provider>;
};

export const useUuid = () => {
  return useContext(UuidContext);
};
