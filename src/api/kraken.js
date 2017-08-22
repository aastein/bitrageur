import axios from 'axios';
import KrakenClient from 'kraken-api';

import { logger } from '../../config/log';
import { apiKey, privateKey } from '../../config/private/kraken';
import { addresses } from '../../config/private/addresses';
import { floor } from '../utils/math';
import { productMap, pairMap, convertProduct, productPairs, convertPair, reverseConvertPair, reverseConvertProduct, findPair } from './../utils/productMaps';

const exchangeId = 'kraken';

const kraken = new KrakenClient(apiKey, privateKey);

kraken.config.timeout = 120000;

const kraxios = axios.create({
  baseURL: 'https://api.kraken.com',
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// custom

export const accountForCurrency = async (currency) => {
  const accounts = await getAccounts();
  return Object.keys(accounts).reduce((a, b) => {
    return convertProduct(b, exchangeId) === currency ? { [b]: accounts[b] } : a;
  }, {});
};

export const addressForCurrency = async (currency) => {
  const address = await getAddress(reverseConvertProduct(currency, exchangeId));
  return address[0];
};

export const sendCurrency = async (currency, amount, toExchangeId) => {
  const key = addresses[toExchangeId][exchangeId][currency];
  return sendProduct(reverseConvertProduct(currency, exchangeId), amount, key);
};

// find withdrawal status with transaction hash or reference id
export const sendCurrencyInfo = async (currency, transactionIdentifier) => {
  let response = [];
  while (response.length < 1) {
    try {
      response = await sendStatus(reverseConvertProduct(currency, exchangeId));
    } catch (err) {
      console.error(err);
      logger.info('retrying sendCurrencyInfo...');
      sleep(5000);
      response = [];
    }
  }
  const sendInfo = response.reduce((a, b) => (
    b.txid === transactionIdentifier || b.refid === transactionIdentifier ? b : a
  ), { status: 'not found' });
  return sendInfo;
};

export const sendAndWait = async (currency, amount, toExchangeId) => {
  const response = await sendCurrency(currency, amount, toExchangeId);
  console.log(response);
  let status = await sendCurrencyInfo(currency, response.refid);
  console.log(status);
  while (status.status !== 'Success') {
    logger.info('send status', status.status, response.refid);
    await sleep(5000);
    status = await sendCurrencyInfo(currency, response.refid);
  }
  logger.info('send status', status.status, response.refid);
  // status.amount
  return status;
};

export const receiveCurrencyInfo = async (currency, transactionHash) => {
  let response = [];
  while (response.length < 1) {
    try {
      response = await receiveStatus(reverseConvertProduct(currency, exchangeId));
    } catch (err) {
      console.error(err);
      logger.info('retrying receiveCurrencyInfo...');
      sleep(5000);
      response = [];
    }
  }
  const receiveInfo = response.reduce((a, b) => (
    b.txid === transactionHash ? b : a
  ), { status: 'not found' });
  return receiveInfo;
};

export const receiveAndWait = async (currency, transactionHash) => {
  let status = await receiveCurrencyInfo(currency, transactionHash);
  console.log(status);
  while (status.status !== 'Success') {
    logger.info('receive status', status.status, transactionHash);
    await sleep(5000);
    status = await receiveCurrencyInfo(currency, transactionHash);
  }
  logger.info('receive status', status.status, transactionHash);
  // status.amount
  return status;
};

export const products = async () => {
  const response = await getProducts();
  return response.data.result;
};

export const orderbook = async (pair, depth) => {
  const exchangePairName = reverseConvertPair(pair, exchangeId);
  const response = await getOrderBook(exchangePairName, depth);
  if (!response[exchangePairName].asks[0] || !response[exchangePairName].bids[0]) {
    logger.error('No orderbook for ', exchangePairName);
    return {};
  }
  const asks = response[exchangePairName].asks;
  const bids = response[exchangePairName].bids;
  return { asks, bids };
};

export const sell = async (pair, ordertype, volume, validate) => {
  const response = await sendSellOrder(reverseConvertPair(pair, exchangeId), ordertype, volume, validate);
  return response;
};

export const buy = async (pair, ordertype, funds, validate) => {
  const ob = await orderbook(pair);
  const rate = ob.bids[0][0];
  const volume = floor(funds / rate, 8);
  const response = await sendBuyOrder(reverseConvertPair(pair, exchangeId), ordertype, volume, validate);
  return response;
};

export const orderInfo = async (id) => {
  const response = await getOrderInfo(id);
  if (!response.status) {
    response.status = 'not found';
  }
  return response;
};

export const waitForOrderToComplete = async (id) => {
  let response = await orderInfo(id);
  while (response.status !== 'closed') {
    logger.info('order status', response.status, id);
    await sleep(5000);
    response = await orderInfo(id);
  }
  logger.info('order status', response.status, id);
  return response;
};

export const orderAndWait = async (pair, side, ordertype, amount) => {
  let currency;
  let orderResponse;
  const validate = false;
  if (side === 'buy') {
    orderResponse = await buy(pair, ordertype, amount, validate);
  } else if (side === 'sell') {
    orderResponse = await sell(pair, ordertype, amount, validate);
  }
  logger.info(orderResponse);
  const info = await waitForOrderToComplete(orderResponse.txid[0]);
  // amount = info.vol_exec - info.vol_fee
  let altAmount;
  if (side === 'buy') {
    altAmount = info.vol_exec;
  } else if (side === 'sell') {
    altAmount = info.cost;
  }
  return { ...info, amount: altAmount };
};

// vanilla

export const getProducts = () => {
  logger.info('get kraken products');
  const url = '/0/public/AssetPairs';
  return kraxios.get(url);
};

export const getAccounts = async () => {
  logger.info('get kraken accounts');
  const balances = await kraken.api('Balance');
  return balances.result;
};

export const getOrderBook = async (pair, depth) => {
  logger.info('get kraken order book', pair, depth);
  try {
    const orderBook = await kraken.api('Depth', { pair, count: depth });
    return orderBook.result;
  } catch (error) {
    console.error(error);
    return {};
  }
};

export const getDepositMethods = async (asset) => {
  logger.info('get kraken deposit method');
  const methods = await kraken.api('DepositMethods', { asset });
  return methods.result;
};

export const getAddress = async (asset) => {
  logger.info('get kraken address');
  const methods = await getDepositMethods(asset);
  const method = methods[0].method;
  const address = await kraken.api('DepositAddresses', { asset, method });
  return address.result;
};

export const sendProduct = async (asset, amount, key) => {
  logger.info('send product from kraken', asset, key, amount);
  const tx = await kraken.api('Withdraw', { asset, key, amount });
  return tx.result;
};

export const sendStatus = async (asset) => {
  logger.info('get send status kraken', asset);
  const status = await kraken.api('WithdrawStatus', { asset });
  return status.result;
};

export const receiveStatus = async (asset) => {
  let method;
  const generalAssetName = convertProduct(asset, exchangeId);
  if (generalAssetName === 'BTC') {
    method = 'Bitcoin';
  } else if (generalAssetName === 'LTC') {
    method = 'Litecoin';
  } else if (generalAssetName === 'ETH') {
    method = 'Ether (Hex)';
  }
  logger.info('get receive status kraken', asset, method);
  const status = await kraken.api('DepositStatus', { asset, method });
  return status.result;
};

export const sendSellOrder = async (pair, ordertype, volume, validate) => {
  logger.info('send kraken sell order', pair, ordertype, volume, validate);
  const type = 'sell';
  const params = { pair, type, ordertype, volume };
  if (validate) params.validate = validate;
  try {
    const order = await kraken.api('AddOrder', params);
    return order.result;
  } catch (err) {
    return err;
  }
};

export const sendBuyOrder = async (pair, ordertype, volume, validate) => {
  logger.info('send kraken buy order', pair, ordertype, volume, validate);
  const type = 'buy';
  // const oflags = 'viqc';
  // const params = { pair, type, ordertype, oflags, volume };
  const params = { pair, type, ordertype, volume };
  if (validate) params.validate = validate;
  try {
    const order = await kraken.api('AddOrder', params);
    return order.result;
  } catch (err) {
    return err;
  }
};

export const getOrderInfo = async (id) => {
  const openOrders = await kraken.api('OpenOrders', { trades: true });
  const closedOrders = await kraken.api('ClosedOrders', { trades: true });
  const orderIsOpen = Object.keys(openOrders.result.open).includes(id);
  const orderIsCloses = Object.keys(closedOrders.result.closed).includes(id);
  return orderIsOpen ? openOrders.result.open[id] : closedOrders.result.closed[id];
};
