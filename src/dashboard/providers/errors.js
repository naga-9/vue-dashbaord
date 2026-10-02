// Errors thrown by data providers (contracts.md → Data provider → Errors).
// code: "conflict" | "not_found" | "forbidden" | anything else for network/server errors.
export class ProviderError extends Error {
  constructor(code, message, extra = {}) {
    super(message)
    this.name = 'ProviderError'
    this.code = code
    Object.assign(this, extra)
  }
}
