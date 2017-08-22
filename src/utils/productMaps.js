export const pairMap = {
  'LTC-BTC': {
    gdax: 'LTC-BTC',
    kraken: 'XLTCXXBT',
  },
  'ETH-BTC': {
    gdax: 'ETH-BTC',
    kraken: 'XETHXXBT',
  },
  'LTC-USD': {
    gdax: 'LTC-USD',
    kraken: 'XLTCZUSD',
  },
  'BTC-USD': {
    gdax: 'BTC-USD',
    kraken: 'XXBTZUSD',
  },
  'ETH-USD': {
    gdax: 'ETH-USD',
    kraken: 'XETHZUSD',
  },
};

export const productMap = {
  LTC: {
    gdax: 'LTC',
    kraken: 'XLTC',
  },
  ETH: {
    gdax: 'ETH',
    kraken: 'XETH',
  },
  USD: {
    gdax: 'USD',
    kraken: 'ZUSD',
  },
  BTC: {
    gdax: 'BTC',
    kraken: 'XXBT',
  },
};

const exchangeError = new Error('Exchange is not defined dummy');

// get general product name from exchange product name
export const convertProduct = (product, exchange) => {
  if (!exchange) throw exchangeError;
  return Object.keys(productMap).reduce((a, b) => (
    productMap[b][exchange] === product ? b : a
  ), '');
};

// get exchange product name from general name
export const reverseConvertProduct = (product, exchange) => {
  if (!exchange) throw exchangeError;
  return Object.keys(productMap).reduce((a, b) => (
    b === product ? productMap[b][exchange] : a
  ), '');
};

// get general pair name from exchange product name
export const convertPair = (pair, exchange) => {
  if (!exchange) throw exchangeError;
  return Object.keys(pairMap).reduce((a, b) => (
    pairMap[b][exchange] === pair ? b : a
  ), '');
};

// get exchange pair name from general pair name
export const reverseConvertPair = (pair, exchange) => {
  if (!exchange) throw exchangeError;
  return Object.keys(pairMap).reduce((a, b) => (
    b === pair ? pairMap[b][exchange] : a
  ), '');
};

// get exchange pair name for general currency names
export const findPairByExchange = (currencyA, currencyB, exchange) => {
  if (!exchange) throw exchangeError;
  return Object.keys(pairMap).reduce((a, b) => (
    b.includes(currencyA) && b.includes(currencyB) ? pairMap[b][exchange] : a
  ), '');
};

// get general pair name
export const findPair = (currencyA, currencyB) => (
  Object.keys(pairMap).reduce((a, b) => (
    b.includes(currencyA) && b.includes(currencyB) ? b : a
  ), '')
);

// get all general pairs
export const productPairs = exchange => (
  Object.keys(pairMap).map(p => (
    pairMap[p][exchange]
  ))
);
