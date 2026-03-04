export class TimeServerService {
    private startTime: Date;
    private endTime: Date;

    start(): void {
        this.startTime = new Date();
        //console.log(`Start time: ${this.startTime}`);
    }

    end(): void {
        this.endTime = new Date();
        //console.log(`End time: ${this.endTime}`);
        this.calculateDuration();
    }

    calculateDuration(): number {
        const duration = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000); // Arredonda para baixo
        //console.log(`Duration in whole seconds: ${duration}`);
        return duration
    }
}
