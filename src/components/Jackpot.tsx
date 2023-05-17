import { useEffect, useState } from 'react';
import styles from '../app/page.module.css';
import { fromSats } from 'satcomma';
const Jackpot = ({ jackpotSats = 0 }) => { 
  // const jackpot = jackpotSats * 0.00000001 ;
  console.log('jackpot', jackpotSats);
  return (
    <h1 className={styles.jackpot}>₿ {fromSats(jackpotSats)}</h1>
  )
};

export default Jackpot;