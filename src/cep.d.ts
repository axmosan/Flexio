/**
 * TypeScript declarations for the CEP runtime globals.
 * These are injected by the Adobe CEP runtime (Chromium Embedded Framework).
 */

interface CepFsResult<T = string> {
  err: number  // 0 = success
  data: T
}

interface CepFsStat {
  birthtime: number
  atime: number
  mtime: number
  ctime: number
  mtimeMs: number
  size: number
  isDir: boolean
  isFile: boolean
}

interface CepFs {
  readFile(path: string, encoding: 'UTF-8' | 'base64' | 'binary'): CepFsResult<string>
  writeFile(path: string, data: string, encoding?: string): CepFsResult<never>
  deleteFile(path: string): CepFsResult<never>
  makeDir(path: string): CepFsResult<never>
  rename(oldPath: string, newPath: string): CepFsResult<never>
  copyFile(src: string, dst: string): CepFsResult<never>
  stat(path: string): CepFsResult<CepFsStat>
  readdir(path: string): CepFsResult<string[]>
}

interface Window {
  /** Native CEP object — injected by the Adobe runtime */
  __adobe_cep__?: {
    getHostEnvironment(): string
    getExtensionId(): string
    evalScript(script: string, callback: (result: string) => void): void
    getSystemPath(): string
    requestOpenExtension(id: string, params: string): void
    closeExtension(): void
    getSkinInfo(): string
    addEventListener(type: string, listener: (event: unknown) => void): void
    removeEventListener(type: string, listener: (event: unknown) => void): void
    dispatchEvent(eventJson: string): void
  }
  /** CEP file-system API — always available in CEP panels */
  cep?: {
    fs: CepFs
    process?: {
      createProcess(path: string, args: string[]): unknown
    }
  }
  /** CSInterface constructor — loaded via <script src="./lib/CSInterface.js"> */
  CSInterface: new () => {
    getHostEnvironment(): { appName: string; appVersion: string; appLocale: string }
    getExtensionID(): string
    evalScript(script: string, callback?: (result: string) => void): void
    getSystemPath(pathType: string): string
    requestOpenExtension(id: string, params: string): void
    closeExtension(): void
    addEventListener(type: string, listener: (event: unknown) => void): void
    removeEventListener(type: string, listener: (event: unknown) => void): void
    dispatchEvent(event: unknown): void
    getApplicationSkinInfo(): unknown
  }
}
