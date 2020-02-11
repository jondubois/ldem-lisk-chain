"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisk_transactions_1 = require("@liskhq/lisk-transactions");
const constants_1 = require("./constants");
const { validator, stringEndsWith } = lisk_transactions_1.utils;
exports.dappAssetFormatSchema = {
    type: 'object',
    required: ['dapp'],
    properties: {
        dapp: {
            type: 'object',
            required: ['name', 'type', 'category'],
            properties: {
                icon: {
                    type: 'string',
                    format: 'uri',
                    maxLength: 2000,
                },
                category: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 8,
                },
                type: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 1,
                },
                link: {
                    type: 'string',
                    format: 'uri',
                    minLength: 0,
                    maxLength: 2000,
                },
                tags: {
                    type: 'string',
                    format: 'noNullByte',
                    maxLength: 160,
                },
                description: {
                    type: 'string',
                    format: 'noNullByte',
                    maxLength: 160,
                },
                name: {
                    type: 'string',
                    format: 'noNullByte',
                    minLength: 1,
                    maxLength: 32,
                },
            },
        },
    },
};
class DappTransaction extends lisk_transactions_1.BaseTransaction {
    constructor(rawTransaction) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {});
        this.asset = (tx.asset || { dapp: {} });
        this.containsUniqueData = true;
        if (this.asset && this.asset.dapp && typeof this.asset.dapp === 'object') {
            this.asset.dapp.description = this.asset.dapp.description || undefined;
            this.asset.dapp.icon = this.asset.dapp.icon || undefined;
            this.asset.dapp.tags = this.asset.dapp.tags || undefined;
        }
    }
    assetToBytes() {
        const DAPP_TYPE_LENGTH = 4;
        const DAPP_CATEGORY_LENGTH = 4;
        const { name, description, tags, link, icon, type, category, } = this.asset.dapp;
        const nameBuffer = Buffer.from(name, 'utf8');
        const linkBuffer = link ? Buffer.from(link, 'utf8') : Buffer.alloc(0);
        const typeBuffer = Buffer.alloc(DAPP_TYPE_LENGTH);
        typeBuffer.writeIntLE(type, 0, DAPP_TYPE_LENGTH);
        const categoryBuffer = Buffer.alloc(DAPP_CATEGORY_LENGTH);
        categoryBuffer.writeIntLE(category, 0, DAPP_CATEGORY_LENGTH);
        const descriptionBuffer = description
            ? Buffer.from(description, 'utf8')
            : Buffer.alloc(0);
        const tagsBuffer = tags ? Buffer.from(tags, 'utf8') : Buffer.alloc(0);
        const iconBuffer = icon ? Buffer.from(icon, 'utf8') : Buffer.alloc(0);
        return Buffer.concat([
            nameBuffer,
            descriptionBuffer,
            tagsBuffer,
            linkBuffer,
            iconBuffer,
            typeBuffer,
            categoryBuffer,
        ]);
    }
    assetToJSON() {
        return this.asset;
    }
    async prepare(store) {
        await store.account.cache([
            {
                address: this.senderId,
            },
        ]);
        await store.transaction.cache([
            {
                dapp_name: this.asset.dapp.name,
            },
            { dapp_link: this.asset.dapp.link },
        ]);
    }
    verifyAgainstTransactions(transactions) {
        const sameTypeTransactions = transactions.filter(tx => tx.type === this.type);
        const errors = sameTypeTransactions.filter(tx => 'dapp' in tx.asset &&
            tx.asset.dapp.name === this.asset.dapp.name).length > 0
            ? [
                new lisk_transactions_1.TransactionError('Dapp with the same name already exists.', this.id, '.asset.dapp.name', this.asset.dapp.name),
            ]
            : [];
        if (sameTypeTransactions.filter(tx => 'dapp' in tx.asset &&
            this.asset.dapp.link &&
            this.asset.dapp.link === tx.asset.dapp.link).length > 0) {
            errors.push(new lisk_transactions_1.TransactionError('Dapp with the same link already exists.', this.id, '.asset.dapp.link', this.asset.dapp.link));
        }
        return errors;
    }
    validateAsset() {
        validator.validate(exports.dappAssetFormatSchema, this.asset);
        const errors = lisk_transactions_1.convertToAssetError(this.id, validator.errors);
        if (!this.amount.eq(0)) {
            errors.push(new lisk_transactions_1.TransactionError('Amount must be zero for dapp transaction', this.id, '.amount', this.amount.toString(), '0'));
        }
        if (this.recipientId) {
            errors.push(new lisk_transactions_1.TransactionError(`RecipientId is expected to be undefined`, this.id, '.recipientId'));
        }
        const validLinkSuffix = ['.zip'];
        if (errors.length > 0) {
            return errors;
        }
        if (this.asset.dapp.link &&
            !stringEndsWith(this.asset.dapp.link, validLinkSuffix)) {
            errors.push(new lisk_transactions_1.TransactionError(`Dapp icon must have suffix ${validLinkSuffix.toString()}`, this.id, '.asset.dapp.link', this.asset.dapp.link));
        }
        const validIconSuffix = ['.png', '.jpeg', '.jpg'];
        if (this.asset.dapp.icon &&
            !stringEndsWith(this.asset.dapp.icon, validIconSuffix)) {
            errors.push(new lisk_transactions_1.TransactionError(`Dapp icon must have suffix of one of ${validIconSuffix.toString()}`, this.id, '.asset.dapp.icon', this.asset.dapp.icon));
        }
        if (this.asset.dapp.tags) {
            const tags = this.asset.dapp.tags
                .split(',')
                .map(tag => tag.trim())
                .sort();
            if (tags.length !== new Set(tags).size) {
                errors.push(new lisk_transactions_1.TransactionError(`Dapp tags must have unique set`, this.id, '.asset.dapp.tags', this.asset.dapp.tags));
            }
        }
        return errors;
    }
    applyAsset(store) {
        const errors = [];
        const nameExists = store.transaction.find((transaction) => transaction.type === DappTransaction.TYPE &&
            transaction.id !== this.id &&
            transaction.asset.dapp &&
            transaction.asset.dapp.name === this.asset.dapp.name);
        if (nameExists) {
            errors.push(new lisk_transactions_1.TransactionError(`Application name already exists: ${this.asset.dapp.name}`, this.id, this.asset.dapp.name));
        }
        const linkExists = store.transaction.find((transaction) => transaction.type === DappTransaction.TYPE &&
            transaction.id !== this.id &&
            transaction.asset.dapp &&
            transaction.asset.dapp.link === this.asset.dapp.link);
        if (linkExists) {
            errors.push(new lisk_transactions_1.TransactionError(`Application link already exists: ${this.asset.dapp.link}`, this.id, this.asset.dapp.link));
        }
        return errors;
    }
    undoAsset(_) {
        return [];
    }
    assetFromSync(raw) {
        if (!raw.dapp_name) {
            return undefined;
        }
        const dapp = {
            name: raw.dapp_name,
            description: raw.dapp_description,
            tags: raw.dapp_tags,
            type: raw.dapp_type,
            link: raw.dapp_link,
            category: raw.dapp_category,
            icon: raw.dapp_icon,
        };
        return { dapp };
    }
}
DappTransaction.TYPE = 5;
DappTransaction.FEE = constants_1.DAPP_FEE.toString();
exports.DappTransaction = DappTransaction;
//# sourceMappingURL=5_dapp_transaction.js.map
