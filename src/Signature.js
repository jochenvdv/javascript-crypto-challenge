const nacl = require('libsodium-wrappers');

module.exports = async () => {
    await nacl.ready;

    const keypair = nacl.crypto_sign_keypair();

    return Object.freeze({
        verifyingKey: keypair.publicKey,
        sign: (msg) => nacl.crypto_sign(msg, keypair.privateKey)
    });
};