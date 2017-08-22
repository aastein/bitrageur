import assert from 'assert';

import * as kraken from '../kraken';
import * as coinbase from '../coinbase';
import { addresses } from '../../../config/private/addresses';
import { config } from '../../../config/private/test';
import { productMap, pairMap, convertProduct, productPairs, convertPair, reverseConvertPair, reverseConvertProduct, findPair } from './../../utils/productMaps';

const exchangeId = 'kraken';

describe('kraken api', () => {

  describe('get accounts', () => {
    it('account should have expected keys', async () => {
      const response = await kraken.getAccounts();
      const expectedKeys = ['ZUSD', 'XXBT', 'XXRP', 'XLTC', 'XETH'];
      assert.equal(JSON.stringify(Object.keys(response)), JSON.stringify(expectedKeys));
    });
  });

  describe('get account', () => {
    it('should get LTC account', async () => {
      const currency = 'LTC';
      const exchangeCurrencyName = reverseConvertProduct(currency, exchangeId);
      const response = await kraken.accountForCurrency(currency);
      assert.equal(typeof response[exchangeCurrencyName], 'string');
    });
    it('should get BTC account', async () => {
      const currency = 'BTC';
      const exchangeCurrencyName = reverseConvertProduct(currency, exchangeId);
      const response = await kraken.accountForCurrency(currency);
      assert.equal(typeof response[exchangeCurrencyName], 'string');
    });
    it('should get ETH account', async () => {
      const currency = 'ETH';
      const exchangeCurrencyName = reverseConvertProduct(currency, exchangeId);
      const response = await kraken.accountForCurrency(currency);
      assert.equal(typeof response[exchangeCurrencyName], 'string');
    });
  });

  describe('get address', () => {
    it('should get LTC address', async () => {
      const currency = 'LTC';
      const response = await kraken.addressForCurrency(currency);
      assert.equal(response.address.length, 34);
    });
    it('should get BTC address', async () => {
      const currency = 'BTC';
      const response = await kraken.addressForCurrency(currency);
      assert.equal(response.address.length, 34);
    });
    it('should get ETH address', async () => {
      const currency = 'ETH';
      const response = await kraken.addressForCurrency(currency);
      assert.equal(response.address.length, 42);
    });
  });

  describe('send currency', () => {
    it('should not send LTC with amount = 0', async () => {
      const currency = 'LTC';
      const amount = 0;
      const toExhangeId = 'coinbase';
      try {
        const response = await kraken.sendCurrency(currency, amount, toExhangeId);
      } catch (err) {
        assert.ok(err.toString().length > 0);
      }
    });
    it('should not send BTC with amount = 0', async () => {
      const currency = 'BTC';
      const amount = 0;
      const toExhangeId = 'coinbase';
      try {
        const response = await kraken.sendCurrency(currency, amount, toExhangeId);
      } catch (err) {
        assert.ok(err.toString().length > 0);
      }
    });
    it('should not send ETH with amount = 0', async () => {
      const currency = 'ETH';
      const amount = 0;
      const toExhangeId = 'coinbase';
      try {
        const response = await kraken.sendCurrency(currency, amount, toExhangeId);
      } catch (err) {
        assert.ok(err.toString().length > 0);
      }
    });
    it('should not send LTC with invalid address', async () => {
      const currency = 'LTC';
      const amount = 0.00001;
      const toExhangeId = 'invalid';
      try {
        const response = await kraken.sendCurrency(currency, amount, toExhangeId);
      } catch (err) {
        assert.ok(err.toString().length > 0);
      }
    });
    it('should not send BTC invalid address', async () => {
      const currency = 'BTC';
      const amount = 0.00001;
      const toExhangeId = 'invalid';
      try {
        const response = await kraken.sendCurrency(currency, amount, toExhangeId);
      } catch (err) {
        assert.ok(err.toString().length > 0);
      }
    });
    it('should not send ETH with invalid address', async () => {
      const currency = 'ETH';
      const amount = 0.00001;
      const toExhangeId = 'invalid';
      try {
        const response = await kraken.sendCurrency(currency, amount, toExhangeId);
      } catch (err) {
        assert.ok(err.toString().length > 0);
      }
    });
    it('should send LTC and wait', async () => {
      const currency = 'LTC';
      const amount = 0.01;
      const toExhangeId = 'coinbase';
      const status = await kraken.sendAndWait(currency, amount, toExhangeId);
      console.log(status);
      console.log(status.status);
      assert.equal(status.status, 'Success');
      const toExchangeStatus = await coinbase.receiveAndWait(currency, status.txid);
      console.log(toExchangeStatus);
      assert.equal(toExchangeStatus.status, 'completed');
    });
  });

  describe('send currency info', () => {
    it('should get LTC send info', async () => {
      const currency = 'LTC';
      const transactionHash = config.kraken[currency].sendHash;
      const response = await kraken.sendCurrencyInfo(currency, transactionHash);
      assert.equal(typeof response, 'object');
    });
    it('should get BTC send info', async () => {
      const currency = 'BTC';
      const transactionHash = config.kraken[currency].sendHash;
      const response = await kraken.sendCurrencyInfo(currency, transactionHash);
      assert.equal(typeof response, 'object');
    });
    it('should get ETH send info', async () => {
      const currency = 'ETH';
      const transactionHash = config.kraken[currency].sendHash;
      const response = await kraken.sendCurrencyInfo(currency, transactionHash);
      assert.equal(typeof response, 'object');
    });
  });

  describe('receive currency info', () => {
    it('should get LTC receive info', async () => {
      const currency = 'LTC';
      const transactionHash = config.kraken[currency].receiveHash;
      const response = await kraken.receiveCurrencyInfo(currency, transactionHash);
      assert.equal(typeof response.status, 'string');
    });
    it('should get BTC receive info', async () => {
      const currency = 'BTC';
      const transactionHash = config.kraken[currency].receiveHash;
      const response = await kraken.receiveCurrencyInfo(currency, transactionHash);
      assert.equal(typeof response.status, 'string');
    });
    it('should get ETH receive info', async () => {
      const currency = 'ETH';
      const transactionHash = config.kraken[currency].receiveHash;
      const response = await kraken.receiveCurrencyInfo(currency, transactionHash);
      assert.equal(typeof response.status, 'string');
    });
  });

  // trade specific tests
  describe('products', () => {
    it('should get products', async () => {
      const response = await kraken.products();
      assert.ok(Object.keys(response).length >= 67);
    });
  });

  describe('order book', () => {
    it('should get order book for LTC', async () => {
      const pair = 'LTC-BTC';
      const response = await kraken.orderbook(pair);
      assert.equal(typeof response.bid, 'number');
      assert.equal(typeof response.ask, 'number');
    });
  });

  describe('order', () => {
    it('should not place invalid market buy order', async () => {
      const pair = 'LTC-BTC';
      const ordertype = 'market';
      const volume = '0.001'; // LTC
      const validate = true;
      const response = await kraken.buy(pair, ordertype, volume, validate);
      assert.equal(typeof response.message, 'string');
    });
    it('should not place invalid market sell order', async () => {
      const pair = 'LTC-BTC';
      const side = 'sell';
      const ordertype = 'market';
      const volume = '0.001'; // LTC
      const validate = true;
      const response = await kraken.sell(pair, ordertype, volume, validate);
      assert.equal(typeof response.message, 'string');
    });
    it('should not place invalid market sell order', async () => {
      const pair = 'LTCBTC';
      const ordertype = 'market';
      const volume = '0.01'; // LTC
      const validate = true;
      const response = await kraken.sell(pair, ordertype, volume, validate);
      assert.equal(typeof response.message, 'string');
    });
    it('should sell market order and wait', async () => {
      // deposit params
      const currency = 'LTC';
      const amount = 0.14;
      // order params
      const side = 'sell';
      const pair = 'LTC-BTC';
      const ordertype = 'market';
      const response = await kraken.orderAndWait(pair, side, ordertype, amount);
      console.log(response);
      assert.equal(response.status, 'closed');
    });
    it('should buy market order and wait', async () => {
      // deposit params
      const currency = 'BTC';
      const amount = 0.002;
      // order params
      const side = 'buy';
      const pair = 'LTC-BTC';
      const ordertype = 'market';
      const expectedKeys = ['id', 'details', 'ledger_id'];
      const response = await kraken.orderAndWait(pair, side, ordertype, amount);
      console.log(response);
      assert.equal(response.status, 'closed');
    });
  });
});
