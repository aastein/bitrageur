# arbitr8

<p align="center">
  <img align="center" src="/images/carnot-cycle.png" width="200">
</p>
<p align="center">
Flip coins from one exchange to another and back again if the price is right
</p>

### Supports
 - Kraken
 - GDAX / Coinbase

### What it does

The values of cryptocurrencies vary across exchanges. Carnot analyzes the exchange rates and fees across supported exchanges and identifies a circular path of transferring and trading which will end with more coins than it started with.

### Setup

##### Clone this repo

`git clone https://github.com/aastein/carnot.git`

##### Install dependencies (If you don't have npm you can get it here https://www.npmjs.com/get-npm)

`npm install`

##### Setup API Keys with all permissions for
- GDAX
- Coinbase
- Kraken

##### Add the API information to

`config/private/coinbase.js`

`config/private/gdax.js`

`config/private/kraken.js`

##### Add the address information to

`config/private/addresses.js`

##### Add test information to

`config/private/test.js`

##### Test
##### *WARNING*:
###### *Tests will make small transactions and transfers using the information in the config/private directory*

`npm run test`

#### Run

`npm run start`
