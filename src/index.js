import winston from 'winston';
import axios from 'axios';

import { logger } from '../config/log';
import { tradeConfig } from '../config/trades';
import { addresses } from '../config/private/addresses';
import * as gdax from './api/gdax';
import * as coinbase from './api/coinbase';
import * as kraken from './api/kraken';
import { productMap, pairMap, convertProduct, productPairs, convertPair, reverseConvertPair, reverseConvertProduct, findPair } from './utils/productMaps';
import { fees, sendFee } from './utils/fees';
import { exchangesConfig } from './exchanges';
import { round, floor } from './utils/math';

let minimum = 10;

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const exchangeById = (id, exhanges) => (
  exhanges.reduce((a, b) => (b.id === id ? b : a), '')
);

export const setProducts = async (exchanges) => {
  const exes = exchanges;
  const requests = exes.map(e => (e.api.products()));
  const responses = await Promise.all(requests);
  for (let i = 0; i < responses.length; i += 1) {
    exes[i].products = responses[i];
  }
  return exes;
};

// Nasty switch to map exchange data to a common format
// Ignore USD accounts
export const setAppDataAccounts = (exchange, response) => {
  const ex = exchange;
  switch (ex.id) {
    case 'gdax':
      ex.appData.accounts = ex.accounts.filter(p => (
        p.type !== 'vault' && Number(p.balance.amount) > 0 && p.currency !== 'USD'
      )).map(p => (
        { ...p.balance, id: p.id, amount: Number(p.balance.amount) }
      ));
      break;
    case 'kraken':
      ex.appData.accounts = Object.keys(ex.accounts).filter(p => (
        Number(ex.accounts[p]) > 0 && convertProduct(p, ex.id) !== 'USD' && convertProduct(p, ex.id) !== ''
      )).map(p => (
        { currency: convertProduct(p, ex.id), amount: Number(ex.accounts[p]) }
      ));
      break;
    default:
      logger.error('Cannot get accounts. No exhange with ID', exchange.id);
  }
  return ex;
};

export const setAccounts = async (exchanges) => {
  const exes = exchanges;
  const requests = exes.map(e => (e.id === 'gdax' ? e.coinbase.api.getAccounts() : e.api.getAccounts()));
  const responses = await Promise.all(requests);
  for (let i = 0; i < responses.length; i += 1) {
    exes[i].accounts = responses[i];
    exes[i] = setAppDataAccounts(exes[i]);
  }
  return exes;
};

// Nasty switch to map orderbook data to common format
export const setAppDataOrderBook = (exchange, ignore) => {
  const ex = exchange;
  switch (exchange.id) {
    case 'gdax':
      ex.appData.orderBook = ex.orderBook.reduce((a, b) => {
        const ob = a;
        const asks = b.asks.map((ask) => {
          const newAsk = [];
          newAsk[0] = ask[0];
          newAsk[1] = ask[1] * ask[2];
          return newAsk;
        });
        const bids = b.bids.map((bid) => {
          const newBid = [];
          newBid[0] = bid[0];
          newBid[1] = bid[1] * bid[2];
          return newBid;
        });
        ob[b.pair] = { asks, bids };
        return ob;
      }, {});
      break;
    case 'kraken':
      ex.appData.orderBook = ex.orderBook.reduce((a, b) => {
        const ob = a;
        const pair = Object.keys(b)[0];
        // Sometimes Kraken doesnt return data
        if (!b[pair].asks[0] || !b[pair].bids[0]) {
          logger.error('No orderbook for ', pair);
          if (ignore) {
            return ob;
          }
        }
        // TODO: do this with splice
        const asks = b[pair].asks.map((ask) => {
          const newAsk = [];
          newAsk[0] = ask[0];
          newAsk[1] = ask[1];
          return newAsk;
        });
        const bids = b[pair].bids.map((bid) => {
          const newBid = [];
          newBid[0] = bid[0];
          newBid[1] = bid[1];
          return newBid;
        });
        ob[convertPair(pair, ex.id)] = { asks, bids };
        return ob;
      }, {});
      break;
    default:
      logger.error('Cannot get order book. No exhange with ID', exchange.id);
  }
  return ex;
};

// TODO: not use index. Do by id
export const setOrderBook = async (exchanges, depth) => {
  const exes = exchanges;
  let apis = [];
  for (let i = 0; i < exchanges.length; i += 1) {
    apis = [...apis, ...productPairs(exchanges[i].id).map(p => (
      { index: i, api: exchanges[i].api.getOrderBook(p, depth), pair: p }
    ))];
  }
  const responses = await Promise.all(apis.map(a => (a.api)));
  for (let i = 0; i < responses.length; i += 1) {
    const ob = exchanges[apis[i].index].orderBook;
    exes[apis[i].index].orderBook = [...ob, { ...responses[i], pair: apis[i].pair }];
    exes[apis[i].index] = setAppDataOrderBook(exes[apis[i].index], true);
  }
  return exes;
};

export const tradingFee = (pair, amount, maker, exchange) => {
  let fee = 0;
  switch (exchange.id) {
    case 'kraken':
      fee = maker ? exchange.products[reverseConvertPair(pair, exchange.id)].fees_maker[0][1]
        : exchange.products[reverseConvertPair(pair, exchange.id)].fees[0][1];
      break;
    case 'gdax':
      fee = maker ? 0 : 0.3;
      break;
    default:
      logger.error('Cannot get trading fee. No exhange with ID', exchange.id);
  }
  return (fee / 100) * amount;
};

// TODO: get more orderbook depth for transactions of larger volume
// Exchange held product for the order side of the product pair
export const tradeInfo = (heldProduct, pairInfo, exchange) => {
  // side of the transaction
  const side = pairInfo.pair.indexOf(heldProduct.currency) === 0 ? 'sell' : 'buy';
  // the currency which is being exchanged for the held product
  const currency = side === 'sell' ? pairInfo.pair.split('-')[1] : pairInfo.pair.split('-')[0];
  // the amont of desired currency that can be obtained
  let amount = side === 'sell' ? pairInfo.asks[0][0] * heldProduct.amount : heldProduct.amount / pairInfo.bids[0][0];
  amount -= tradingFee(pairInfo.pair, amount, tradeConfig.maker, exchange);
  return { side, currency, amount };
};

// TODO: get more orderbook depth for transactions of larger volume
// Get the current market value of a product as fiat on an exchange
export const fiatValue = (fiatCurrency, currency, amount, exchange) => (
  Object.keys(exchange.appData.orderBook).filter(pair => (
    pair.includes(currency) && pair.includes(fiatCurrency)
  )).reduce((a, b) => (
    b.indexOf(currency) === 0 ? amount * exchange.appData.orderBook[b].asks[0][0] : amount / exchange.appData.orderBook[b].bids[0][0]
  ), 0)
);

export const calculateBestCycle = (exchanges) => {
  let cycles = [];
  for (let i = 0; i < exchanges.length; i += 1) {
    const e = exchanges[i];
    for (let j = 0; j < e.appData.accounts.length; j += 1) {
      const account = e.appData.accounts[j];
      // product which will initiate the cycly
      const coldProduct = account;
      const coldSendFee = sendFee(coldProduct.currency, e.id);
      // get all exchange other than the exchange holding the cold product
      const hotExchanges = exchanges.filter(h => (h.id !== e.id));
      // for each hot exchange determine a cycle outcome
      for (let k = 0; k < hotExchanges.length; k += 1) {
        const hotExchange = hotExchanges[k];
        // get all product pairs the cold product can be exchanged using
        const hotPairs = Object.keys(hotExchange.appData.orderBook).filter(pair => (
          pair.includes(coldProduct.currency) && !pair.includes('USD')
        )).map(b => (
          { ...hotExchange.appData.orderBook[b], pair: b }
        ));
        // for each product pair determine a cycle outcome
        for (let l = 0; l < hotPairs.length; l += 1) {
          const hotPair = hotPairs[l];
          // get all information for a transaciton to convert the cold product to the hot product on the hot exchange
          const hotTrade = tradeInfo(coldProduct, hotPair, hotExchange);
          // get the fee to transfer the hot product to the cold exchange
          const hotSendFee = sendFee(hotTrade.currency, hotExchange.id);
          // get all information for a transaciton to convert the hot product to the cold product on the cold exchange
          const hotProduct = { amount: hotTrade.amount, currency: hotTrade.currency };
          // orderbook for converting hotTrade.currency to coldProduct.currency
          const coldPair = Object.keys(e.appData.orderBook).reduce((a, b) => (
            b.includes(coldProduct.currency) && b.includes(hotProduct.currency) ? { ...e.appData.orderBook[b], pair: b } : a
          ), {});
          const coldTrade = tradeInfo(hotProduct, coldPair, e);
          const total = coldProduct.amount - coldTrade.amount - coldSendFee - hotSendFee;
          const cycle = {
            currency: coldProduct.currency,
            alt: hotProduct.currency,
            coldExchange: e,
            hotExchange,
            starting: coldTrade.amount,
            coldProduct,
            coldSendFee,
            hotSendFee,
            hotTrade,
            coldTrade,
            ending: coldProduct.amount,
            total,
            usd: fiatValue('USD', coldProduct.currency, total, e),
          };
          cycles = [...cycles, cycle];
        }
      }
    }
  }
  // Get the cycle with the highest fiat value
  const bestCycle = cycles.filter(c => (c.total > 0)).reduce((a, b) => {
    return b.usd > a.usd ? b : a;
  }, { usd: 0 });
  return bestCycle;
};

export const setupData = async (exchanges) => {
  let exes = exchanges;
  exes = await setProducts(exchanges);
  exes = await setAccounts(exes);
  return setOrderBook(exes);
};

// TODO: Unify GDAX and Coinbase APIs
export const sendToExchange = async (currency, amount, fromExchange, toExchange) => {
  let transactionHash;
  let toAddress;
  let sendStatus;
  let receiveStatus;
  if (fromExchange.id === 'kraken') {
    // kraken uses addres ids
    if (toExchange.id === 'gdax') {
      toAddress = 'coinbase';
    } else {
      toAddress = toExchange.id;
    }
  } else {
    toAddress = addresses[toExchange.id][currency];
  }
  // Send
  if (fromExchange.id === 'gdax') {
    // send using coinbase
    sendStatus = await coinbase.sendAndWait(currency, amount, toAddress);
  } else {
    sendStatus = await fromExchange.api.sendAndWait(currency, amount, toAddress);
  }
  logger.info('Send status', sendStatus);
  // Receive
  if (fromExchange.id === 'gdax') {
    receiveStatus = await toExchange.api.receiveAndWait(currency, sendStatus.network.hash);
  } else if (fromExchange.id === 'kraken') {
    if (toExchange.id === 'gdax') {
      receiveStatus = await coinbase.receiveAndWait(currency, sendStatus.txid);
    } else {
      receiveStatus = await toExchange.api.receiveAndWait(currency, sendStatus.txid);
    }
  }
  logger.info('Receive status', receiveStatus);
  return receiveStatus; // receiveStatus.amount
};

// TODO: figure out what this returns
export const order = async (fromCurrency, toCurrency, amount, side, exchange) => {
  // order params
  const pair = findPair(fromCurrency, toCurrency);
  const ordertype = 'market';
  if (exchange.id === 'gdax') {
    return exchange.api.depositOrderWaitWithdrawl(pair, side, ordertype, amount); // amount = .details.??
  }
  return exchange.api.orderAndWait(pair, side, ordertype, amount); // amount = .vol_exec - .info.vol_fee
};

export const executeCycle = async (cycle) => {
  logger.info('===========================Execute Cycle===========================');
  // send currency to hot exchange
  const hotReceiveStatus = await sendToExchange(cycle.currency, floor(cycle.starting, 8), cycle.coldExchange, cycle.hotExchange);

  let receivedAmount;
  if (cycle.hotExchange.id === 'kraken') {
    receivedAmount = hotReceiveStatus.amount;
  } else if (cycle.hotExchange.id === 'gdax') {
    receivedAmount = hotReceiveStatus.amount.amount;
  }

  // trade on hot exchange for alt currency
  const hotTrade = await order(cycle.currency, cycle.alt, receivedAmount, cycle.hotTrade.side, cycle.hotExchange);

  // send currency to cold exchange
  const coldReceiveStatus = await sendToExchange(cycle.alt, hotTrade.amount, cycle.hotExchange, cycle.coldExchange);

  let altReceivedAmount;
  if (cycle.coldExchange.id === 'kraken') {
    altReceivedAmount = coldReceiveStatus.amount;
  } else if (cycle.coldExchange.id === 'gdax') {
    altReceivedAmount = coldReceiveStatus.amount.amount;
  }

  // trade on cold exchange for alt currency
  const coldTrade = await order(cycle.alt, cycle.currency, altReceivedAmount, cycle.coldTrade.side, cycle.coldExchange);
  // record cycle summmary
  const cycleSummary = {
    currency: cycle.currency,
    alt: cycle.alt,
    startAmount: cycle.starting,
    endAmount: coldTrade.amount,
    diff: coldTrade.amount - cycle.starting,
  };
  logger.info('cycle complete', cycleSummary);
  if (cycleSummary.diff <= 0) {
    logger.error(`===========Cycle Lost ${cycleSummary.diff} ${cycleSummary.currency}===========`);
    minimum += Math.abs(cycleSummary.diff);
  } else {
    logger.info(`===========Cycle Gained ${cycleSummary.diff} ${cycleSummary.currency}===========`);
  }
};

export const run = async () => {
  while (true) {
    logger.info('============================Start Cycle============================');
    const exes = await setupData(exchangesConfig);
    try {
      const bestCycle = calculateBestCycle(exes);
      // run the best cycle if yeild is more than 10 usd
      if (bestCycle.usd > minimum) {
        logger.info(`Executing cycle with gain $${bestCycle.usd}`);
        await executeCycle(bestCycle);
      } else {
        logger.info(`Not executing cycle with gain $${bestCycle.usd}`);
      }
      await sleep(10000);
    } catch (error) {
      logger.info(error);
    }
  }
};

run();
