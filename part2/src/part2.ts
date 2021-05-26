
/* 2.1 */

export const MISSING_KEY = '___MISSING___'

type PromisedStore<K, V> = {
    get(key: K): Promise<V>,
    set(key: K, value: V): Promise<void>,
    delete(key: K): Promise<void>
}


export function makePromisedStore<K, V>(): PromisedStore<K, V> {
    const asyncStore: Map<K, V> = new Map();
    return {
        get(key: K) {
            let value = asyncStore.get(key);
            if (value !== undefined) {
                return Promise.resolve(value);
            } else {
                return Promise.reject(MISSING_KEY);
            }
        },
        set(key: K, value: V) {
            asyncStore.set(key, value);
            return Promise.resolve();
        },
        delete(key: K) {
            return asyncStore.delete(key) ? Promise.resolve() : Promise.reject(MISSING_KEY);
        },
    }
}

export function getAll<K, V>(store: PromisedStore<K, V>, keys: K[]): Promise<V[]> {
    const promises = keys.map(key => store.get(key));
    return Promise.all(promises)
    .then((values) => Promise.resolve(values))
    .catch((error) => Promise.reject(error));
}

/* 2.2 */

export function asycMemo<T, R>(f: (param: T) => R): (param: T) => Promise<R> {
    const asyncStore: PromisedStore<T, R> = makePromisedStore();
    async function retFunc(param: T): Promise<R> {
        let value;
        try {
            value = await asyncStore.get(param);
            return value;
        } catch (err) {
            value = f(param);
            await asyncStore.set(param, value);
            return value;
        }
    }
    return retFunc;
}

/* 2.3 */

export function lazyFilter<T>(genFn: () => Generator<T>, filterFn: (x: T) => boolean): () => Generator<T> {
    const gen = genFn();
    function* lazyGenerator() {
        for (let i of gen) {
            if (filterFn(i)) {
                yield i;
            }
        }
    }
    return lazyGenerator;
}

export function lazyMap<T>(genFn: () => Generator<T>, mapFn: (x: T) => T): () => Generator<T> {
    const gen = genFn();
    function* lazyGenerator() {
        for (let i of gen) {
            yield mapFn(i);
        }
    }
    return lazyGenerator;
}

/* 2.4 */
export async function asyncWaterfallWithRetry(fns: [() => Promise<any>, ...((x: any) => Promise<any>)[]]): Promise<any> {
    let failureCounter = 0;
    let prevRes;
    while (failureCounter < 3) {
        try {
            prevRes = await fns[0]();
            failureCounter = 0;
            break;
        } catch(err){
            if (++failureCounter == 3) {
                return Promise.reject();
            } else {
                await new Promise((resolve) =>  setTimeout(()=> resolve(null), 2000));
            }
        }
    }
    let currRes;
    let first = true
    for (let func of fns) {
        if (first) {
            first = false;
            continue;
        }
        while (failureCounter < 3) {
            try {
                currRes = await func(prevRes);
                break;
            } catch(err) {
                if(++failureCounter === 3) return Promise.reject();
                await new Promise((resolve) =>  setTimeout(()=> resolve(null), 2000));
            }
        }
        failureCounter = 0;
        prevRes = currRes;
    }
    return currRes;
}