"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Takes `block`s output from implementations of `AbstractActionReader` and processes their actions through
 * `Updater`s and `Effect`s. Pass an object exposing a persistence API as `state` in the `handleWithState`
 * method. Persist and retrieve information about the last block processed with `updateIndexState` and
 * `loadIndexState`.
 */
class AbstractActionHandler {
    constructor(updaters, effects) {
        this.updaters = updaters;
        this.effects = effects;
        this.lastProcessedBlockNumber = 0;
        this.lastProcessedBlockHash = "";
    }
    /**
     * Receive block, validate, and handle actions with updaters and effects
     */
    handleBlock(block, isRollback, isFirstBlock, isReplay = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const { blockInfo } = block;
            if (isRollback || (isReplay && isFirstBlock)) {
                const rollbackBlockNumber = blockInfo.blockNumber - 1;
                const rollbackCount = this.lastProcessedBlockNumber - rollbackBlockNumber;
                console.info(`Rolling back ${rollbackCount} blocks to block ${rollbackBlockNumber}...`);
                yield this.rollbackTo(rollbackBlockNumber);
                yield this.refreshIndexState();
            }
            else if (!this.lastProcessedBlockHash && this.lastProcessedBlockNumber === 0) {
                yield this.refreshIndexState();
            }
            const nextBlockNeeded = this.lastProcessedBlockNumber + 1;
            // Just processed this block; skip
            if (blockInfo.blockNumber === this.lastProcessedBlockNumber
                && blockInfo.blockHash === this.lastProcessedBlockHash) {
                return [false, 0];
            }
            // If it's the first block but we've already processed blocks, seek to next block
            if (isFirstBlock && this.lastProcessedBlockHash) {
                return [true, nextBlockNeeded];
            }
            // Only check if this is the block we need if it's not the first block
            if (!isFirstBlock) {
                if (blockInfo.blockNumber !== nextBlockNeeded) {
                    return [true, nextBlockNeeded];
                }
                // Block sequence consistency should be handled by the ActionReader instance
                if (blockInfo.previousBlockHash !== this.lastProcessedBlockHash) {
                    yield this.handleHashMismatch(blockInfo.blockNumber - 1);
                    yield this.refreshIndexState();
                    // throw Error("Block hashes do not match; block not part of current chain.")
                }
            }
            const handleWithArgs = (state, context = {}) => __awaiter(this, void 0, void 0, function* () {
                yield this.handleActions(state, block, context, isReplay);
            });
            yield this.handleWithState(handleWithArgs);
            return [false, 0];
        });
    }
    /**
     * Process actions against deterministically accumulating updater functions.
     */
    runUpdaters(state, block, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const { actions, blockInfo } = block;
            for (const action of actions) {
                for (const updater of this.updaters) {
                    if (action.type === updater.actionType) {
                        const { payload } = action;
                        yield updater.updater(state, payload, blockInfo, context);
                    }
                }
            }
        });
    }
    /**
     * Process actions against asynchronous side effects.
     */
    runEffects(state, block, context) {
        const { actions, blockInfo } = block;
        for (const action of actions) {
            for (const effect of this.effects) {
                if (action.type === effect.actionType) {
                    const { payload } = action;
                    effect.effect(state, payload, blockInfo, context);
                }
            }
        }
    }
    /**
     * Calls `runUpdaters` and `runEffects` on the given actions
     */
    handleActions(state, block, context, isReplay) {
        return __awaiter(this, void 0, void 0, function* () {
            const { blockInfo } = block;
            yield this.runUpdaters(state, block, context);
            if (!isReplay) {
                this.runEffects(state, block, context);
            }
            yield this.updateIndexState(state, block, isReplay, context);
            this.lastProcessedBlockNumber = blockInfo.blockNumber;
            this.lastProcessedBlockHash = blockInfo.blockHash;
        });
    }
    refreshIndexState() {
        return __awaiter(this, void 0, void 0, function* () {
            const { blockNumber, blockHash } = yield this.loadIndexState();
            this.lastProcessedBlockNumber = blockNumber;
            this.lastProcessedBlockHash = blockHash;
        });
    }
}
exports.AbstractActionHandler = AbstractActionHandler;
