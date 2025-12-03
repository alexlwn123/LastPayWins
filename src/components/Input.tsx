"use client";

import { useMemo } from "react";
import { RevolvingDot } from "react-loader-spinner";
import Check from "@/components/icons/Check";
import X from "@/components/icons/X";
import styles from "./input.module.css";

type InputProps = {
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
  isValidAddress: boolean;
  isValidating: boolean;
};

const Input = ({
  placeholder,
  onChange,
  value,
  isValidAddress,
  isValidating,
}: InputProps) => {
  const icon = useMemo(() => {
    if (!value) return null;
    if (isValidating)
      return (
        <RevolvingDot
          radius={10}
          height={20}
          width={20}
          color="var(--bitcoin-orange)"
        />
      );
    if (isValidAddress) return <Check />;
    return <X />;
  }, [isValidAddress, isValidating, value]);

  const inputStateClass = useMemo(() => {
    if (!value || isValidating) return "";
    return isValidAddress ? styles.valid : styles.invalid;
  }, [value, isValidating, isValidAddress]);

  return (
    <div className={styles.container}>
      <div
        className={`${styles.input} ${inputStateClass}`}
        title={isValidAddress ? "Valid address" : "Invalid address"}
      >
        <input
          type="text"
          placeholder={placeholder}
          onChange={onChange}
          value={value}
          aria-label="Lightning address"
          autoComplete="email"
        />
        <div className={styles.icon}>{icon}</div>
      </div>
    </div>
  );
};

export default Input;
