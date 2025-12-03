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

export default function Input({
  placeholder,
  onChange,
  value,
  isValidAddress,
  isValidating,
}: InputProps) {
  const icon = useMemo(() => {
    if (!value) return null;
    if (isValidating)
      return <RevolvingDot radius={10} height={20} width={20} />;
    if (isValidAddress) return <Check />;
    return <X />;
  }, [isValidAddress, isValidating, value]);

  return (
    <div className={styles.container}>
      <div
        className={styles.input}
        title={isValidAddress ? "Valid address" : "Invalid address"}
        data-delay="0"
        data-show="true"
      >
        <input
          type="text"
          placeholder={placeholder}
          onChange={onChange}
          value={value}
        />

        <div className={styles.icon}>{icon}</div>
      </div>
    </div>
  );
}
