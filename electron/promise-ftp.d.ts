// Minimal ambient declaration for `promise-ftp`, which ships no published types.
//
// We only declare the subset of the API that main.ts actually uses. This is a
// deliberate hand-wave around fully typing a 3rd-party lib (per the Phase 6
// brief) -- just enough for `tsc --noEmit` to be happy and to catch typos in
// our own usage.

declare module 'promise-ftp' {
  import type { Readable } from 'stream';

  interface PromiseFtpConnectOptions {
    host?: string;
    port?: number | string;
    user?: string;
    password?: string;
    /** `true` → explicit FTPS (AUTH TLS); `'implicit'` → implicit FTPS (port 990).
     *  Passed through to the underlying @icetee/ftp client. */
    secure?: boolean | 'implicit';
    secureOptions?: object;
  }

  class PromiseFtp {
    constructor();
    connect(options: PromiseFtpConnectOptions): Promise<string>;
    end(): Promise<boolean>;
    destroy(): boolean;
    getConnectionStatus(): string;
    ascii(): Promise<unknown>;
    site(command: string): Promise<unknown>;
    list(path: string): Promise<string[]>;
    put(input: Buffer | string | Readable, destPath: string): Promise<unknown>;
    get(path: string): Promise<Readable>;
    delete(path: string): Promise<unknown>;
    cwd(path: string): Promise<unknown>;
  }

  export = PromiseFtp;
}
