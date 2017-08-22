import * as gdax from '../api/gdax';
import * as coinbase from '../api/coinbase';
import * as kraken from '../api/kraken';
import { fees, sendFee } from '../utils/fees';

export const exchangesConfig = [
  {
    id: 'gdax',
    api: { ...gdax },
    coinbase: {
      id: 'coinbase',
      api: { ...coinbase },
    },
    fees: fees.gdax,
    appData: {},
    orderBook: [],
  },
  {
    id: 'kraken',
    api: { ...kraken },
    fees: fees.kraken,
    appData: {},
    orderBook: [],
  },
];
