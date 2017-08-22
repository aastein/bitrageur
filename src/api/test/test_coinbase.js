import assert from 'assert';

import * as coinbase from '../coinbase';
import * as kraken from '../kraken';
import { addresses } from '../../../config/private/addresses';
import { config } from '../../../config/private/test';

describe('coinbase api', () => {

  describe('get accounts', () => {
    it('account should have expected keys', async () => {
      const response = await coinbase.getAccounts();
      const expectedKeys = ['client', 'id', 'name', 'primary', 'type', 'currency', 'balance', 'native_balance', 'created_at', 'updated_at', 'resource', 'resource_path'];
      assert.equal(JSON.stringify(Object.keys(response[0])), JSON.stringify(expectedKeys));
    });
  });

  describe('get account', () => {
    it('should get LTC account', async () => {
      const currency = 'LTC';
      const response = await coinbase.accountForCurrency(currency);
      assert.equal(response.balance.currency, currency);
    });
    it('should get BTC account', async () => {
      const currency = 'BTC';
      const response = await coinbase.accountForCurrency(currency);
      assert.equal(response.balance.currency, currency);
    });
    it('should get ETH account', async () => {
      const currency = 'ETH';
      const response = await coinbase.accountForCurrency(currency);
      assert.equal(response.currency, currency);
    });
  });

  describe('get address', () => {
    it('should get LTC address', async () => {
      const currency = 'LTC';
      const response = await coinbase.addressForCurrency(currency);
      assert.equal(response.address.length, 34);
      assert.equal(response.account.currency, currency);
    });
    it('should get BTC address', async () => {
      const currency = 'BTC';
      const response = await coinbase.addressForCurrency(currency);
      assert.ok(response.address.length === 33 || response.address.length === 34);
      assert.equal(response.account.currency, currency);
    });
    it('should get ETH address', async () => {
      const currency = 'ETH';
      const response = await coinbase.addressForCurrency(currency);
      assert.equal(response.address.length, 42);
      assert.equal(response.account.currency, currency);
    });
  });

  describe('send currency', () => {
    it('should not send LTC with amount = 0', async () => {
      const currency = 'LTC';
      const amount = 0;
      const address = addresses.coinbase[currency];
      try {
        const response = await coinbase.sendCurrency(currency, amount, address);
      } catch (err) {
        assert.equal(err.toString(), 'ValidationError: You must enter a valid amount');
      }
    });
    it('should not send BTC with amount = 0', async () => {
      const currency = 'BTC';
      const amount = 0;
      const address = addresses.coinbase[currency];
      try {
        const response = await coinbase.sendCurrency(currency, amount, address);
      } catch (err) {
        assert.equal(err.toString(), 'ValidationError: You must enter a valid amount');
      }
    });
    it('should not send ETH with amount = 0', async () => {
      const currency = 'ETH';
      const amount = 0;
      const address = addresses.coinbase[currency];
      try {
        const response = await coinbase.sendCurrency(currency, amount, address);
      } catch (err) {
        assert.equal(err.toString(), 'ValidationError: You must enter a valid amount');
      }
    });
    it('should not send LTC with invalid address', async () => {
      const currency = 'LTC';
      const amount = 0.00001;
      const address = 'invalid';
      try {
        const response = await coinbase.sendCurrency(currency, amount, address);
      } catch (err) {
        assert.equal(err.toString(), 'ValidationError: Please enter a valid email or Litecoin address');
      }
    });
    it('should not send BTC invalid address', async () => {
      const currency = 'BTC';
      const amount = 0.00001;
      const address = 'invalid';
      try {
        const response = await coinbase.sendCurrency(currency, amount, address);
      } catch (err) {
        assert.equal(err.toString(), 'ValidationError: Please enter a valid email or Bitcoin address');
      }
    });
    it('should not send ETH with invalid address', async () => {
      const currency = 'ETH';
      const amount = 0.00001;
      const address = 'invalid';
      try {
        const response = await coinbase.sendCurrency(currency, amount, address);
      } catch (err) {
        assert.equal(err.toString(), 'ValidationError: Please enter a valid email or Ethereum address');
      }
    });
    it('should send LTC and wait', async () => {
      const currency = 'LTC';
      const amount = 0.01;
      const address = addresses.kraken[currency];
      const status = await coinbase.sendAndWait(currency, amount, address);
      console.log(status);
      assert.equal(status.network.status, 'confirmed');
      const toExchangeStatus = await kraken.receiveAndWait(currency, status.network.hash);
      console.log(toExchangeStatus);
      assert.equal(toExchangeStatus.status, 'Success');
    });
  });

  describe('send currency info', () => {
    it('should get LTC send info', async () => {
      const currency = 'LTC';
      const transactionId = config.coinbase[currency].sendId;
      const transactionHash = config.coinbase[currency].sendHash;
      const expectedKeys = ['client', 'id', 'type', 'status', 'amount', 'native_amount', 'description', 'created_at', 'updated_at', 'resource', 'resource_path', 'instant_exchange', 'network', 'to', 'idem', 'details', 'account'];
      const response = await coinbase.sendCurrencyInfo(currency, transactionId);
      assert.equal(JSON.stringify(Object.keys(response)), JSON.stringify(expectedKeys));
      assert.equal(response.network.hash, transactionHash);
    });
    it('should get BTC send info', async () => {
      const currency = 'BTC';
      const transactionId = config.coinbase[currency].sendId;
      const transactionHash = config.coinbase[currency].sendHash;
      const expectedKeys = ['client', 'id', 'type', 'status', 'amount', 'native_amount', 'description', 'created_at', 'updated_at', 'resource', 'resource_path', 'instant_exchange', 'network', 'to', 'idem', 'details', 'account'];
      const response = await coinbase.sendCurrencyInfo(currency, transactionId);
      assert.equal(JSON.stringify(Object.keys(response)), JSON.stringify(expectedKeys));
      assert.equal(response.network.hash, transactionHash);
    });
    it('should get ETH send info', async () => {
      const currency = 'ETH';
      const transactionId = config.coinbase[currency].sendId;
      const transactionHash = config.coinbase[currency].sendHash;
      const expectedKeys = ['client', 'id', 'type', 'status', 'amount', 'native_amount', 'description', 'created_at', 'updated_at', 'resource', 'resource_path', 'instant_exchange', 'network', 'to', 'idem', 'details', 'account'];
      const response = await coinbase.sendCurrencyInfo(currency, transactionId);
      assert.equal(JSON.stringify(Object.keys(response)), JSON.stringify(expectedKeys));
      assert.equal(response.network.hash, transactionHash);
    });
  });

  describe('receive currency info', () => {
    it('should get LTC receive info', async () => {
      const currency = 'LTC';
      const transactionHash = config.coinbase[currency].sendHash;
      const response = await coinbase.receiveCurrencyInfo(currency, transactionHash);
      assert.equal(response.network.hash, transactionHash);
    });
    it('should get BTC receive info', async () => {
      const currency = 'BTC';
      const transactionHash = config.coinbase[currency].sendHash;
      const response = await coinbase.receiveCurrencyInfo(currency, transactionHash);
      assert.equal(response.network.hash, transactionHash);
    });
    it('should get ETH receive info', async () => {
      const currency = 'ETH';
      const transactionHash = config.coinbase[currency].sendHash;
      const response = await coinbase.receiveCurrencyInfo(currency, transactionHash);
      assert.equal(response.network.hash, transactionHash);
    });
  });
});
