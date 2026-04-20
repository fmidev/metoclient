/**
 * Mock RRule for Jest tests.
 * Provides a simplified implementation of RRule for testing.
 */

const RRule: any = {
  YEARLY: 0,
  MONTHLY: 1,
  WEEKLY: 2,
  DAILY: 3,
  HOURLY: 4,
  MINUTELY: 5,
  SECONDLY: 6,

  fromText: jest.fn((text: string) => {
    // Simple mock implementation
    return {
      options: {
        freq: RRule.HOURLY,
        interval: 1,
        count: 10,
        dtstart: new Date('2024-01-01T00:00:00Z'),
        byhour: null,
        byminute: null,
        bysecond: null,
      },
      all: jest.fn(() => {
        const dates: Date[] = [];
        const start = new Date('2024-01-01T00:00:00Z');
        for (let i = 0; i < 10; i++) {
          const date = new Date(start);
          date.setHours(date.getHours() + i);
          dates.push(date);
        }
        return dates;
      }),
    };
  }),
};

// Constructor function
function RRuleConstructor(this: any, options: any) {
  this.options = options;
  this.all = () => {
    const dates: Date[] = [];
    const start = options.dtstart || new Date('2024-01-01T00:00:00Z');
    const count = options.count || 10;
    for (let i = 0; i < count; i++) {
      const date = new Date(start);
      date.setHours(date.getHours() + i);
      dates.push(date);
    }
    return dates;
  };
}

// Add static properties to constructor
Object.assign(RRuleConstructor, RRule);
(RRuleConstructor as any).fromText = RRule.fromText;

module.exports = RRuleConstructor;
module.exports.default = RRuleConstructor;
module.exports.RRule = RRuleConstructor;
