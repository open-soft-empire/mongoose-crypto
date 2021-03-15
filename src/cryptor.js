const mongoose = require('mongoose');
const crypto = require('crypto');
const { validateVersion, detach, unique, removeClearText, setValueToFields, encryptFields, decryptFields } = require('../utils/helper');
const constants = require('./constants');
const symCiph = require('../utils/encrypt');
const symDeciph = require('../utils/decrypt');

const version_check = validateVersion(mongoose.version);

const cryptor = (schema, options) => {

	const omit = options.omit || [];
	const encrypt = options.encrypt || [];
	const encryption_key = options.encryption_key || process.env.ENCRYPTION_KEY;
	const iv_length = process.env.IV_LENGTH || 16;
	const encryption_algorithm = options.encryption_algorithm || process.env.ENCRYPTION_ALGORITHM || 'AES-256-CBC';
	const digestion_module = options.digestion_module || process.env.DIGESTION_MODULE || 'HEX';
	const encryption_type = options.encryption_type || 'FIELD_ENCRYPTION'; //OBJECT_ENCRYPTION is another supported format
	const decrypt_post_mutation = options.decrypt_post_mutation || true;

	let encryptable_fields, omittable_fields, default_omit;
	let return_chain_post_query = false;

	if(!encryption_key) {
		throw new Error(constants.missing_key);
	}

	if(encrypt.length > 0 && omit.length > 0) {
		throw new Error("You cannot have values in both encrypt and omit fields");
	}

	if(omit && !Array.isArray(omit)) {
		throw new Error(constants.omit_not_an_array);
	}

	if(encrypt && !Array.isArray(encrypt)) {
		throw new Error("encrypt should be an array")
	}

	if(!schema.paths._encrypted_chain && encryption_type === 'OBJECT_ENCRYPTION') {
		schema.add({
			_encrypted_chain: {
				type: String
			}
		});
	}

	if(encryption_type === 'OBJECT_ENCRYPTION') {
		default_omit = ['_id', '_encrypted_chain'];
	} else {
		default_omit = ['_id'];
	}

	omittable_fields = unique(default_omit.concat(omit));

	encryptable_fields = encrypt; 
	
	//Move below loop to helper.js after testing and make use of unique function method
	if(encryptable_fields.length === 0) { //If no encryptable fields are mentioned, then default omitable fields are removed
		for (let key of Object.keys(schema.paths)) {
			if(omittable_fields.indexOf(key) === -1 && !schema.paths[key]._index) {
				encryptable_fields.push(key);
			}
		}
	}

	if(encryptable_fields.length > 0) {
		for (let key of Object.keys(schema.paths)) {
			if(omittable_fields.indexOf(key) >= 0 || schema.paths[key]._index) {
				encryptable_fields = encryptable_fields.filter(elem => elem !== 'key');
			}
		}
	}

	schema.pre('init', async function (data, next) {
			this.decrypt.call(data)
			return data;
	});

	schema.pre('save', function (next) {
		let that = this;

		that.encrypt(function(err) {
			if (err) {
				next(err);
			} else if (that.isNew) {
				that.markModified();
				next();	
			}
		});
	});

	// schema.pre(['findOneAndUpdate'], async function(next) {
	// 	return_chain_post_query = true;
	// 	let docToUpdate = await this.model.findOne(this.getQuery());
	// 	docToUpdate 
	// });

	// schema.post(['findOneAndUpdate'], async function(next) {
	// 	return_chain_post_query = false;
	// })

	if(decrypt_post_mutation) {
		schema.post('save', async function (doc, next) {
			this.decrypt.call(doc);
			return doc;
		});
	}

	schema.methods.encrypt = function (callback) {
		let that = this;

		if (encryption_type === 'OBJECT_ENCRYPTION') {
			const encryptable_object = detach (that, encryptable_fields);
			const encrypted_object = symCiph (encryptable_object, encryption_key, iv_length, encryption_algorithm, digestion_module);

			that._encrypted_chain = encrypted_object;

			that = removeClearText (that, encryptable_fields);
		} else {
			const encrypted_that = encryptFields (that, encryptable_fields, encryption_key, iv_length, encryption_algorithm, digestion_module);
		}

		return callback(null);
	}

	schema.methods.decrypt = function () {
		let that = this;

		if (encryption_type === 'OBJECT_ENCRYPTION' && that._encrypted_chain) {
			let cipher_text = that._encrypted_chain;
			const decrypted_object = symDeciph (cipher_text, encryption_key, encryption_algorithm, digestion_module);

			that = setValueToFields (that, decrypted_object, encryptable_fields, omittable_fields, return_chain_post_query);
		} else  {
			that = decryptFields (that, encryptable_fields, encryption_key, encryption_algorithm, digestion_module);
		}
	}

}

module.exports = cryptor;
