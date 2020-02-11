"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisk_transactions_1 = require("@liskhq/lisk-transactions");
const { FIXED_POINT, MAX_TRANSACTION_AMOUNT } = lisk_transactions_1.constants;
exports.FIXED_POINT = FIXED_POINT;
exports.MAX_TRANSACTION_AMOUNT = MAX_TRANSACTION_AMOUNT;
exports.TRANSACTION_DAPP_TYPE = 5;
exports.IN_TRANSFER_FEE = FIXED_POINT * 0.1;
exports.OUT_TRANSFER_FEE = FIXED_POINT * 0.1;
exports.DAPP_FEE = FIXED_POINT * 25;
//# sourceMappingURL=constants.js.map
