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
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">No major issues detected!</h3>
            <p className="text-sm text-green-700">
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
        <h3 className="text-lg font-semibold text-gray-900">
          Issues Found ({issues.length})
        </h3>
        <div className="flex items-center gap-2">
          {groupedIssues.critical.length > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
              {groupedIssues.critical.length} Critical
            </span>
          )}
          {groupedIssues.high.length > 0 && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
              {groupedIssues.high.length} High
            </span>
          )}
          {groupedIssues.medium.length > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
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
                  <h4 className="font-semibold text-gray-900">{issue.title}</h4>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityBadgeColor(
                      issue.severity,
                    )}`}
                  >
                    {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{issue.description}</p>
                {issue.affectedText && (
                  <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Affected text:</p>
                    <p className="text-sm text-gray-900 font-mono">{issue.affectedText}</p>
                  </div>
                )}
                <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    💡 Suggested fix:
                  </p>
                  <p className="text-sm text-gray-900">{issue.suggestedFix}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
