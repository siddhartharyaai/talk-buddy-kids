// Health-aware usage timer utilities for Buddy AI
import { UsageRules, DailyTelemetry } from '../components/BuddyApp';

// Get current date in YYYY-MM-DD format for the user's timezone
export const getCurrentDateString = (timezone: string): string => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: timezone 
  }).format(now);
};

// Get current time in HH:MM format for the user's timezone
export const getCurrentTimeString = (timezone: string): string => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);
};

// Initialize daily telemetry for a new day
export const initializeDailyTelemetry = (timezone: string): DailyTelemetry => {
  return {
    date: getCurrentDateString(timezone),
    secondsSpoken: 0,
    sessionsCount: 0,
    lastBreakTime: 0,
    lastUsageCheck: Date.now()
  };
};

// Check if telemetry needs to be reset for new day
export const shouldResetTelemetry = (telemetry: DailyTelemetry, timezone: string): boolean => {
  const currentDate = getCurrentDateString(timezone);
  return telemetry.date !== currentDate;
};

// Calculate minutes used today
export const minsUsedToday = (telemetry: DailyTelemetry, timezone: string): number => {
  if (shouldResetTelemetry(telemetry, timezone)) {
    return 0;
  }
  return Math.round(telemetry.secondsSpoken / 60);
};

// Check if user should take a break
export const shouldBreak = (
  telemetry: DailyTelemetry, 
  usageRules: UsageRules, 
  timezone: string
): boolean => {
  const currentTime = Date.now();
  const timeSinceLastBreak = currentTime - telemetry.lastBreakTime;
  const breakIntervalMs = usageRules.breakIntervalMin * 60 * 1000;
  
  // If it's a new day, reset break timer
  if (shouldResetTelemetry(telemetry, timezone)) {
    return false;
  }
  
  // Check if break interval has passed
  return timeSinceLastBreak >= breakIntervalMs && telemetry.secondsSpoken > 0;
};

// Check if it's currently bedtime
export const isBedtime = (usageRules: UsageRules): boolean => {
  const currentTime = getCurrentTimeString(usageRules.timezone);
  const { bedtimeStart, bedtimeEnd } = usageRules;
  
  // Convert HH:MM to minutes for comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const currentMinutes = timeToMinutes(currentTime);
  const startMinutes = timeToMinutes(bedtimeStart);
  const endMinutes = timeToMinutes(bedtimeEnd);
  
  // Handle overnight bedtime (e.g., 21:00 to 06:30)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
  
  // Handle same-day bedtime (e.g., 13:00 to 15:00)
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

// Check if daily limit has been exceeded
export const hasExceededDailyLimit = (
  telemetry: DailyTelemetry, 
  usageRules: UsageRules, 
  timezone: string
): boolean => {
  const minutesUsed = minsUsedToday(telemetry, timezone);
  return minutesUsed >= usageRules.dailyLimitMin;
};

// Update telemetry with new speech duration
export const updateTelemetry = (
  telemetry: DailyTelemetry,
  secondsToAdd: number,
  timezone: string
): DailyTelemetry => {
  // Reset if new day
  if (shouldResetTelemetry(telemetry, timezone)) {
    return {
      ...initializeDailyTelemetry(timezone),
      secondsSpoken: secondsToAdd,
      lastUsageCheck: Date.now()
    };
  }
  
  // Update existing telemetry
  return {
    ...telemetry,
    secondsSpoken: telemetry.secondsSpoken + secondsToAdd,
    lastUsageCheck: Date.now()
  };
};

// Mark break time
export const markBreakTime = (telemetry: DailyTelemetry): DailyTelemetry => {
  return {
    ...telemetry,
    lastBreakTime: Date.now()
  };
};

// Get default timezone from browser
export const getDefaultTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }

};

// Step G: Timezone greeting helper
export const getDayPart = (timezone: string): string => {
  const currentTime = getCurrentTimeString(timezone);
  const hour = parseInt(currentTime.split(':')[0]);
  
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
};

// Health check messages
export const getBreakMessage = (childName: string): string => {
  const messages = [
    `${childName}, let's take a quick break! 🧘‍♀️ Try some stretches or blink your eyes a few times!`,
    `Time for a little break, ${childName}! 🤸‍♂️ Maybe walk around or get some water!`,
    `Break time, ${childName}! 💪 Let's do some jumping jacks or deep breathing together!`
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

export const getDailyLimitMessage = (childName: string): string => {
  return `That's enough fun for today, ${childName}! 🌟 You've used up your daily time with Buddy. Come back tomorrow for more adventures!`;
};

export const getBedtimeMessage = (childName: string): string => {
  const messages = [
    `It's bedtime, ${childName}! 🌙 Let me tell you a quick goodnight story... Once upon a time, a little star went to sleep and had the most wonderful dreams. Sweet dreams! 💤`,
    `Time for sleep, ${childName}! 🌟 Close your eyes and imagine floating on a soft cloud... Goodnight! 💤`,
    `Bedtime, ${childName}! 🌛 Dream of magical adventures and wake up ready for tomorrow! Sweet dreams! 💤`
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};