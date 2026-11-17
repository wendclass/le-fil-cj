export type UserRole = "planner" | "member";
export type MeetingStatus = "planned" | "live" | "done" | "cancelled";
export type AgendaStatus = "proposed" | "validated" | "rejected";
export type DecisionStatus = "draft" | "published";
export type TaskStatus = "todo" | "doing" | "done";
export type PriorityStatus = "proposed" | "active" | "archived";
export type RsvpStatus = "yes" | "no" | "maybe";

export interface Poste {
  id: string;
  label: string;
  rank: number;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name: string | null;
  name_confirmed_at?: string | null;
  poste_id?: string | null;
  poste?: Poste | null;
  avatar_url: string | null;
  role: UserRole;
  phone?: string | null;
  points: number;
  streak: number;
  best_streak: number;
  push_prompted_at: string | null;
  created_at: string;
}

export interface Invitation {
  email: string;
  role: UserRole;
  first_name?: string | null;
  last_name?: string | null;
  poste_id?: string | null;
  poste?: Poste | null;
  invited_by: string | null;
  created_at: string;
  claimed_at: string | null;
}

export interface Priority {
  id: string;
  title: string;
  description: string | null;
  month: string; // YYYY-MM-01
  status: PriorityStatus;
  proposed_by: string | null;
  created_at: string;
  approvals_count?: number;
  total_planners?: number;
}

export interface PriorityApproval {
  priority_id: string;
  planner_id: string;
  approved_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  planned_minutes: number;
  location: string | null;
  status: MeetingStatus;
  started_at: string | null;
  ended_at: string | null;
  overrun: boolean;
  is_improvised: boolean;
  created_by: string | null;
  created_at: string;
  // relations
  agenda_items?: AgendaItem[];
  attendances?: Attendance[];
  decisions?: Decision[];
}

export interface AgendaItem {
  id: string;
  meeting_id: string;
  title: string;
  details: string | null;
  allotted_minutes: number;
  position: number;
  status: AgendaStatus;
  proposed_by: string | null;
  reject_reason: string | null;
  started_at: string | null;
  actual_seconds: number | null;
  created_at: string;
  proposer?: Profile;
}

export interface Attendance {
  meeting_id: string;
  user_id: string;
  rsvp: RsvpStatus | null;
  present: boolean;
  user?: Profile;
}

export interface Decision {
  id: string;
  meeting_id: string | null;
  agenda_item_id: string | null;
  text: string;
  status: DecisionStatus;
  published_at: string | null;
  validation_deadline: string | null;
  created_by: string | null;
  created_at: string;
  meeting?: Meeting;
  validations?: DecisionValidation[];
  validations_count?: number;
  tasks?: Task[];
}

export interface DecisionValidation {
  decision_id: string;
  user_id: string;
  validated_at: string;
  user?: Profile;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  decision_id: string | null;
  priority_id: string | null;
  assignee_id: string;
  due_date: string; // YYYY-MM-DD
  status: task_status_type;
  completed_at: string | null;
  completed_on_time: boolean | null;
  created_by: string | null;
  created_at: string;
  assignee?: Profile;
  decision?: Decision;
}

export type task_status_type = "todo" | "doing" | "done";

export interface ReadReceipt {
  user_id: string;
  entity_type: "task" | "decision" | "meeting";
  entity_id: string;
  first_read_at: string;
  user?: Profile;
}

export interface AppNotification {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
  read_at: string | null;
}

export interface PointsLog {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  ref_id: string | null;
  created_at: string;
}

export type BadgeKey =
  | "first_task"
  | "five_on_time"
  | "series_ten"
  | "assiduous_reader"
  | "club_voice"
  | "always_there";

export interface UserBadge {
  user_id: string;
  badge_key: BadgeKey;
  earned_at: string;
}

export interface IndicatorMetric {
  key: string;
  label: string;
  current_value: number;
  previous_value: number;
  unit: string;
  trend: "up" | "down" | "flat";
  history: { month: string; value: number }[];
  target: number;
  explanation: string;
}

export interface ClubMetricsResponse {
  period: "month" | "quarter" | "year";
  the_one_thing: IndicatorMetric;
  tasks_on_time: IndicatorMetric;
  decisions_validated: IndicatorMetric;
  meetings_45_min: IndicatorMetric;
  attendance_rate: IndicatorMetric;
}

