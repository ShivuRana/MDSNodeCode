const CryptoJS = require('crypto-js')

const secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3'

const encrypt = (text) => {
    const encrypted = CryptoJS.AES.encrypt(text, secretKey).toString()
    return encrypted
}

const decrypt = (encrypted) => {
    const cipher = CryptoJS.AES.decrypt(encrypted, secretKey)
    const decrypted = cipher.toString(CryptoJS.enc.Utf8)
    return decrypted
}

module.exports = {
    encrypt,
    decrypt
}