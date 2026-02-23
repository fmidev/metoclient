declare module 'rrule/dist/es5/rrule' {
  export interface RRuleOptions {
    freq?: number;
    interval?: number;
    count?: number;
    dtstart?: Date;
    byhour?: number[] | null;
    byminute?: number[] | null;
    bysecond?: number[] | null;
    [key: string]: unknown;
  }

  /** Recurrence rule class. */
  class RRule {
    static YEARLY: number;
    static MONTHLY: number;
    static WEEKLY: number;
    static DAILY: number;
    static HOURLY: number;
    static MINUTELY: number;
    static SECONDLY: number;

    static fromText(text: string): RRule;

    constructor(options: RRuleOptions);
    options: RRuleOptions;
    all(): Date[];
  }

  export default RRule;
}
