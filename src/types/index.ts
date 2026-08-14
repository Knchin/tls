export type Country = "TN" | string;

export type AppointmentCriteria = {
  country: string;
  centre: string;
  visaCategory: string;
  earliestDate?: string;
  latestDate?: string;
};

export type AppointmentSlot = {
  date: string;
  time?: string;
};

export type AvailabilitySourceStatus = "AVAILABLE" | "NOT_AVAILABLE" | "TEMPORARY_ERROR";

export type AvailabilityResult = {
  available: boolean;
  checkedAt: string;
  slots?: AppointmentSlot[];
  sourceStatus: AvailabilitySourceStatus;
};

export type MonitoringStatus =
  | "ACTIVE"
  | "PAUSED"
  | "MATCH_FOUND"
  | "ERROR"
  | "DISABLED";

export type NotificationType = "APPOINTMENT_AVAILABLE" | "MONITORING_ERROR" | "SYSTEM";

export type NotificationChannel = "IN_APP" | "EMAIL" | "PUSH";

export type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "READ" | "DISMISSED";

export type ProviderName = "mock" | "official" | "manual";

export type CheckErrorCode =
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_UNAVAILABLE"
  | "RATE_LIMITED"
  | "NETWORK_TIMEOUT"
  | "AUTH_REQUIRED"
  | "INVALID_CRITERIA"
  | "INTERNAL_ERROR";

export type MonitoringRequestRecord = {
  id: string;
  user_id: string;
  country: string;
  destination: string;
  centre: string;
  visa_category: string;
  earliest_date: string | null;
  latest_date: string | null;
  status: MonitoringStatus;
  check_interval_minutes: number;
  last_checked_at: string | null;
  last_available_at: string | null;
  last_error_code: CheckErrorCode | null;
  created_at: string;
  updated_at: string;
};

export type AvailabilityCheckRecord = {
  id: string;
  monitoring_request_id: string;
  checked_at: string;
  status: AvailabilitySourceStatus;
  available: boolean;
  result_hash: string | null;
  error_code: CheckErrorCode | null;
  response_time_ms: number | null;
  created_at: string;
};

export type AppointmentSlotRecord = {
  id: string;
  availability_check_id: string;
  appointment_date: string;
  appointment_time: string | null;
  created_at: string;
};

export type NotificationRecord = {
  id: string;
  user_id: string;
  monitoring_request_id: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  status: NotificationStatus;
  sent_at: string | null;
  created_at: string;
  read_at: string | null;
};

export type NotificationPreferencesRecord = {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileRecord = {
  id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};

export type VisaCategory = {
  code: string;
  label: string;
  destination: string;
  enabled: boolean;
  sort_order: number;
};

export type Centre = {
  code: string;
  label: string;
  country: string;
  enabled: boolean;
  sort_order: number;
};

export type Destination = {
  code: string;
  label: string;
  enabled: boolean;
  sort_order: number;
};

export type MonitoringLimit = {
  maxActivePerUser: number;
  maxTotalPerUser: number;
  minCheckIntervalMinutes: number;
  maxCheckIntervalMinutes: number;
};
