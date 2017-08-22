import assert from 'assert';

import * as gdax from '../gdax';
import { addresses } from '../../../config/private/addresses';
import { config } from '../../../config/private/test';
import { productMap, pairMap, convertProduct, productPairs, convertPair, reverseConvertPair, reverseConvertProduct, findPair } from './../../utils/productMaps';

const exchangeId = 'gdax';

describe('gdax api', () => {

  describe('products', () => {
    it('should get products', async () => {
      const response = await gdax.products();
      const expectedKeys = ['id', 'base_currency', 'quote_currency', 'base_min_size', 'base_max_size', 'quote_increment', 'display_name', 'margin_enabled'];
      assert.equal(JSON.stringify(Object.keys(response[0])), JSON.stringify(expectedKeys));
    });
  });

  describe('order book', () => {
    it('should get order book for LTC', async () => {
      const pair = 'LTC-BTC';
      const response = await gdax.orderbook(pair);
      assert.equal(typeof response.bid, 'number');
      assert.equal(typeof response.ask, 'number');
    });
  });

  describe('accounts', () => {
    it('should get accounts', async () => {
      const response = await gdax.getAccounts();
      const expectedKeys = ['id', 'currency', 'balance', 'available', 'hold', 'profile_id'];
      assert.equal(JSON.stringify(Object.keys(response[0])), JSON.stringify(expectedKeys));
    });
  });

  describe('deposit from coinbase', () => {
    it('should deposit LTC from coinbase', async () => {
      const currency = 'LTC';
      const amount = 0.001;
      const response = await gdax.deposit(currency, amount);
      const expectedKeys = ['id', 'details', 'ledger_id'];
      assert.equal(JSON.stringify(Object.keys(response)), JSON.stringify(expectedKeys));
    });
  });

  describe('withdrawl to coinbase', () => {
    it('should withdrawl LTC to coinbase', async () => {
      const currency = 'LTC';
      const amount = 0.001;
      const response = await gdax.withdrawal(currency, amount);
      const expectedKeys = ['id', 'details', 'ledger_id'];
      assert.equal(JSON.stringify(Object.keys(response)), JSON.stringify(expectedKeys));
    });
  });

  describe('order', () => {
    it('should not place invalid market buy order', async () => {
      const pair = 'LTC-BTC';
      const ordertype = 'market';
      const volume = '0.001'; // LTC
      const response = await gdax.buy(pair, ordertype, volume);
      assert.equal(typeof response.message, 'string');
    });
    it('should not place invalid market sell order', async () => {
      const pair = 'LTC-BTC';
      const ordertype = 'market';
      const volume = '0.001'; // LTC
      const response = await gdax.sell(pair, ordertype, volume);
      assert.equal(typeof response.message, 'string');
    });
    it('should not place invalid market sell order', async () => {
      const pair = 'LTCBTC';
      const ordertype = 'market';
      const volume = '0.01'; // LTC
      const response = await gdax.sell(pair, ordertype, volume);
      assert.equal(typeof response.message, 'string');
    });
    it('should deposit, sell market order, wait, withdrawal', async () => {
      // deposit params
      const currency = 'LTC';
      const amount = 0.01;
      // order params
      const pair = 'LTC-BTC';
      const ordertype = 'market';
      const side = 'sell';
      const expectedKeys = ['id', 'details', 'ledger_id'];
      const response = await gdax.depositOrderWaitWithdrawl(pair, side, ordertype, amount);
      assert.equal(JSON.stringify(Object.keys(response)), JSON.stringify(expectedKeys));
    });
    it('should deposit, buy market order, wait, withdrawal', async () => {
      // deposit params
      const currency = 'BTC';
      const amount = 0.001;
      // order params
      const pair = 'LTC-BTC';
      const side = 'buy';
      const ordertype = 'market';
      const expectedKeys = ['id', 'details', 'ledger_id'];
      const response = await gdax.depositOrderWaitWithdrawl(pair, side, ordertype, amount);
      assert.equal(JSON.stringify(Object.keys(response)), JSON.stringify(expectedKeys));
    });
  });
});
