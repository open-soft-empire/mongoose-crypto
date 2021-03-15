const validateVersion = (mongoose_v) => {
	let allowedv = '5.0.0';
	let version = mongoose_v;

	allowedv = allowedv.split('.');
	version = version.split('.');

	const gt_check_i0 = allowedv[0] > version[0];
	const gt_check_i1 = (allowedv[0] == version[0] && allowedv[1] > version[1]);
	const gt_check_i2 = (allowedv[0] == version[0] && allowedv[1] == version[1] && allowedv[2] > version[2]);

	if (gt_check_i0 || gt_check_i1 || gt_check_i2) {
		return new Error('Mongoose Version not supported. Choose a version >= 5.0.0');
	}
	return;
}

const detach = (obj, fields) => {
	let encryptable_object = {};

	fields.forEach(field => {
		encryptable_object[field] = obj[field];
	});

	return encryptable_object;
}

const unique = (array) => {
	let unique_array = [];

	array.forEach(field => {
		if(unique_array.indexOf(field) === -1) {
			unique_array.push(field);
		}
	});

	return unique_array;
}

const removeClearText = (obj, fields) => {
	fields.forEach(field => {
		obj[field] = undefined;
	});

	return obj;
}

const setValueToFields = (obj, decrypted_obj, e_fields, o_fields) => {
	e_fields.forEach(field => {
		obj[field] = decrypted_obj[field];
	});
	obj._encrypted_chain = undefined;

	return obj;
}

module.exports = {
	validateVersion,
	detach,
	unique,
	removeClearText,
	setValueToFields,
};