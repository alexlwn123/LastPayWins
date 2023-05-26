import { useEffect } from 'react';
import styles from './input.module.css';
export default function Input({ placeholder, onChange, value }) {
  useEffect(() => {
    const validate = setTimeout(() => {

    }, [value]);
  }, []);

  return (
    <div className={styles.container}>
    <div className={styles.input}>
      <input
        type="text"
        placeholder={placeholder}
        onChange={onChange}
        value={value}
      />
      </div>
    </div>
  );
}
