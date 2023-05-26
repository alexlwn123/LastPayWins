import { useEffect, useState } from 'react';
import styles from './input.module.css';
import { RevolvingDot } from "react-loader-spinner";
import Check from '@/components/icons/Check';
import X from '@/components/icons/X';

export default function Input({ placeholder, onChange, value, isValidAddress, isValidating }) {

  const dot = () => <RevolvingDot radius={10} height={20} width={20}/>;
  const [icon, setIcon] = useState(dot);

  useEffect(() => {
    if (!value) setIcon(<></>);
    else if (isValidating) setIcon(dot);
    else if (isValidAddress) setIcon(<Check />);
    else setIcon(<X />);
    
  }, [isValidAddress, isValidating, value])

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

        {/* {isValidating &&  */}
        <div 
          className={styles.icon}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
