"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const bignum_1 = tslib_1.__importDefault(require("@liskhq/bignum"));
const lisk_transactions_1 = require("@liskhq/lisk-transactions");
const constants_1 = require("./constants");
const { convertBeddowsToLSK, verifyAmountBalance, validator } = lisk_transactions_1.utils;
exports.inTransferAssetFormatSchema = {
    type: 'object',
    required: ['inTransfer'],
    properties: {
        inTransfer: {
            type: 'object',
            required: ['dappId'],
            properties: {
                dappId: {
                    type: 'string',
                    format: 'id',
                },
            },
        },
    },
};
class InTransferTransaction extends lisk_transactions_1.BaseTransaction {
    constructor(rawTransaction) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {});
        this.asset = (tx.asset || { inTransfer: {} });
    }
    assetToBytes() {
        return Buffer.from(this.asset.inTransfer.dappId, 'utf8');
    }
    async prepare(store) {
        await store.account.cache([{ address: this.senderId }]);
        const transactions = await store.transaction.cache([
            {
                id: this.asset.inTransfer.dappId,
            },
        ]);
        const dappTransaction = transactions && transactions.length > 0
            ? transactions.find(tx => tx.type === constants_1.TRANSACTION_DAPP_TYPE &&
                tx.id === this.asset.inTransfer.dappId)
            : undefined;
        if (dappTransaction) {
            await store.account.cache([
                { address: dappTransaction.senderId },
            ]);
        }
    }
    assetToJSON() {
        return this.asset;
    }
    verifyAgainstTransactions(_) {
        return [];
    }
    validateAsset() {
        validator.validate(exports.inTransferAssetFormatSchema, this.asset);
        const errors = lisk_transactions_1.convertToAssetError(this.id, validator.errors);
        if (this.recipientId) {
            errors.push(new lisk_transactions_1.TransactionError('RecipientId is expected to be undefined.', this.id, '.recipientId', this.recipientId));
        }
        if (this.recipientPublicKey) {
            errors.push(new lisk_transactions_1.TransactionError('RecipientPublicKey is expected to be undefined.', this.id, '.recipientPublicKey', this.recipientPublicKey));
        }
        if (this.amount.lte(0)) {
            errors.push(new lisk_transactions_1.TransactionError('Amount must be greater than 0', this.id, '.amount', this.amount.toString(), '0'));
        }
        return errors;
    }
    applyAsset(store) {
        const errors = [];
        const idExists = store.transaction.find((transaction) => transaction.type === constants_1.TRANSACTION_DAPP_TYPE &&
            transaction.id === this.asset.inTransfer.dappId);
        if (!idExists) {
            errors.push(new lisk_transactions_1.TransactionError(`Application not found: ${this.asset.inTransfer.dappId}`, this.id, this.asset.inTransfer.dappId));
        }
        const sender = store.account.get(this.senderId);
        const balanceError = verifyAmountBalance(this.id, sender, this.amount, this.fee);
        if (balanceError) {
            errors.push(balanceError);
        }
        const updatedBalance = new bignum_1.default(sender.balance).sub(this.amount);
        const updatedSender = Object.assign({}, sender, { balance: updatedBalance.toString() });
        store.account.set(updatedSender.address, updatedSender);
        const dappTransaction = store.transaction.get(this.asset.inTransfer.dappId);
        const recipient = store.account.get(dappTransaction.senderId);
        const updatedRecipientBalance = new bignum_1.default(recipient.balance).add(this.amount);
        const updatedRecipient = Object.assign({}, recipient, { balance: updatedRecipientBalance.toString() });
        store.account.set(updatedRecipient.address, updatedRecipient);
        return errors;
    }
    undoAsset(store) {
        const errors = [];
        const sender = store.account.get(this.senderId);
        const updatedBalance = new bignum_1.default(sender.balance).add(this.amount);
        const updatedSender = Object.assign({}, sender, { balance: updatedBalance.toString() });
        store.account.set(updatedSender.address, updatedSender);
        const dappTransaction = store.transaction.get(this.asset.inTransfer.dappId);
        const recipient = store.account.get(dappTransaction.senderId);
        const updatedRecipientBalance = new bignum_1.default(recipient.balance).sub(this.amount);
        if (updatedRecipientBalance.lt(0)) {
            errors.push(new lisk_transactions_1.TransactionError(`Account does not have enough LSK: ${recipient.address}, balance: ${convertBeddowsToLSK(recipient.balance)}.`, this.id));
        }
        const updatedRecipient = Object.assign({}, recipient, { balance: updatedRecipientBalance.toString() });
        store.account.set(updatedRecipient.address, updatedRecipient);
        return errors;
    }
    assetFromSync(raw) {
        if (!raw.in_dappId) {
            return undefined;
        }
        const inTransfer = {
            dappId: raw.in_dappId,
        };
        return { inTransfer };
    }
}
InTransferTransaction.TYPE = 6;
InTransferTransaction.FEE = constants_1.IN_TRANSFER_FEE.toString();
exports.InTransferTransaction = InTransferTransaction;
//# sourceMappingURL=6_in_transfer_transaction.js.map
