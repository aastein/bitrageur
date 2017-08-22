// send fees are an amount, not a percent
export const fees = {
  gdax: {
    coinbase: {
      LTC: {
        send: 0.00023225,
      },
      BTC: {
        send: 0.00037251,
      },
      ETH: {
        send: 0.00045006,
      },
    },
  },
  kraken: {
    LTC: {
      send: 0.00500,
    },
    BTC: {
      send: 0.00500,
    },
    ETH: {
      send: 0.02000,
    },
  },
};

export const sendFee = (product, exchangeId) => (
  exchangeId === 'gdax' ? fees[exchangeId].coinbase[product].send : fees[exchangeId][product].send
);
