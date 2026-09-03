/**
 * src/types/dashboard.ts
 * DASH-01 — Dashboard Summary Endpoint Types
 * masjids.io · Ummah Web Services
 */

export interface DashboardData {
  community:       CommunityStats;
  revenue:         RevenueStats;
  staff:           StaffStats;
  governance:      GovernanceStats;
  campaigns:       CampaignItem[];
  financial_chart: FinancialChart;
  donation_stats:  DonationStats;
}

export interface CommunityStats {
  total_members:       number;
  verified_households: number;
  growth_pct:          number;
}

export interface RevenueStats {
  total_raised:    number;
  total_goal:      number;
  progress_pct:    number;
  currency:        string;
  days_remaining:  number | null;
}

export interface StaffStats {
  total_staff:  number;
  active_today: number;
}

export interface GovernanceStats {
  has_active_election:   boolean;
  active_election_id:    string | null;
  active_election_label: string | null;
  ballots_cast:          number;
  participation_pct:     number;
}

export interface CampaignItem {
  id:            string;
  title:         string;
  progress_pct:  number;
  raised_amount: number;
  goal_amount:   number;
  currency:      string;
  status:        "active" | "closed" | "paused";
}

export interface FinancialChart {
  period: "day" | "week" | "month";
  bars:   ChartBar[];
}

export interface ChartBar {
  label:  string;
  amount: number;
}

export interface DonationStats {
  average_donation:   number;
  recurring_donors:   number;
  refunds_requested:  number;
  currency:           string;
}

export interface DashboardSummaryResponse {
  success: boolean;
  message: string;
  data:    DashboardData;
}