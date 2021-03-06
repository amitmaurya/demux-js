import { Block, Effect, IndexState, Updater } from "./interfaces";
/**
 * Takes `block`s output from implementations of `AbstractActionReader` and processes their actions through
 * `Updater`s and `Effect`s. Pass an object exposing a persistence API as `state` in the `handleWithState`
 * method. Persist and retrieve information about the last block processed with `updateIndexState` and
 * `loadIndexState`.
 */
export declare abstract class AbstractActionHandler {
    protected updaters: Updater[];
    protected effects: Effect[];
    protected lastProcessedBlockNumber: number;
    protected lastProcessedBlockHash: string;
    constructor(updaters: Updater[], effects: Effect[]);
    /**
     * Receive block, validate, and handle actions with updaters and effects
     */
    handleBlock(block: Block, isRollback: boolean, isFirstBlock: boolean, isReplay?: boolean): Promise<[boolean, number]>;
    /**
     * Updates the `lastProcessedBlockNumber` and `lastProcessedBlockHash` meta state, coinciding with the block
     * that has just been processed. These are the same values read by `updateIndexState()`.
     */
    protected abstract updateIndexState(state: any, block: Block, isReplay: boolean, context?: any): Promise<void>;
    /**
     * Returns a promise for the `lastProcessedBlockNumber` and `lastProcessedBlockHash` meta state,
     * coinciding with the block that has just been processed.
     * These are the same values written by `updateIndexState()`.
     * @returns A promise that resolves to an `IndexState`
     */
    protected abstract loadIndexState(): Promise<IndexState>;
    /**
     * Calls handleActions with the appropriate state passed by calling the `handle` parameter function.
     * Optionally, pass in a `context` object as a second parameter.
     */
    protected abstract handleWithState(handle: (state: any, context?: any) => void): Promise<void>;
    /**
     * Process actions against deterministically accumulating updater functions.
     */
    protected runUpdaters(state: any, block: Block, context: any): Promise<void>;
    /**
     * Process actions against asynchronous side effects.
     */
    protected runEffects(state: any, block: Block, context: any): void;
    /**
     * Will run when a rollback block number is passed to handleActions. Implement this method to
     * handle reversing actions full blocks at a time, until the last applied block is the block
     * number passed to this method.
     */
    protected abstract rollbackTo(blockNumber: number): Promise<void>;
    protected abstract handleHashMismatch(blockNumber: number): Promise<void>;
    /**
     * Calls `runUpdaters` and `runEffects` on the given actions
     */
    protected handleActions(state: any, block: Block, context: any, isReplay: boolean): Promise<void>;
    private refreshIndexState;
}
