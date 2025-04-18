class Config {
  private static instance: Config
  private arkApiKey: string | undefined
  private endpointId: string | undefined

  private constructor() {}

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config()
    }
    return Config.instance
  }

  public setArkApiKey(key: string): void {
    this.arkApiKey = key
  }

  public setEndpointId(id: string): void {
    this.endpointId = id
  }

  public getArkApiKey(): string | undefined {
    return this.arkApiKey
  }

  public getEndpointId(): string | undefined {
    return this.endpointId
  }
}

export default Config.getInstance() 