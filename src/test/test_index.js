import assert from 'assert';

import * as coinbase from '../api/coinbase';
import * as kraken from '../api/kraken';
import * as gdax from '../api/gdax';
import * as main from '../index';
import { fees, sendFee } from './../utils/fees';

const exchanges = [
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

describe('main', () => {
  describe('setup', () => {
    describe('setup exchange data', () => {
      it('should set products', async () => {
        const exes = await main.setProducts(exchanges);
        for (let i = 0; i < exes.length; i += 1) {
          assert.ok(exes[i].products.length > 8 || Object.keys(exes[i].products).length > 8);
        }
      });
      it('should set accounts', async () => {
        const exes = await main.setAccounts(exchanges);
        for (let i = 0; i < exes.length; i += 1) {
          assert.ok(exes[i].appData.accounts.length > 2 || Object.keys(exes[i].appData.accounts).length > 2);
          assert.ok(exes[i].accounts.length > 3 || Object.keys(exes[i].accounts).length > 3);
        }
      });
      it('should set order book', async () => {
        const depth = 50;
        const exes = await main.setOrderBook(exchanges, depth);
        for (let i = 0; i < exes.length; i += 1) {
          assert.ok(exes[i].orderBook.length > 3);
          assert.ok(Object.keys(exes[i].appData.orderBook).length > 3);
          assert.ok(exes[i].appData.orderBook['BTC-USD'].asks.length > 45);
        }
      });
    });
  });
  describe('gdax', () => {
    describe('utilities', () => {
      it('should get exchange by id', () => {
        const id = 'gdax';
        const ex = main.exchangeById(id, exchanges);
        assert.equal(ex.id, id);
      });
    });
    describe('get product info', () => {
      it('get trading fee', () => {
        const pair = 'LTC-USD';
        const amount = 1;
        const maker = false;
        const id = 'gdax';
        const exchange = main.exchangeById(id, exchanges);
        const fee = main.tradingFee(pair, amount, maker, exchange);
        assert.equal(fee, 0.003);
      });
      it('get trade info', () => {
        const heldProduct = { currency: 'BTC', amount: 1 };
        const pairInfo = { pair: 'LTC-BTC', asks: [[10]], bids: [[10]] };
        const id = 'gdax';
        const exchange = main.exchangeById(id, exchanges);
        const tradeInfo = main.tradeInfo(heldProduct, pairInfo, exchange);
        assert.equal(tradeInfo.currency, 'LTC');
        assert.equal(typeof (tradeInfo.amount), 'number');
      });
      it('get trade info', () => {
        const heldProduct = { currency: 'BTC', amount: 1 };
        const pairInfo = { pair: 'LTC-BTC', asks: [[10]], bids: [[10]] };
        const id = 'gdax';
        const exchange = main.exchangeById(id, exchanges);
        const tradeInfo = main.tradeInfo(heldProduct, pairInfo, exchange);
        assert.equal(typeof (tradeInfo.amount), 'number');
      });
      it('get fiat value', () => {
        const fiatCurrency = 'USD';
        const currency = 'BTC';
        const amount = 1;
        const id = 'gdax';
        const exchange = main.exchangeById(id, exchanges);
        const fiatValue = main.fiatValue(fiatCurrency, currency, amount, exchange);
        assert.equal(typeof (fiatValue), 'number');
      });
    });
  });
  describe('kraken', () => {
    describe('utilities', () => {
      it('should get exchange by id', () => {
        const id = 'kraken';
        const ex = main.exchangeById(id, exchanges);
        assert.equal(ex.id, id);
      });
    });
    describe('get product info', () => {
      it('get trading fee', () => {
        const pair = 'LTC-USD';
        const amount = 1;
        const maker = false;
        const id = 'kraken';
        const exchange = main.exchangeById(id, exchanges);
        const fee = main.tradingFee(pair, amount, maker, exchange);
        assert.ok(fee > 0.0001);
      });
      it('get trade info', () => {
        const heldProduct = { currency: 'BTC', amount: 1 };
        const pairInfo = { pair: 'LTC-BTC', asks: [[10]], bids: [[10]] };
        const id = 'kraken';
        const exchange = main.exchangeById(id, exchanges);
        const tradeInfo = main.tradeInfo(heldProduct, pairInfo, exchange);
        assert.equal(tradeInfo.currency, 'LTC');
        assert.equal(typeof (tradeInfo.amount), 'number');
      });
      it('get trade info', () => {
        const heldProduct = { currency: 'BTC', amount: 1 };
        const pairInfo = { pair: 'LTC-BTC', asks: [[10]], bids: [[10]] };
        const id = 'kraken';
        const exchange = main.exchangeById(id, exchanges);
        const tradeInfo = main.tradeInfo(heldProduct, pairInfo, exchange);
        assert.equal(typeof (tradeInfo.amount), 'number');
      });
      it('get fiat value', () => {
        const fiatCurrency = 'USD';
        const currency = 'BTC';
        const amount = 1;
        const id = 'kraken';
        const exchange = main.exchangeById(id, exchanges);
        const fiatValue = main.fiatValue(fiatCurrency, currency, amount, exchange);
        assert.equal(typeof (fiatValue), 'number');
      });
    });
  });
  describe('execute', () => {
    it('send from gdax to kraken', async () => {
      const currency = 'LTC';
      const amount = 0.01;
      const fromExchange = main.exchangeById('gdax', exchanges);
      const toExchange = main.exchangeById('kraken', exchanges);
      const response = await main.sendToExchange(currency, amount, fromExchange, toExchange);
      console.log(response);
    });
    it('send from kraken to gdax', async () => {
      const currency = 'LTC';
      const amount = 0.01;
      const fromExchange = main.exchangeById('kraken', exchanges);
      const toExchange = main.exchangeById('gdax', exchanges);
      const response = await main.sendToExchange(currency, amount, fromExchange, toExchange);
      console.log(response);
    });
    it('order on kraken', async () => {
      const fromCurrency = 'LTC';
      const toCurrency = 'BTC';
      const amount = 0.01;
      const side = 'buy';
      const exchange = main.exchangeById('kraken', exchanges);
      const response = await main.order(fromCurrency, toCurrency, amount, side, exchange);
      console.log(response);
    });
    it('order on gdax', async () => {
      const fromCurrency = 'LTC';
      const toCurrency = 'BTC';
      const amount = 0.01;
      const side = 'buy';
      const exchange = main.exchangeById('gdax', exchanges);
      const response = await main.order(fromCurrency, toCurrency, amount, side, exchange);
      console.log(response);
    });
  });
});
