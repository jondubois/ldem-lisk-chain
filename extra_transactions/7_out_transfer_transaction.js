"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const bignum_1 = tslib_1.__importDefault(require("@liskhq/bignum"));
const lisk_transactions_1 = require("@liskhq/lisk-transactions");
const constants_1 = require("./constants");
const { verifyAmountBalance, validator } = lisk_transactions_1.utils;
const TRANSACTION_DAPP_REGISTERATION_TYPE = 5;
exports.outTransferAssetFormatSchema = {
    type: 'object',
    required: ['outTransfer'],
    properties: {
        outTransfer: {
            type: 'object',
            required: ['dappId', 'transactionId'],
            properties: {
                dappId: {
                    type: 'string',
                    format: 'id',
                },
                transactionId: {
                    type: 'string',
                    format: 'id',
                },
            },
        },
    },
};
class OutTransferTransaction extends lisk_transactions_1.BaseTransaction {
    constructor(rawTransaction) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {});
        this.asset = (tx.asset || { outTransfer: {} });
        this.containsUniqueData = true;
    }
    async prepare(store) {
        await store.account.cache([
            {
                address: this.senderId,
            },
            { address: this.recipientId },
        ]);
        await store.transaction.cache([
            {
                id: this.asset.outTransfer.dappId,
            },
            { id: this.asset.outTransfer.transactionId },
        ]);
    }
    assetToBytes() {
        const { dappId, transactionId } = this.asset.outTransfer;
        const outAppIdBuffer = Buffer.from(dappId, 'utf8');
        const outTransactionIdBuffer = Buffer.from(transactionId, 'utf8');
        return Buffer.concat([outAppIdBuffer, outTransactionIdBuffer]);
    }
    assetToJSON() {
        return this.asset;
    }
    verifyAgainstTransactions(transactions) {
        const sameTypeTransactions = transactions.filter(tx => tx.type === OutTransferTransaction.TYPE &&
            'outTransfer' in tx.asset &&
            this.asset.outTransfer.transactionId ===
                tx.asset.outTransfer.transactionId);
        return sameTypeTransactions.length > 0
            ? [
                new lisk_transactions_1.TransactionError('Out Transfer cannot refer to the same transactionId', this.id, '.asset.outTransfer.transactionId'),
            ]
            : [];
    }
    validateAsset() {
        validator.validate(exports.outTransferAssetFormatSchema, this.asset);
        const errors = lisk_transactions_1.convertToAssetError(this.id, validator.errors);
        if (this.amount.lte(0)) {
            errors.push(new lisk_transactions_1.TransactionError('Amount must be greater than zero for outTransfer transaction', this.id, '.amount', this.amount.toString()));
        }
        if (this.recipientId === '') {
            errors.push(new lisk_transactions_1.TransactionError('RecipientId must be set for outTransfer transaction', this.id, '.recipientId', this.recipientId));
        }
        return errors;
    }
    applyAsset(store) {
        const errors = [];
        const dappRegistrationTransaction = store.transaction.get(this.asset.outTransfer.dappId);
        if (!dappRegistrationTransaction ||
            dappRegistrationTransaction.type !== TRANSACTION_DAPP_REGISTERATION_TYPE) {
            errors.push(new lisk_transactions_1.TransactionError(`Application not found: ${this.asset.outTransfer.dappId}`, this.id, '.asset.outTransfer.dappId'));
        }
        const sender = store.account.get(this.senderId);
        const balanceError = verifyAmountBalance(this.id, sender, this.amount, this.fee);
        if (balanceError) {
            errors.push(balanceError);
        }
        const updatedBalance = new bignum_1.default(sender.balance).sub(this.amount);
        const updatedSender = Object.assign({}, sender, { balance: updatedBalance.toString() });
        store.account.set(updatedSender.address, updatedSender);
        const recipient = store.account.getOrDefault(this.recipientId);
        const updatedRecipientBalance = new bignum_1.default(recipient.balance).add(this.amount);
        if (updatedRecipientBalance.gt(constants_1.MAX_TRANSACTION_AMOUNT)) {
            errors.push(new lisk_transactions_1.TransactionError('Invalid amount', this.id, '.amount'));
        }
        const updatedRecipient = Object.assign({}, recipient, { balance: updatedRecipientBalance.toString() });
        store.account.set(updatedRecipient.address, updatedRecipient);
        return errors;
    }
    undoAsset(store) {
        const errors = [];
        const sender = store.account.get(this.senderId);
        const updatedBalance = new bignum_1.default(sender.balance).add(this.amount);
        if (updatedBalance.gt(constants_1.MAX_TRANSACTION_AMOUNT)) {
            errors.push(new lisk_transactions_1.TransactionError('Invalid amount', this.id, '.amount', this.amount.toString()));
        }
        const updatedSender = Object.assign({}, sender, { balance: updatedBalance.toString() });
        store.account.set(updatedSender.address, updatedSender);
        const recipient = store.account.getOrDefault(this.recipientId);
        const updatedRecipientBalance = new bignum_1.default(recipient.balance).sub(this.amount);
        if (updatedRecipientBalance.lt(0)) {
            errors.push(new lisk_transactions_1.TransactionError(`Account does not have enough LSK: ${recipient.address}, balance: ${recipient.balance}`, this.id, updatedRecipientBalance.toString()));
        }
        const updatedRecipient = Object.assign({}, recipient, { balance: updatedRecipientBalance.toString() });
        store.account.set(updatedRecipient.address, updatedRecipient);
        return errors;
    }
    assetFromSync(raw) {
        if (!raw.ot_dappId) {
            return undefined;
        }
        const outTransfer = {
            dappId: raw.ot_dappId,
            transactionId: raw.ot_outTransactionId,
        };
        return { outTransfer };
    }
}
OutTransferTransaction.TYPE = 7;
OutTransferTransaction.FEE = constants_1.OUT_TRANSFER_FEE.toString();
exports.OutTransferTransaction = OutTransferTransaction;
//# sourceMappingURL=7_out_transfer_transaction.js.map
