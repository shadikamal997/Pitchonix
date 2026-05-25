'use client';

import { AlertTriangle, AlertCircle, Info, XCircle } from 'lucide-react';

interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  title: string;
  description: string;
  affectedText?: string;
  suggestedFix: string;
}

interface IssuesDisplayProps {
  issues: Issue[];
}

export function IssuesDisplay({ issues }: IssuesDisplayProps) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-[#D96A6A]" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <Info className="w-5 h-5 text-[#4F7563]" />;
      default:
        return <Info className="w-5 h-5 text-[#9A9A9A]" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-[#FCF1F1] border-[#F7E3E3]';
      case 'high':
        return 'bg-[#FAEEDB] border-orange-200';
      case 'medium':
        return 'bg-[#FAEEDB] border-[#F2DCAE]';
      case 'low':
        return 'bg-[#EEF5F1] border-[#DDE8E1]';
      default:
        return 'bg-[#EDEBE6] border-[#E3E1DA]';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-[#F7E3E3] text-[#7a2929]';
      case 'high':
        return 'bg-[#F5E1B7] text-orange-800';
      case 'medium':
        return 'bg-[#F5E1B7] text-[#735008]';
      case 'low':
        return 'bg-[#DDE8E1] text-[#263F34]';
      default:
        return 'bg-[#F1F0EC] text-[#111111]';
    }
  };

  const groupedIssues = {
    critical: issues.filter((i) => i.severity === 'critical'),
    high: issues.filter((i) => i.severity === 'high'),
    medium: issues.filter((i) => i.severity === 'medium'),
    low: issues.filter((i) => i.severity === 'low'),
  };

  if (issues.length === 0) {
    return (
      <div className="bg-[#EEF5F1] border-2 border-[#DDE8E1] rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#DDE8E1] rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-[#4F7563]" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">No major issues detected!</h3>
            <p className="text-sm text-[#355846]">
              Your content looks good. You can still apply enhancements to improve it further.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#111111]">
          Issues Found ({issues.length})
        </h3>
        <div className="flex items-center gap-2">
          {groupedIssues.critical.length > 0 && (
            <span className="px-2 py-1 bg-[#F7E3E3] text-[#7a2929] text-xs font-medium rounded-full">
              {groupedIssues.critical.length} Critical
            </span>
          )}
          {groupedIssues.high.length > 0 && (
            <span className="px-2 py-1 bg-[#F5E1B7] text-orange-800 text-xs font-medium rounded-full">
              {groupedIssues.high.length} High
            </span>
          )}
          {groupedIssues.medium.length > 0 && (
            <span className="px-2 py-1 bg-[#F5E1B7] text-[#735008] text-xs font-medium rounded-full">
              {groupedIssues.medium.length} Medium
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {issues.map((issue, index) => (
          <div
            key={index}
            className={`border-2 rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(issue.severity)}</div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-[#111111]">{issue.title}</h4>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityBadgeColor(
                      issue.severity,
                    )}`}
                  >
                    {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-[#111111]">{issue.description}</p>
                {issue.affectedText && (
                  <div className="mt-2 p-2 bg-white rounded border border-[#E3E1DA]">
                    <p className="text-xs text-[#6B6B6B] mb-1">Affected text:</p>
                    <p className="text-sm text-[#111111] font-mono">{issue.affectedText}</p>
                  </div>
                )}
                <div className="mt-2 p-3 bg-white rounded-lg border border-[#E3E1DA]">
                  <p className="text-xs font-medium text-[#6B6B6B] mb-1">
                    💡 Suggested fix:
                  </p>
                  <p className="text-sm text-[#111111]">{issue.suggestedFix}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
