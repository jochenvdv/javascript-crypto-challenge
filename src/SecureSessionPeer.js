const nacl = require('libsodium-wrappers');

const Decryptor = require('../src/Decryptor');
const Encryptor = require('../src/Encryptor');

_client = null;
_server = null;

module.exports = async () => {
    await nacl.ready;

    let isClient = null;

    if (!_server) {
        isClient = false;
        const keypair = nacl.crypto_kx_keypair();

        _server = {
            privateKey: keypair.privateKey,
            publicKey: keypair.publicKey
        }
    } else if (!_client) {
        isClient = true;
        const keypair = nacl.crypto_kx_keypair();

        const clientKeys = nacl.crypto_kx_client_session_keys(keypair.publicKey, keypair.privateKey, _server.publicKey);
        const serverKeys = nacl.crypto_kx_server_session_keys(_server.publicKey, _server.privateKey, keypair.publicKey);

        _client = {
            privateKey: keypair.privateKey,
            publicKey: keypair.publicKey,
            sessionKeys: clientKeys,
            decryptor: await Decryptor(clientKeys.sharedRx),
            encryptor: await Encryptor(clientKeys.sharedTx)
        };

        _server.sessionKeys = serverKeys;
        _server.decryptor = await Decryptor(serverKeys.sharedRx);
        _server.encryptor = await Encryptor(serverKeys.sharedTx);
    } else {
        throw new Error('Too many peers');
    }

    return Object.freeze({
        publicKey: isClient ? _client.publicKey : _server.publicKey,
        encrypt: (msg) => _encrypt(isClient, msg),
        decrypt: (ciphertext, nonce) => _decrypt(isClient, ciphertext, nonce),
        send: (msg) => {
            const encryptedMsg = _encrypt(isClient, msg);

            if (isClient) {
                _server.message = encryptedMsg;
            } else {
                _client.message = encryptedMsg;
            }
        },
        receive: () => {
            console.log(_client);
            console.log(_server);
            let msg = null;

            if (isClient) {
                msg = _client.message;
            } else {
                msg = _server.message;
            }

            return _decrypt(isClient, msg.ciphertext, msg.nonce);
        }
    });
};

function _decrypt(isClient, ciphertext, nonce) {
    if (isClient) {
        return _client.decryptor.decrypt(ciphertext, nonce);
    } else {
        return _server.decryptor.decrypt(ciphertext, nonce);
    }
}

function _encrypt(isClient, msg) {
    if (isClient) {
        return _client.encryptor.encrypt(msg);
    } else {
        return _server.encryptor.encrypt(msg);
    }
}