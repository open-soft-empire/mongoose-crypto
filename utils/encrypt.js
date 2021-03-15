const crypto = require('crypto');

const SymCiph = (obj, encryption_key, iv_length, cipher_algorithm, digestion_module) => {
	if(obj) {
		const type = typeof (obj);
		const iv = crypto.randomBytes(Number(iv_length));
		let cipher = crypto.createCipheriv(cipher_algorithm, Buffer.from(encryption_key), iv);

		let encryptable_val;

		if (type === 'string') {
			encryptable_val = obj;
		} else {
			encryptable_val = JSON.stringify(obj);
		}

		let encrypted = cipher.update(encryptable_val);

		encrypted = Buffer.concat([encrypted, cipher.final()]);

		const iv_value = iv.toString(digestion_module);
		const encrypted_value = encrypted.toString(digestion_module);

		const iv_push = iv_value.slice(0, 8);
		const iv_grid = iv_value.slice(8, 24);
		const iv_pull = iv_value.slice(24);
		
		const encrypted_shift = encrypted_value.slice(0, 16);
		const encrypted_garbage = encrypted_value.slice(16);

	 	let block = iv_push + encrypted_shift + iv_grid + encrypted_garbage + iv_pull;

	 	return block;
	} else {
		return;
	}
}

module.exports = SymCiph;
