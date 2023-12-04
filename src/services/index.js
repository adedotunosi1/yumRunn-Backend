const AccountModule = require('./authServices');


//Auth Paths
exports.createNewUser = async (details) => AccountModule.register(details);