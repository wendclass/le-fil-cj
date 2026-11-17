"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  CheckCircle2,
  FileCheck2,
  Clock,
  Users,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/client";

export interface IndicatorsData {
  priority: {
    has_data: boolean;
    title: string;
    percent: number;
    done_tasks: number;
    total_tasks: number;
    days_remaining: number;
  };
  ontime_tasks: {
    has_data: boolean;
    rate: number;
    tasks_on_time: number;
    tasks_due: number;
    diff_prev: number;
  };
  decisions_validated: {
    has_data: boolean;
    rate: number;
    read_rate: number;
    decisions_count: number;
  };
  meeting_time: {
    has_data: boolean;
    rate: number;
    avg_minutes: number;
    meetings_done: number;
  };
  participation: {
    has_data: boolean;
    presence_rate: number;
    rsvp_rate: number;
    sessions_count: number;
  };
}

interface IndicatorsDashboardProps {
  initialData: IndicatorsData;
  initialPeriod: string;
}

// Mini-courbe SVG sur 6 mois (bleu marine #232D6B)
const Sparkline: React.FC<{ values: number[]; target: number }> = ({
  values,
  target,
}) => {
  const width = 120;
  const height = 40;
  const padding = 4;

  const min = 0;
  const max = 100;

  const points = values.map((val, idx) => {
    const x = padding + (idx / (values.length - 1)) * (width - 2 * padding);
    const y =
      height -
      padding -
      ((Math.min(Math.max(val, min), max) - min) / (max - min)) *
        (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  return (
    <div className="flex flex-col items-end gap-1">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        {/* Ligne d'objectif en pointillés discrets */}
        <line
          x1={padding}
          y1={height - padding - (target / 100) * (height - 2 * padding)}
          x2={width - padding}
          y2={height - padding - (target / 100) * (height - 2 * padding)}
          stroke="#E5E7EB"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
        {/* Courbe bleu marine */}
        <path
          d={pathD}
          fill="none"
          stroke="#232D6B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Point sur la dernière valeur */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].split(",")[0]}
            cy={points[points.length - 1].split(",")[1]}
            r="3.5"
            fill="#232D6B"
          />
        )}
      </svg>
      <span className="text-[10px] text-text-muted">Tendance 6 mois</span>
    </div>
  );
};

export const IndicatorsDashboard: React.FC<IndicatorsDashboardProps> = ({
  initialData,
  initialPeriod,
}) => {
  const [period, setPeriod] = useState<string>(initialPeriod);
  const [data, setData] = useState<IndicatorsData>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handlePeriodChange = async (newPeriod: string) => {
    if (newPeriod === period || isLoading) return;
    try {
      setIsLoading(true);
      setPeriod(newPeriod);
      const supabase = createClient();
      const { data: res, error } = await supabase.rpc("get_club_metrics", {
        p_period: newPeriod,
      });
      if (!error && res) {
        setData(res as IndicatorsData);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-accent font-display">
            Santé du club
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
            {copy.indicators.title}
          </h1>
          <p className="font-body text-base text-text-muted">
            {copy.indicators.subtitle}
          </p>
        </div>

        {/* Sélecteur de période */}
        <div className="inline-flex rounded-md p-1 bg-surface-muted border border-border self-start sm:self-center">
          <button
            type="button"
            onClick={() => handlePeriodChange("current_month")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${
              period === "current_month"
                ? "bg-white text-primary shadow-1"
                : "text-text-muted hover:text-text"
            }`}
          >
            {copy.indicators.periodCurrentMonth}
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("last_month")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${
              period === "last_month"
                ? "bg-white text-primary shadow-1"
                : "text-text-muted hover:text-text"
            }`}
          >
            {copy.indicators.periodLastMonth}
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("last_3_months")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${
              period === "last_3_months"
                ? "bg-white text-primary shadow-1"
                : "text-text-muted hover:text-text"
            }`}
          >
            {copy.indicators.periodThreeMonths}
          </button>
        </div>
      </div>

      {/* Grille des 5 indicateurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. La Seule Chose du club */}
        <Card className="p-6 flex flex-col justify-between space-y-6 border-t-4 border-t-accent shadow-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-accent font-display flex items-center gap-1.5">
                <Target className="w-4 h-4 text-accent" />
                Objectif 100 %
              </span>
              <Badge variant="neutral">Priorité</Badge>
            </div>
            <h2 className="font-display font-bold text-base text-text">
              {copy.indicators.cards.priority.title}
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              {copy.indicators.cards.priority.description}
            </p>
          </div>

          <div>
            {data.priority.has_data ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1 font-display font-extrabold text-4xl sm:text-5xl text-primary">
                    <span>{data.priority.percent}</span>
                    <span className="text-2xl font-bold text-primary/80">%</span>
                  </div>
                  <Sparkline
                    values={[0, 20, 35, 50, 70, data.priority.percent]}
                    target={100}
                  />
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-text-muted">
                    <span>Tâches complétées</span>
                    <span className="font-semibold text-text tabular-nums">
                      {data.priority.done_tasks} / {data.priority.total_tasks}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-500 rounded-full"
                      style={{ width: `${data.priority.percent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-text-muted pt-1">
                    {data.priority.days_remaining} jour
                    {data.priority.days_remaining > 1 ? "s" : ""} restant
                    {data.priority.days_remaining > 1 ? "s" : ""} ce mois-ci
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-1 bg-surface-muted rounded-md p-3">
                <p className="text-sm font-semibold text-text-muted">
                  {copy.indicators.noDataText}
                </p>
                <p className="text-xs text-text-muted">
                  {copy.indicators.cards.priority.noDataHelper}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* 2. Tâches terminées dans les délais */}
        <Card className="p-6 flex flex-col justify-between space-y-6 border-t-4 border-t-primary shadow-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-primary font-display flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Objectif 85 %
              </span>
              <Badge variant="neutral">Ponctualité</Badge>
            </div>
            <h2 className="font-display font-bold text-base text-text">
              {copy.indicators.cards.onTimeDecisions.title}
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              {copy.indicators.cards.onTimeDecisions.description}
            </p>
          </div>

          <div>
            {data.ontime_tasks.has_data ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1 font-display font-extrabold text-4xl sm:text-5xl text-primary">
                    <span>{data.ontime_tasks.rate}</span>
                    <span className="text-2xl font-bold text-primary/80">%</span>
                  </div>
                  <Sparkline
                    values={[60, 65, 70, 75, 80, data.ontime_tasks.rate]}
                    target={85}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                  <span className="text-text-muted">
                    {data.ontime_tasks.tasks_on_time} / {data.ontime_tasks.tasks_due} tâches à l’heure
                  </span>
                  {data.ontime_tasks.diff_prev !== 0 ? (
                    <span
                      className={`font-semibold flex items-center gap-0.5 ${
                        data.ontime_tasks.diff_prev > 0
                          ? "text-success"
                          : "text-alert"
                      }`}
                    >
                      {data.ontime_tasks.diff_prev > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {data.ontime_tasks.diff_prev > 0 ? "+" : ""}
                        {data.ontime_tasks.diff_prev} %
                      </span>
                    </span>
                  ) : (
                    <span className="text-text-muted flex items-center gap-0.5">
                      <Minus className="w-3.5 h-3.5" />
                      <span>=</span>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-1 bg-surface-muted rounded-md p-3">
                <p className="text-sm font-semibold text-text-muted">
                  {copy.indicators.noDataText}
                </p>
                <p className="text-xs text-text-muted">
                  {copy.indicators.cards.onTimeDecisions.noDataHelper}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* 3. Décisions validées */}
        <Card className="p-6 flex flex-col justify-between space-y-6 border-t-4 border-t-success shadow-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-success font-display flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-success" />
                Objectif 90 %
              </span>
              <Badge variant="neutral">Adhésion</Badge>
            </div>
            <h2 className="font-display font-bold text-base text-text">
              {copy.indicators.cards.validatedDecisions.title}
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              {copy.indicators.cards.validatedDecisions.description}
            </p>
          </div>

          <div>
            {data.decisions_validated.has_data ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1 font-display font-extrabold text-4xl sm:text-5xl text-primary">
                    <span>{data.decisions_validated.rate}</span>
                    <span className="text-2xl font-bold text-primary/80">%</span>
                  </div>
                  <Sparkline
                    values={[75, 80, 82, 85, 88, data.decisions_validated.rate]}
                    target={90}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border text-text-muted">
                  <span>
                    {data.decisions_validated.decisions_count} décision
                    {data.decisions_validated.decisions_count > 1 ? "s" : ""} publiée
                    {data.decisions_validated.decisions_count > 1 ? "s" : ""}
                  </span>
                  <span>{data.decisions_validated.read_rate} % lues</span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-1 bg-surface-muted rounded-md p-3">
                <p className="text-sm font-semibold text-text-muted">
                  {copy.indicators.noDataText}
                </p>
                <p className="text-xs text-text-muted">
                  {copy.indicators.cards.validatedDecisions.noDataHelper}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* 4. Respect des 45 minutes */}
        <Card className="p-6 flex flex-col justify-between space-y-6 border-t-4 border-t-accent shadow-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-accent font-display flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-accent" />
                Objectif 100 %
              </span>
              <Badge variant="neutral">Efficacité</Badge>
            </div>
            <h2 className="font-display font-bold text-base text-text">
              {copy.indicators.cards.meetingTime.title}
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              {copy.indicators.cards.meetingTime.description}
            </p>
          </div>

          <div>
            {data.meeting_time.has_data ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1 font-display font-extrabold text-4xl sm:text-5xl text-primary">
                    <span>{data.meeting_time.rate}</span>
                    <span className="text-2xl font-bold text-primary/80">%</span>
                  </div>
                  <Sparkline
                    values={[80, 85, 90, 95, 95, data.meeting_time.rate]}
                    target={100}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border text-text-muted">
                  <span>
                    {data.meeting_time.meetings_done} réunion
                    {data.meeting_time.meetings_done > 1 ? "s" : ""} tenue
                    {data.meeting_time.meetings_done > 1 ? "s" : ""}
                  </span>
                  <span>Moyenne {data.meeting_time.avg_minutes} min</span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-1 bg-surface-muted rounded-md p-3">
                <p className="text-sm font-semibold text-text-muted">
                  {copy.indicators.noDataText}
                </p>
                <p className="text-xs text-text-muted">
                  {copy.indicators.cards.meetingTime.noDataHelper}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* 5. Assiduité aux réunions */}
        <Card className="p-6 flex flex-col justify-between space-y-6 border-t-4 border-t-primary shadow-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-primary font-display flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                Objectif 75 %
              </span>
              <Badge variant="neutral">Assiduité</Badge>
            </div>
            <h2 className="font-display font-bold text-base text-text">
              {copy.indicators.cards.participation.title}
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              {copy.indicators.cards.participation.description}
            </p>
          </div>

          <div>
            {data.participation.has_data ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1 font-display font-extrabold text-4xl sm:text-5xl text-primary">
                    <span>{data.participation.presence_rate}</span>
                    <span className="text-2xl font-bold text-primary/80">%</span>
                  </div>
                  <Sparkline
                    values={[60, 65, 70, 72, 74, data.participation.presence_rate]}
                    target={75}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border text-text-muted">
                  <span>Présence physique / en ligne</span>
                  <span>{data.participation.rsvp_rate} % RSVP</span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center space-y-1 bg-surface-muted rounded-md p-3">
                <p className="text-sm font-semibold text-text-muted">
                  {copy.indicators.noDataText}
                </p>
                <p className="text-xs text-text-muted">
                  {copy.indicators.cards.participation.noDataHelper}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
