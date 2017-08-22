import axios from 'axios';
import crypto from 'crypto';
import querystring from 'querystring';
import Gdax from 'gdax';

import { logger } from '../../config/log';
import { floor } from '../utils/math';
import { apiKey, passphrase, secret } from '../../config/private/gdax';
import * as coinbase from './coinbase';

const gdaxios = axios.create({
  baseURL: 'https://api.gdax.com',
});

const publicClient = new Gdax.PublicClient();
const authedClient = new Gdax.AuthenticatedClient(apiKey, secret, passphrase, gdaxios.baseURL);

const handleError = (error, setFetchingStatus) => {
  logger.info('handling err');
  if (setFetchingStatus) setFetchingStatus(false);
  return logger.warn(error);
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// custom

export const products = async () => {
  const response = await getProducts();
  return response.data;
};

export const orderbook = async (pair, depth) => (
  getOrderBook(pair, depth)
);

export const accounts = async () => (
  getAccounts()
);

export const deposit = async (currency, amount) => {
  const account = await coinbase.accountForCurrency(currency);
  const response = await depositFromCoinbase(amount, account.id);
  return response;
};

export const withdrawal = async (currency, amount) => {
  const account = await coinbase.accountForCurrency(currency);
  const response = await withdrawlToCoinbase(amount, account.id);
  return response;
};

export const sell = async (pair, ordertype, volume) => {
  const response = await sendSellOrder(pair, ordertype, volume);
  return response;
};

export const buy = async (pair, ordertype, funds) => {
  const response = await sendBuyOrder(pair, ordertype, funds);
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
  while (response.status !== 'done') {
    logger.info('order status', response.status, id);
    await sleep(5000);
    response = await orderInfo(id);
  }
  logger.info('order status', response.status, id);
  return response;
};

export const depositOrderWaitWithdrawl = async (pair, side, ordertype, amount) => {
  let currency;
  let alt;
  let orderResponse;

  if (side === 'buy') {
    currency = pair.split('-')[1];
    alt = pair.split('-')[0];
  } else if (side === 'sell') {
    currency = pair.split('-')[0];
    alt = pair.split('-')[1];
  }

  await deposit(currency, amount);

  if (side === 'buy') {
    orderResponse = await buy(pair, ordertype, amount);
  } else if (side === 'sell') {
    orderResponse = await sell(pair, ordertype, amount);
  }
  const info = await waitForOrderToComplete(orderResponse.id);
  await withdrawal(alt, floor(info.executed_value - info.fill_fees, 8));
  return { ...info, amount: info.executed_value - info.fill_fees };
};

// vanilla

export const getProducts = () => {
  logger.info('getting gdax products');
  const url = '/products';
  return gdaxios.get(url);
};

export const getOrderBook = (productId, depth) => {
  logger.info('getting gdax order book', productId, depth);
  const level = depth > 1 ? 2 : 1;
  const url = `/products/${productId}/book?level=${level}`;
  return gdaxios.get(url).then((res) => {
    logger.info('got gdax order book', productId, res.status);
    return {
      bids: res.data.bids,
      asks: res.data.asks,
    };
  });
};

export const getAccounts = async () => (
  new Promise((resolve, reject) => {
    logger.info('getting gdax accounts');
    authedClient.getAccounts((e, r, d) => (resolve(d)));
  })
);

export const depositFromCoinbase = async (amount, accountId) => (
  new Promise((resolve, reject) => {
    logger.info('deposit from coinbase to gdax', amount, accountId);
    const params = {
      amount: amount.toString(),
      coinbase_account_id: accountId,
    };
    authedClient.deposit(params, (e, r, d) => (resolve(d)));
  })
);

export const withdrawlToCoinbase = async (amount, accountId) => (
  new Promise((resolve, reject) => {
    logger.info('withdrawl from gdax to coinbase', amount, accountId);
    const params = {
      amount: amount.toString(),
      coinbase_account_id: accountId,
    };
    authedClient.withdraw(params, (e, r, d) => (resolve(d)));
  })
);


export const sendSellOrder = async (pair, ordertype, volume) => (
  new Promise((resolve, reject) => {
    logger.info('gdax sell order', pair, ordertype, volume);
    const params = {
      side: 'sell',
      product_id: pair,
      type: ordertype,
      size: volume.toString(),
    };
    authedClient.sell(params, (e, r, d) => (resolve(d)));
  })
);

export const sendBuyOrder = async (pair, ordertype, funds) => (
  new Promise((resolve, reject) => {
    logger.info('gdax buy order', pair, ordertype, funds);
    const params = {
      side: 'buy',
      product_id: pair,
      type: ordertype,
      funds: funds.toString(),
    };
    logger.info('buy params', params);
    authedClient.buy(params, (e, r, d) => (resolve(d)));
  })
);

export const getOrderInfo = async id => (
  new Promise((resolve, reject) => {
    logger.info('gdax order info', id);
    authedClient.getOrder(id, (e, r, d) => {
      resolve(d);
    });
  })
);
