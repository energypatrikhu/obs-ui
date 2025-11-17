export class Logger {
  private prefix: string = "";
  private enabled: boolean = true;

  constructor(prefix: string, enabled: boolean = true) {
    this.prefix = prefix;
    this.enabled = enabled;
  }

  public info(...message: Array<any>) {
    if (!this.enabled) return;
    console.log(`[${this.prefix}] [info]`, ...message);
  }

  public error(...message: Array<any>) {
    if (!this.enabled) return;
    console.error(`[${this.prefix}] [error]`, ...message);
  }

  public warn(...message: Array<any>) {
    if (!this.enabled) return;
    console.warn(`[${this.prefix}] [warning]`, ...message);
  }
}
