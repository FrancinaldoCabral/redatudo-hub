export class SimpleLogger {
    info(message: string, ...args: any[]): void {
  //    console.log(`[INFO] ${message}`, ...args);
    }
  
    error(message: string, ...args: any[]): void {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
  