"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockClient = exports.healthClient = exports.client = void 0;
var client_1 = require("@apollo/client");
global.fetch = require('node-fetch');
exports.client = new client_1.ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    cache: new client_1.InMemoryCache(),
    queryDeduplication: true,
    defaultOptions: {
        watchQuery: {
            fetchPolicy: 'no-cache',
        },
        query: {
            fetchPolicy: 'no-cache',
            errorPolicy: 'all',
        },
    },
});
exports.healthClient = new client_1.ApolloClient({
    uri: 'https://api.thegraph.com/index-node/graphql',
    cache: new client_1.InMemoryCache(),
});
exports.blockClient = new client_1.ApolloClient({
    uri: 'https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks',
    cache: new client_1.InMemoryCache(),
    queryDeduplication: true,
    defaultOptions: {
        watchQuery: {
            fetchPolicy: 'network-only',
        },
        query: {
            fetchPolicy: 'network-only',
            errorPolicy: 'all',
        },
    },
});
//# sourceMappingURL=client.js.map