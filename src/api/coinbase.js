import axios from 'axios';
import crypto from 'crypto';
import { Client } from 'coinbase';

import { logger } from '../../config/log';
import { floor } from '../utils/math';
import { apiKey, apiSecret } from '../../config/private/coinbase';
import { productMap, pairMap, convertProduct, productPairs, convertPair, reverseConvertPair, reverseConvertProduct, findPair } from './../utils/productMaps';

const client = new Client({ apiKey, apiSecret });

const exchangeId = 'gdax';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// custom

export const accountForCurrency = async (currency) => {
  let accounts = await getAccounts();
  while (!accounts) {
    logger.info('Failed to get coinbase accounts. Retying...');
    accounts = await getAccounts();
  }
  return accounts.reduce((a, b) => {
    return convertProduct(b.currency, exchangeId) === currency ? b : a;
  }, '');
};

export const addressForCurrency = async (currency) => {
  const account = await accountForCurrency(currency);
  return getAddress(account.id);
};

export const sendCurrency = async (currency, amount, address) => {
  const account = await accountForCurrency(currency);
  return sendProduct(account.id, amount, currency, address);
};

export const sendCurrencyInfo = async (currency, transactionId) => {
  const account = await accountForCurrency(currency);
  let response = await sendStatus(account.id, transactionId);
  if (!response || !response.status) {
    response = { status: 'not found' };
  }
  return response;
};

export const sendAndWait = async (currency, amount, address) => {
  try {
    const response = await sendCurrency(currency, amount, address);
    console.log(response);
    let status = await sendCurrencyInfo(currency, response.id);
    while (status.status !== 'completed') {
      logger.info('send status', status.status, response.id);
      await sleep(5000);
      status = await sendCurrencyInfo(currency, response.id);
    }
    logger.info('send status', status.status, response.id);
    return status;
  } catch (err) {
    logger.error('failed to send', currency, amount, address);
    console.error(err);
  }
  return {};
};

export const receiveCurrencyInfo = async (currency, transactionHash) => {
  const account = await accountForCurrency(currency);
  let transactions = await receiveStatus(account.id);
  while (!transactions) {
    logger.error('receiveCurrencyInfo is null. Retying...');
    await sleep(5000);
    transactions = await receiveStatus(account.id);
  }
  const receiveInfo = transactions.reduce((a, b) => (
    b.network && b.network.hash === transactionHash ? b : a
  ), { status: 'not found' });
  return receiveInfo;
};

export const receiveAndWait = async (currency, transactionHash) => {
  let status = await receiveCurrencyInfo(currency, transactionHash);
  while (status.status !== 'completed') {
    logger.info('receive status', status.status, transactionHash);
    await sleep(5000);
    status = await receiveCurrencyInfo(currency, transactionHash);
  }
  logger.info('receive status', status.status, transactionHash);
  return status;
};

// vanilla

export const getAccounts = () => (
  new Promise((resolve, reject) => {
    logger.info('getting coinbase accounts');
    client.getAccounts({}, (err, accnts) => (
      resolve(accnts)
    ));
  })
);

export const getAddress = accountId => (
  new Promise((resolve, reject) => {
    logger.info('getting coinbase address');
    client.getAccount(accountId, (err, account) => {
      account.createAddress(null, (error, address) => {
        resolve(address);
      });
    });
  })
);

export const sendProduct = async (accountId, amount, currency, address) => (
  new Promise((resolve, reject) => {
    logger.info('send product from coinbase', accountId, amount, currency, address);
    const params = {
      to: address,
      amount: amount.toString(),
      currency,
    };
    client.getAccount(accountId, (err, account) => {
      account.sendMoney(params, (error, tx) => {
        if (error) reject(error);
        resolve(tx);
      });
    });
  })
);

export const sendStatus = async (accountId, transactionId) => (
  new Promise((resolve, reject) => {
    logger.info('getting send status coinbase', transactionId);
    client.getAccount(accountId, (err, account) => {
      account.getTransaction(transactionId, (error, tx) => {
        resolve(tx);
      });
    });
  })
);

export const receiveStatus = async (accountId) => {
  let response;
  try {
    response = await receiveStatusVanilla(accountId);
  } catch (err) {
    logger.error('Failed to get receive status');
    console.error(err);
    response = await receiveStatusVanilla(accountId);
  }
  return response;
};

export const receiveStatusVanilla = async accountId => (
  new Promise((resolve, reject) => {
    logger.info('get receive status coinbase');
    client.getAccount(accountId, (err, account) => {
      account.getTransactions(({}), (error, txs) => {
        resolve(txs);
      });
    });
  })
);
