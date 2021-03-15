const mongoose = require('mongoose');
const crypto = require('crypto');
const { validateVersion, detach, unique, removeClearText, setValueToFields } = require('../utils/helper');
const constants = require('./constants');
const symCiph = require('../utils/encrypt');
const symDeciph = require('../utils/decrypt');

const version_check = validateVersion(mongoose.version);

const cryptor = (schema, options) => {

	const omit = options.omit || [];
	const encryption_key = options.encryption_key || process.env.ENCRYPTION_KEY;
	const iv_length = process.env.IV_LENGTH || 16;
	const encryption_algorithm = options.encryption_algorithm || process.env.ENCRYPTION_ALGORITHM || 'AES-256-CBC';
	const digestion_module = options.digestion_module || process.env.DIGESTION_MODULE || 'HEX';
	const decrypt_post_mutation = options.decrypt_post_mutation || true;

	let encryptable_fields, omittable_fields;

	if(!encryption_key) {
		return new Error(constants.missing_key);
	}

	if(omit && !Array.isArray(omit)) {
		return new Error(constants.omit_not_an_array);
	}

	if(!schema.paths._encrypted_chain) {
		schema.add({
			_encrypted_chain: {
				type: String
			}
		});
	}

	omittable_fields = unique(['_id', '_encrypted_chain'].concat(omit));

	encryptable_fields = [];
	
	//Move below loop to helper.js after testing and make use of unique function method
	for (let key of Object.keys(schema.paths)) {
		if(omittable_fields.indexOf(key) === -1 && !schema.paths[key]._index) {
			encryptable_fields.push(key);
		}
	}

	schema.pre('init', async function (data, next) {
		console.log(data, 'found data');
		if(data._encrypted_chain) {
			this.decrypt.call(data)
			return data;
		} 
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

	schema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
		console.log(this, 'hello');
	});

	if(decrypt_post_mutation) {
		schema.post('save', async function (doc, next) {
			this.decrypt.call(doc);
			return doc;
		});
	}

	schema.methods.encrypt = function (callback) {
		let that = this;

		const encryptable_object = detach (that, encryptable_fields);
		const encrypted_object = symCiph (encryptable_object, encryption_key, iv_length, encryption_algorithm, digestion_module);

		that._encrypted_chain = encrypted_object;

		that = removeClearText (that, encryptable_fields);

		return callback(null);
	}

	schema.methods.decrypt = function () {
		let that = this;

		if (that._encrypted_chain) {
			let cipher_text = that._encrypted_chain;
			const decrypted_object = symDeciph (cipher_text, encryption_key, encryption_algorithm, digestion_module);

			that = setValueToFields (that, decrypted_object, encryptable_fields, omittable_fields);
		}
	}

}

module.exports = cryptor;