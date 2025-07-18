'use strict';

const Client = require('./client');

class ElectrumClient extends Client {
  constructor(net, tls, port, host, protocol, options) {
    super(net, tls, port, host, protocol, options);
    this.timeLastCall = 0;
  }

  initElectrum(electrumConfig, persistencePolicy = { maxRetry: 1000, callback: null }) {
    this.persistencePolicy = persistencePolicy;
    this.electrumConfig = electrumConfig;
    this.timeLastCall = 0;
    return this.connect().then(() => this.server_version(this.electrumConfig.client, this.electrumConfig.version));
  }

  // Override parent
  request(method, params) {
    this.timeLastCall = new Date().getTime();
    const parentPromise = super.request(method, params);
    return parentPromise.then(response => {
      this.keepAlive();
      return response;
    });
  }

  requestBatch(method, params, secondParam) {
    this.timeLastCall = new Date().getTime();
    const parentPromise = super.requestBatch(method, params, secondParam);
    return parentPromise.then(response => {
      this.keepAlive();
      return response;
    });
  }

  onClose() {
    super.onClose();
    const list = [
      'blockchain.headers.subscribe',
      'blockchain.scripthash.subscribe',
    ];
    list.forEach(event => this.subscribe.removeAllListeners(event));
    setTimeout(() => {
      if (this.persistencePolicy != null && this.persistencePolicy.maxRetry > 0) {
        this.reconnect();
        this.persistencePolicy.maxRetry -= 1;
      } else if (this.persistencePolicy != null && this.persistencePolicy.callback != null) {
        this.persistencePolicy.callback();
      } else if (this.persistencePolicy == null) {
        this.reconnect();
      }
    }, 1000);
  }

  // ElectrumX persistancy
  keepAlive() {
    if (this.timeout != null) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(() => {
      if (this.timeLastCall !== 0 && new Date().getTime() > this.timeLastCall + 5000) {
        const pingTimer = setTimeout(() => {
          this.onError(new Error('keepalive ping timeout'));
        }, 9000);
        this.server_ping().catch((reason) => {
          console.log('keepalive ping failed because of', reason);
          clearTimeout(pingTimer);
        }).then(() => clearTimeout(pingTimer));
      }
    }, 5000);
  }

  close() {
    super.close();
    if (this.timeout != null) {
      clearTimeout(this.timeout);
    }
    this.reconnect = this.reconnect = this.onClose = this.keepAlive = () => {}; // dirty hack to make it stop reconnecting
  }

  reconnect() {
    console.log('electrum reconnect');
    this.initSocket();
    return this.initElectrum(this.electrumConfig);
  }

  // ElectrumX API

  
    server_version(client_name, protocol_version){
        try {
          return this.request('server.version', [client_name, protocol_version]);
        } catch (e) {
            return { error: true, data: e };
        }
    }
    server_banner(){
        try {
          return this.request('server.banner', []);
        } catch (e) {
          return { error: true, data: e };
        }
    }
  server_ping(){
    try {
      return this.request('server.ping', []);
    } catch (e) {
      return { error: true, data: e };
    }
  }
    serverDonation_address(){
        try {
          return this.request('server.donation_address', []);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    serverPeers_subscribe(){
        try {
          return this.request('server.peers.subscribe', []);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainAddress_getBalance(address){
        try {
          return this.request('blockchain.address.get_balance', [address]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainAddress_getHistory(address){
        try {
          return this.request('blockchain.address.get_history', [address]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainAddress_getMempool(address){
        try {
          return this.request('blockchain.address.get_mempool', [address]);
        } catch (e) {
            return { error: true, data: e };
        }
    }
    blockchainAddress_getProof(address){
        try {
            return this.request('blockchain.address.get_proof', [address]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainAddress_listunspent(address){
        try {
            return this.request('blockchain.address.listunspent', [address]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainAddress_subscribe(address){
        try {
            return this.request('blockchain.address.subscribe', [address]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainScripthash_getBalance(scripthash){
        try {
            return this.request('blockchain.scripthash.get_balance', [scripthash]);
        } catch (e) {
          return { error: true, data: e };
        }
    }

    //Expects: [{ scriptHash: "", address: "" }]
    //Returns array: [{ confirmed: 0, unconfirmed: 0, scriptHash: "", address: "" }]
  async blockchainScripthashes_getBalance(scripthashes){
        try {
          const result = [];
          await Promise.all(scripthashes.map(async ({ scriptHash = "", address = "", path = "" } = {}) => {
            try {
              const response = await this.request('blockchain.scripthash.get_balance', [scriptHash]);
              const {confirmed, unconfirmed} = response;
              const data = { confirmed, unconfirmed, scriptHash, address, path }
              result.push(data);
            } catch (e) {}
          }));
          return result;
        } catch (e) {
            return { error: true, data: e }
        }
  }

  blockchainScripthash_getHistory(scripthash){
    try {
      return this.request('blockchain.scripthash.get_history', [scripthash]);
    } catch (e) {
      return { error: true, data: e };
    }
  }
  
  //Expects: [{ scriptHash: "", address: "" }]
  //Returns array: [{ height: 0, tx_hash: "", scriptHash: "", address: "", path: "" }]
  async blockchainScripthashes_getHistory(scripthashes){
    try {
      const result = [];
      await Promise.all(scripthashes.map(async ({ scriptHash = "", address = "", path = "" } = {}) => {
        try {
          const response = await this.request('blockchain.scripthash.get_history', [scriptHash]);
          const responseLength = response.length;
          if (responseLength > 0) {
            response.map((res) => {
              try {
                const { height, tx_hash } = res;
                const data = { height, tx_hash, scriptHash, address, path }
                result.push(data);
              } catch (e) {}
            });
          }
        } catch (e) {}
      }));
      return result;
    } catch (e) {
      return { error: true, data: e }
    }
  }
    blockchainScripthash_getMempool(scripthash){
        try {
            return this.request('blockchain.scripthash.get_mempool', [scripthash]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
  async blockchainScripthashes_getMempool(scripthashes){
    try {
      const result = [];
      await Promise.all(scripthashes.map(async ({ scriptHash = "", address = "", path = "" } = {}) => {
        try {
          const response = await this.request('blockchain.scripthash.get_mempool', [scriptHash]);
          const responseLength = response.length;
          if (responseLength > 0) {
            response.map((res) => {
              try {
                const { height, tx_hash } = res;
                const data = { height, tx_hash, scriptHash, address, path }
                result.push(data);
              } catch (e) {}
            });
          }
        } catch (e) {}
      }));
      return result;
    } catch (e) {
      return { error: true, data: e }
    }
  }
    blockchainScripthash_listunspent(scripthash){
        try {
            return this.request('blockchain.scripthash.listunspent', [scripthash]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
  //Expects: [{ scriptHash: "", address: "", path: "" }]
  //Returns array: [{ height: 0, tx_hash: "", tx_pos: 0, value: 0, scriptHash: "", address: "", path: "" }]
  async blockchainScripthashes_listunspent(scripthashes){
    try {
      const result = [];
      await Promise.all(scripthashes.map(async (scripthashData) => {
        try {
          const { scriptHash, address, path } = scripthashData;
          const response = await this.request('blockchain.scripthash.listunspent', [scriptHash]);
          const responseLength = response.length;
          if (responseLength > 0) {
            response.map((res) => {
              try {
                const {height, tx_hash, tx_pos, value} = res;
                const data = {height, tx_hash, tx_pos, value, scriptHash, address, path};
                result.push(data);
              } catch (e) {}
            });
          }
        } catch (e) {}
      }));
      return result;
    } catch (e) {
      return { error: true, data: e }
    }
  }
    blockchainScripthash_subscribe(scripthash){
        try {
            return this.request('blockchain.scripthash.subscribe', [scripthash]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainBlock_getHeader(height){
        try {
            return this.request('blockchain.block.get_header', [height]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
  blockchainBlock_getBlockHeader(height){
    try {
        return this.request('blockchain.block.header', [height]);
    } catch (e) {
      return { error: true, data: e };
    }
  }
    blockchainBlock_getChunk(index){
        try {
            return this.request('blockchain.block.get_chunk', [index]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainEstimatefee(number){
        try {
            return this.request('blockchain.estimatefee', [number]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainHeaders_subscribe(){
        try {
            return this.request('blockchain.headers.subscribe', []);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainNumblocks_subscribe(){
        try {
            return this.request('blockchain.numblocks.subscribe', []);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchain_relayfee(){
        try {
            return this.request('blockchain.relayfee', []);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainTransaction_broadcast(rawtx){
        try {
            return this.request('blockchain.transaction.broadcast', [rawtx]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainTransaction_get(tx_hash, verbose=false, merkle=false){
        try {
            return this.request('blockchain.transaction.get', [tx_hash, verbose]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
  async blockchainTransactions_get(tx_hashes, verbose=false, merkle=false){
    try {
      const result = [];
      await Promise.all(tx_hashes.map(async (tx) => {
        try {
          const response = await this.request('blockchain.transaction.get', [tx.tx_hash, verbose]);
          if (response) {
            try {
              const data = Object.assign(tx, response);
              result.push(data);
            } catch (e) {}
          }
        } catch (e) {}
      }));
      return result;
    } catch (e) {
      return { error: false, data: e }
    }
  }
    blockchainTransaction_getMerkle(tx_hash, height){
        try {
            return this.request('blockchain.transaction.get_merkle', [tx_hash, height]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
    blockchainUtxo_getAddress(tx_hash, index){
        try {
            return this.request('blockchain.utxo.get_address', [tx_hash, index]);
        } catch (e) {
          return { error: true, data: e };
        }
    }
  
  requestBatch(method, params, secondParam) {
    const parentPromise = super.requestBatch(method, params, secondParam);
    return parentPromise.then(response => {
      return response;
    });
  }
  blockchainScripthash_getBalanceBatch(scripthash) {
    return this.requestBatch('blockchain.scripthash.get_balance', scripthash);
  }
  blockchainScripthash_listunspentBatch(scripthash) {
    return this.requestBatch('blockchain.scripthash.listunspent', scripthash);
  }
  blockchainScripthash_getHistoryBatch(scripthash) {
    return this.requestBatch('blockchain.scripthash.get_history', scripthash);
  }
  blockchainTransaction_getBatch(tx_hash, verbose) {
    return this.requestBatch('blockchain.transaction.get', tx_hash, verbose);
  }
}

module.exports = ElectrumClient;
