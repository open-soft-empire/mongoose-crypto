const crypto =require('crypto');

const SymDeciph = (cipher, encryption_key, cipher_algorithm, digestion_module, type) => {
	if(cipher) {
		const iv_push = cipher.slice(0, 8);
		const encrypted_shift = cipher.slice(8, 24);
		const iv_grid = cipher.slice(24, 40);
		const encrypted_garbage = cipher.slice(40, -8);
		const iv_pull = cipher.slice(-8);

		const iv_value = iv_push + iv_grid + iv_pull;
		const data = encrypted_shift + encrypted_garbage;

		const iv = Buffer.from(iv_value, digestion_module);

		const encryptedText = Buffer.from(data, digestion_module);
		const decipher = crypto.createDecipheriv(cipher_algorithm, Buffer.from(encryption_key), iv);
		
		let decrypted = decipher.update(encryptedText);

		decrypted = Buffer.concat([decrypted, decipher.final()]);

		let decrypted_val;

		if (type === 'field') {
			decrypted_val = decrypted;
		} else {
			decrypted_val = JSON.parse(decrypted);
		}

		return decrypted_val;
	} else {
		return;
	}
}

module.exports = SymDeciph;
