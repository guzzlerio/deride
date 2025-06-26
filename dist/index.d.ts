import EventEmitter, { EventEmitter as EventEmitter$1 } from 'node:events';

declare function func<T>(toWrap: T): void;

type Expectations<T extends object> = T & {
    invocation: (index: number) => void;
    call: () => unknown;
    called: {
        reset: () => void;
        times: (number: number, err: string) => Expectations<T>;
        withArg: (arg: unknown) => void;
        withArgs: (args: unknown) => void;
    };
};
declare function Expectations<T extends object>(obj: T, method: keyof T): Expectations<T>;

type Setup<T extends object> = T & {
    call: () => any;
    times: () => Setup<T>;
    once: () => Setup<T>;
    twice: () => Setup<T>;
    fallback: () => Setup<T>;
    toCallbackWith: () => Setup<T>;
    toDoThis: (fn: Function) => Setup<T>;
    toEmit: (...args: any[]) => Setup<T>;
    toIntercept: () => Setup<T>;
    toReject: () => Setup<T>;
    toRejectWith: () => Setup<T>;
    toResolve: () => Setup<T>;
    toResolveWith: () => Setup<T>;
    toReturn: (value: unknown) => Setup<T>;
    toThrow: (message: string) => Setup<T>;
    toTimeWarp: () => Setup<T>;
    when: () => Setup<T>;
};
declare function Setup<T extends object>(obj: T, method: keyof T, emitter: EventEmitter): Setup<T>;

type Wrapped<T extends object> = T & {
    called: T & {
        not: T;
        reset: () => void;
    };
    setup: SetupMethods<T>;
    expect: ExpectMethods<T>;
    on: (eventName: string, listener: Function) => EventEmitter$1;
    once: (eventName: string, listener: Function) => EventEmitter$1;
    emit: (eventName: string, listener: Function) => EventEmitter$1;
};
type Options = {
    debug: {
        prefix: string | undefined;
        suffix: string | undefined;
    };
};
type ExpectMethods<T extends object> = Record<keyof T, Expectations<T>>;
type SetupMethods<T extends object> = Record<keyof T, Setup<T>>;

declare function stub<T extends object>(target: T | string[], properties?: any, options?: Options): Wrapped<T>;

declare function wrap<T extends object>(obj: T, options?: Options): Wrapped<T>;

declare const deride: {
    func: typeof func;
    stub: typeof stub;
    wrap: typeof wrap;
};

export { deride as default, deride };
